'use server';
/**
 * @fileOverview A Genkit flow to generate an audio narration script for an academic module.
 *
 * - generateAudioScript - A function that takes module details and generates a narration script.
 * - GenerateAudioScriptInput - The input type for the generateAudioScript function.
 * - GenerateAudioScriptOutput - The return type for the generateAudioScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAudioScriptInputSchema = z.object({
  moduleTitle: z.string().describe('The title of the academic module.'),
  animationConcept: z.string().describe('The core educational concept the module explains.'),
});
export type GenerateAudioScriptInput = z.infer<typeof GenerateAudioScriptInputSchema>;

const GenerateAudioScriptOutputSchema = z.object({
  audioScript: z.string().describe('The generated narration script for the audio track.'),
});
export type GenerateAudioScriptOutput = z.infer<typeof GenerateAudioScriptOutputSchema>;

export async function generateAudioScript(input: GenerateAudioScriptInput): Promise<GenerateAudioScriptOutput> {
  return generateAudioScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAudioScriptPrompt',
  input: {schema: GenerateAudioScriptInputSchema},
  output: {schema: GenerateAudioScriptOutputSchema},
  prompt: `You are an expert scriptwriter for educational audio narrations.
Your task is to create a concise and engaging audio script for an academic module.

Module Title: "{{{moduleTitle}}}"
Core Concept: "{{{animationConcept}}}"

The script should:
1. Briefly introduce the module and its topic, "{{{moduleTitle}}}".
2. Clearly explain the core concept: "{{{animationConcept}}}".
3. Be conversational and easy to understand.
4. Be suitable for a text-to-speech engine (use clear sentence structures and common vocabulary).
5. The entire script should be approximately 100-150 words long.
6. Focus on the information that would typically be in the "Theory" or introductory section of the module.

Output ONLY the narration script text. Do not include any other conversational text, prefixes like "Script:", or markdown formatting.
`,
});

const generateAudioScriptFlow = ai.defineFlow(
  {
    name: 'generateAudioScriptFlow',
    inputSchema: GenerateAudioScriptInputSchema,
    outputSchema: GenerateAudioScriptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.audioScript) {
      throw new Error('Failed to generate audio script.');
    }
    return output;
  }
);
