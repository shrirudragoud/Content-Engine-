
'use server';
/**
 * @fileOverview A Genkit flow to generate an audio narration script for an academic module,
 * considering its place in a sequence of modules.
 *
 * - generateAudioScript - A function that takes module details and generates a narration script.
 * - GenerateAudioScriptInput - The input type for the generateAudioScript function.
 * - GenerateAudioScriptOutput - The return type for the generateAudioScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAudioScriptInputSchema = z.object({
  currentModuleTitle: z.string().describe('The title of the current academic sub-module.'),
  currentModuleConcept: z.string().describe('The core educational concept this current sub-module explains.'),
  overallTopic: z.string().describe('The broad academic topic the entire learning plan is about.'),
  moduleIndex: z.number().describe('The 0-based index of the current sub-module in the learning plan.'),
  totalModulesInPlan: z.number().describe('The total number of sub-modules in the learning plan.'),
  previousModuleConcept: z.string().optional().describe('The concept of the previous sub-module, if this is not the first one.'),
});
export type GenerateAudioScriptInput = z.infer<typeof GenerateAudioScriptInputSchema>;

const GenerateAudioScriptOutputSchema = z.object({
  audioScript: z.string().describe('The generated narration script for the audio track, tailored for the current module in the sequence.'),
});
export type GenerateAudioScriptOutput = z.infer<typeof GenerateAudioScriptOutputSchema>;

export async function generateAudioScript(input: GenerateAudioScriptInput): Promise<GenerateAudioScriptOutput> {
  return generateAudioScriptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAudioScriptPrompt',
  input: {schema: GenerateAudioScriptInputSchema},
  output: {schema: GenerateAudioScriptOutputSchema},
  prompt: `You are an expert scriptwriter for educational audio narrations, acting as a helpful study helper guiding a student through a multi-part learning module.
The overall topic is "{{overallTopic}}".
This is module {{moduleIndex_plus_1}} of {{totalModulesInPlan}}.

{{#ifCond moduleIndex '==' 0}}
  For this first module, titled "{{currentModuleTitle}}", provide a brief, engaging introduction to the overall topic of "{{overallTopic}}". Then, smoothly transition into providing a clear and informative explanation of the core concept for this specific module: "{{currentModuleConcept}}". Elaborate on the key details and information a student needs to understand it.
  Make it sound like the beginning of a learning journey.
{{else}}
  We just covered "{{previousModuleConcept}}". Now, in this module, "{{currentModuleTitle}}", we'll build on that. Provide a clear and informative explanation of this concept: "{{currentModuleConcept}}". Elaborate on the key details and information a student needs to understand it, connecting it to what we've learned.
  Make the transition smooth, as if continuing a lesson. Avoid re-introducing the overall topic unless it's natural for context.
{{/ifCond}}

The script should:
1. Be conversational and easy to understand.
2. Be suitable for a text-to-speech engine (use clear sentence structures and common vocabulary).
3. The entire script for THIS module segment should be approximately 100-150 words long.
4. Focus on thoroughly explaining the "{{currentModuleConcept}}" for the module titled "{{currentModuleTitle}}", providing key information and details necessary for understanding.

Output ONLY the narration script text for the current module. Do not include any other conversational text, prefixes like "Script:", or markdown formatting.
Your goal is to provide a continuous, helpful narration across the modules, not a series of disconnected introductions.
`,
  // Custom Handlebars helper for basic comparison
  customize: (prompt) => {
    prompt.handlebars.registerHelper('moduleIndex_plus_1', function (context) {
      return context.moduleIndex + 1;
    });
    prompt.handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
      switch (operator) {
        case '==':
          // @ts-ignore
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          // @ts-ignore
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          // @ts-ignore
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          // @ts-ignore
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          // @ts-ignore
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          // @ts-ignore
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          // @ts-ignore
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          // @ts-ignore
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
          // @ts-ignore
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
          // @ts-ignore
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
          // @ts-ignore
          return options.inverse(this);
      }
    });
  }
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
