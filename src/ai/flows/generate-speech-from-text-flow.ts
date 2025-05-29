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
    // Utilise a Google TTS model via the googleAI plugin.
    // The response structure for TTS with this plugin typically includes `custom.audioContent` (base64 string).
    const ttsModel = 'googleai/tts-1'; // Standard model for Google Text-to-Speech

    const {custom, model} = await ai.generate({
      model: ttsModel,
      prompt: input.textToSpeak, // For TTS models, the prompt is typically just the text to synthesize.
      config: {
        // Specific TTS configurations like voice, speaking rate can be added here if supported by the model and plugin
      },
      // It's important that the genkit.ts is configured correctly for the googleAI plugin
      // and that the API key has TTS capabilities enabled.
    });
    
    const audioBase64 = custom?.audioContent as string | undefined;

    if (audioBase64 && typeof audioBase64 === 'string') {
      // Gemini TTS typically outputs MP3.
      return { audioDataUri: `data:audio/mpeg;base64,${audioBase64}` };
    } else {
      console.error('TTS generation response:', {custom, model});
      throw new Error('Text-to-speech generation failed to return valid audio data. Check model availability and API response.');
    }
  }
);
