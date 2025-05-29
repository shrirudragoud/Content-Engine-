
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

    // The error "models/tts-1 is not found for API version v1beta, or is not supported for generateContent"
    // suggests that the googleAI plugin might be incorrectly routing 'googleai/tts-1' 
    // to the generativelanguage.googleapis.com (Gemini) endpoint instead of the 
    // texttospeech.googleapis.com endpoint.
    // Adding common TTS config parameters below is a speculative attempt to provide more context
    // to the plugin, but may not resolve a fundamental routing issue.
    const {custom, model} = await ai.generate({
      model: ttsModel,
      prompt: input.textToSpeak, // For TTS models, the prompt is typically just the text to synthesize.
      config: {
        // Attempting to add standard TTS parameters.
        // These might be specific to the underlying Google Cloud TTS API.
        // The Genkit plugin would need to map these appropriately.
        // This is a speculative fix for the 404 routing error.
        customProcessingConfig: { // This is a hypothetical wrapper, actual structure depends on plugin
            ttsParams: { // Hypothetical nesting
                languageCode: "en-US", // BCP-47 language tag, e.g., "en-US"
                // voice: { name: "en-US-Standard-C" }, // Example voice name, often optional
                audioEncoding: "MP3" // Common output format
            }
        }
        // If the plugin expects a flatter structure, it might be:
        // languageCode: "en-US",
        // audioEncoding: "MP3",
        // voiceName: "en-US-Standard-C", // or similar key
      },
    });
    
    const audioBase64 = custom?.audioContent as string | undefined;

    if (audioBase64 && typeof audioBase64 === 'string') {
      // Google TTS via Genkit typically outputs MP3.
      return { audioDataUri: `data:audio/mpeg;base64,${audioBase64}` };
    } else {
      console.error('TTS generation response:', {custom, model});
      throw new Error('Text-to-speech generation failed to return valid audio data. Check model availability, API response, and plugin routing for TTS models.');
    }
  }
);

