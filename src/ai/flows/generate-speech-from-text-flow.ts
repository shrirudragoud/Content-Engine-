
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
  audioDataUri: z.string().describe("The generated audio as a data URI. Aiming for web-friendly formats like 'data:audio/mpeg;base64,<encoded_data>' (MP3). If 'data:audio/l16;...' is returned, browser playback issues are likely."),
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
    const ttsModel = 'googleai/gemini-2.5-flash-preview-tts'; 

    console.log(`TTS Flow: Attempting to generate speech for text: "${input.textToSpeak.substring(0, 50)}..." with model ${ttsModel}, requesting MP3.`);

    const {media} = await ai.generate({
      model: ttsModel,
      prompt: [{text: input.textToSpeak}],
      config: {
            responseModalities: ['AUDIO'],
            speechConfig: { // For voice selection
               voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' }, 
               },
            },
            audioConfig: { // For output format settings - as a peer to speechConfig
               audioEncoding: 'MP3',
            }
      },
    });
    
    if (media && media.url) {
      console.log(`TTS Flow: Received media.url from AI: ${media.url}`);
      try {
        const response = await fetch(media.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio from ${media.url}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer); 

        const detectedContentTypeHeader = response.headers.get('Content-Type');
        // If MP3 is successfully generated, contentType should be 'audio/mpeg'
        let contentType = detectedContentTypeHeader || 'audio/mpeg'; // Default to mpeg if MP3 was requested and header is missing
        
        if (contentType.startsWith('audio/l16')) {
            console.warn(`TTS Flow: Detected Content-Type as "${contentType}" despite requesting MP3. This format (e.g., raw PCM L16) may have limited direct playback support in browsers. Consider checking browser compatibility if playback issues occur.`);
        } else if (contentType === 'audio/mpeg') {
            console.log(`TTS Flow: Successfully received 'audio/mpeg' (MP3) content type as requested.`);
        } else {
            console.log(`TTS Flow: Received Content-Type: "${contentType}" (from header: ${detectedContentTypeHeader || 'N/A'}). This might not be the MP3 format requested.`);
        }
        
        const base64Audio = buffer.toString('base64');
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

