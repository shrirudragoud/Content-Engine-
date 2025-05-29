
'use server';
/**
 * @fileOverview A Genkit flow to convert text into speech using a TTS model.
 * It fetches raw PCM audio and converts it to WAV format.
 *
 * - generateSpeechFromText - A function that takes text and returns an audio data URI in WAV format.
 * - GenerateSpeechFromTextInput - The input type for the generateSpeechFromText function.
 * - GenerateSpeechFromTextOutput - The return type for the generateSpeechFromText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSpeechFromTextInputSchema = z.object({
  textToSpeak: z.string().describe('The text content to be synthesized into speech.'),
});
export type GenerateSpeechFromTextInput = z.infer<typeof GenerateSpeechFromTextInputSchema>;

const GenerateSpeechFromTextOutputSchema = z.object({
  audioDataUri: z.string().describe("The generated audio as a data URI in WAV format. Expected format: 'data:audio/wav;base64,<encoded_data>'."),
});
export type GenerateSpeechFromTextOutput = z.infer<typeof GenerateSpeechFromTextOutputSchema>;

export async function generateSpeechFromText(input: GenerateSpeechFromTextInput): Promise<GenerateSpeechFromTextOutput> {
  return generateSpeechFromTextFlow(input);
}

// Helper function to create a WAV header
function getWavHeader(pcmDataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number): Buffer {
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const subChunk2Size = pcmDataLength;
    const chunkSize = 36 + subChunk2Size; // 4 (RIFF type) + 8 (ChunkSize) + 8 (fmt Hdr) + 16 (fmt data) + 8 (data Hdr) + subChunk2Size

    const buffer = Buffer.alloc(44);
    // RIFF identifier
    buffer.write('RIFF', 0);
    // RIFF chunk size (total file size - 8 bytes)
    buffer.writeUInt32LE(chunkSize, 4);
    // RIFF type
    buffer.write('WAVE', 8);
    // Format chunk identifier ("fmt ")
    buffer.write('fmt ', 12);
    // Format chunk length (16 for PCM)
    buffer.writeUInt32LE(16, 16);
    // Sample format (1 for PCM)
    buffer.writeUInt16LE(1, 20);
    // Channel count
    buffer.writeUInt16LE(numChannels, 22);
    // Sample rate
    buffer.writeUInt32LE(sampleRate, 24);
    // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
    buffer.writeUInt32LE(byteRate, 28);
    // Block align (NumChannels * BitsPerSample/8)
    buffer.writeUInt16LE(blockAlign, 32);
    // Bits per sample
    buffer.writeUInt16LE(bitsPerSample, 34);
    // Data chunk identifier ("data")
    buffer.write('data', 36);
    // Data chunk length (PCM data size)
    buffer.writeUInt32LE(subChunk2Size, 40);
    return buffer;
}

const generateSpeechFromTextFlow = ai.defineFlow(
  {
    name: 'generateSpeechFromTextFlow',
    inputSchema: GenerateSpeechFromTextInputSchema,
    outputSchema: GenerateSpeechFromTextOutputSchema,
  },
  async (input) => {
    const ttsModel = 'googleai/gemini-2.5-flash-preview-tts'; 

    console.log(`TTS Flow: Attempting to generate speech for text: "${input.textToSpeak.substring(0, 50)}..." with model ${ttsModel}.`);

    const {media} = await ai.generate({
      model: ttsModel,
      prompt: [{text: input.textToSpeak}],
      config: {
            responseModalities: ['AUDIO'], 
            speechConfig: { 
               voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }, 
               },
            },
      },
    });
    
    if (media && media.url) {
      console.log(`TTS Flow: Received media.url from AI (first 100 chars): ${media.url.substring(0,100)}...`);
      try {
        let pcmBuffer: Buffer;
        let sourceContentType = media.contentType || '';

        if (media.url.startsWith('data:')) {
            // If media.url is already a data URI (likely with raw PCM like audio/l16)
            console.log(`TTS Flow: media.url is a data URI. Content-Type from media object: ${sourceContentType}`);
            const parts = media.url.split(',');
            if (parts.length < 2) throw new Error('Invalid data URI format from media.url');
            const meta = parts[0];
            if (meta.includes('audio/l16') || meta.includes('audio/pcm')) { // Check if it's PCM
                 sourceContentType = meta.substring(meta.indexOf(':') + 1, meta.indexOf(';')) || 'audio/l16';
                 console.log(`TTS Flow: Detected PCM from data URI meta: ${sourceContentType}`);
            }
            pcmBuffer = Buffer.from(parts[1], 'base64');
        } else {
            // If media.url is an HTTP URL
            console.log(`TTS Flow: media.url is an HTTP URL. Fetching content...`);
            const response = await fetch(media.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch audio from ${media.url}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            pcmBuffer = Buffer.from(arrayBuffer);
            sourceContentType = response.headers.get('Content-Type') || 'audio/l16'; // Assume l16 if not specified
            console.log(`TTS Flow: Fetched audio. Content-Type from HTTP header: ${sourceContentType}`);
        }

        // At this point, pcmBuffer should contain the raw audio data.
        // The ffmpeg command implies: 16-bit signed LE PCM, 24kHz, 1 channel
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;

        console.log(`TTS Flow: Assuming PCM format: ${sampleRate}Hz, ${numChannels}ch, ${bitsPerSample}bit.`);
        console.log(`TTS Flow: PCM Buffer length: ${pcmBuffer.length} bytes.`);

        if (pcmBuffer.length === 0) {
            throw new Error('Received empty PCM audio buffer.');
        }

        const wavHeader = getWavHeader(pcmBuffer.length, sampleRate, numChannels, bitsPerSample);
        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
        
        const base64WavAudio = wavBuffer.toString('base64');
        const audioDataUri = `data:audio/wav;base64,${base64WavAudio}`;
        
        console.log(`TTS Flow: Constructed WAV audioDataUri (first 100 chars): ${audioDataUri.substring(0,100)}...`);
        return { audioDataUri };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error during audio processing.";
        console.error('TTS Flow: Error processing audio:', error);
        throw new Error(`Text-to-speech generation failed: Could not retrieve, process, or encode audio data. Details: ${errorMessage}`);
      }
    } else {
      console.error('TTS Flow: TTS generation response did not contain media or media.url:', {media});
      throw new Error('Text-to-speech generation failed. The AI model did not return valid audio data. Check model availability and plugin configuration.');
    }
  }
);
