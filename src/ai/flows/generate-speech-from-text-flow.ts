
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
  audioDataUri: z.string().describe('The generated audio as a data URI. Expected format: \'data:audio/mpeg;base64,<encoded_data>\'.'),
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
    const ttsModel = 'googleai/tts-1'; // Standard model for Google Text-to-Speech

    // The error "models/tts-1 is not found for API version v1beta, or is not supported for generateContent"
    // (previous error before attempting to add 'config') suggests that the googleAI plugin might be 
    // incorrectly routing 'googleai/tts-1' to the generativelanguage.googleapis.com (Gemini) endpoint 
    // instead of the texttospeech.googleapis.com endpoint.
    // Removing the 'config' block that caused a 400 error.
    const {custom, model} = await ai.generate({
      model: ttsModel,
      prompt: input.textToSpeak, // For TTS models, the prompt is typically just the text to synthesize.
      // The 'config' object was removed as it caused a "400 Bad Request" due to unrecognized fields
      // when the request was (incorrectly) routed to the Gemini API endpoint.
    });
    
    const audioBase64 = custom?.audioContent as string | undefined;

    if (audioBase64 && typeof audioBase64 === 'string') {
      // Google TTS via Genkit typically outputs MP3.
      return { audioDataUri: `data:audio/mpeg;base64,${audioBase64}` };
    } else {
      console.error('TTS generation response:', {custom, model});
      throw new Error('Text-to-speech generation failed. The AI model (tts-1) may not be correctly routed or configured for Text-to-Speech by the plugin, or it did not return valid audio data. Check model availability and plugin configuration.');
    }
  }
);

