
'use server';
/**
 * @fileOverview A Genkit flow to convert text into speech using a TTS model.
 *
 * - generateSpeechFromText - A function that takes text and returns an audio data URI.
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
  audioDataUri: z.string().describe("The generated audio as a data URI. Common formats are 'data:audio/wav;base64,<encoded_data>' or 'data:audio/mpeg;base64,<encoded_data>'. May also be 'data:audio/l16;codec=pcm;rate=24000;base64,<encoded_data>', which has limited direct browser playback support."),
});
export type GenerateSpeechFromTextOutput = z.infer<typeof GenerateSpeechFromTextOutputSchema>;

export async function generateSpeechFromText(input: GenerateSpeechFromTextInput): Promise<GenerateSpeechFromTextOutput> {
  return generateSpeechFromTextFlow(input);
}

const generateSpeechFromTextFlow = ai.defineFlow(
  {
    name: 'generateSpeechFromTextFlow',
    inputSchema: GenerateSpeechFromTextInputSchema,
    outputSchema: GenerateSpeechFromTextOutputSchema,
  },
  async (input) => {
    // Using the newer TTS model and configuration based on the provided example
    const ttsModel = 'googleai/gemini-2.5-flash-preview-tts'; 

    const {media} = await ai.generate({
      model: ttsModel,
      prompt: [{text: input.textToSpeak}], // Adapted prompt structure
      config: {
            responseModalities: ['AUDIO'],
            speechConfig: { // Speech-specific configuration
               voiceConfig: {
                  // Example voice, can be parameterized if needed
                  prebuiltVoiceConfig: { voiceName: 'Kore' }, 
               },
            },
      },
    });
    
    if (media && media.url) {
      console.log(`TTS Flow: Received media.url: ${media.url}`);
      try {
        // Fetch the audio content from the URL
        const response = await fetch(media.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from ${media.url}: ${response.statusText}`);
        }

        // Get the audio content as an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer

        // Determine the content type
        const detectedContentTypeHeader = response.headers.get('Content-Type');
        let contentType = detectedContentTypeHeader || 'audio/wav'; // Default to wav if not provided
        
        if (contentType.startsWith('audio/l16')) {
            console.warn(`TTS Flow: Detected Content-Type as "${contentType}". This format (e.g., raw PCM L16) may have limited direct playback support in browsers. Consider checking browser compatibility for this MIME type if playback issues occur.`);
        }
        console.log(`TTS Flow: Determined Content-Type: ${contentType} (from header: ${detectedContentTypeHeader || 'N/A'}, default: audio/wav if null)`);
        
        // Base64 encode the audio buffer
        const base64Audio = buffer.toString('base64');

        // Construct the data URI
        const audioDataUri = `data:${contentType};base64,${base64Audio}`;
        console.log(`TTS Flow: Constructed audioDataUri (first 100 chars): ${audioDataUri.substring(0,100)}...`);


        return { audioDataUri };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error during audio processing.";
        console.error('TTS Flow: Error processing audio from URL:', error);
        throw new Error(`Text-to-speech generation failed: Could not retrieve or encode audio data. Details: ${errorMessage}`);
      }
    } else {
      console.error('TTS Flow: TTS generation response did not contain media.url:', {media});
      throw new Error('Text-to-speech generation failed. The AI model did not return valid audio data. Check model availability and plugin configuration.');
    }
  }
);

