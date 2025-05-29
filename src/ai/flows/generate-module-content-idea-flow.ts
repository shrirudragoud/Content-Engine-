
'use server';
/**
 * @fileOverview A Genkit flow to generate academic module content ideas.
 *
 * - generateModuleContentIdea - A function that takes a user topic and generates a module title, image prompt, animation concept, and keywords.
 * - GenerateModuleContentIdeaInput - The input type for the generateModuleContentIdea function.
 * - GenerateModuleContentIdeaOutput - The return type for the generateModuleContentIdea function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateModuleContentIdeaInputSchema = z.object({
  topic: z.string().describe('The academic topic provided by the user (e.g., "photosynthesis", "Newton\'s laws of motion").'),
});
export type GenerateModuleContentIdeaInput = z.infer<typeof GenerateModuleContentIdeaInputSchema>;

const GenerateModuleContentIdeaOutputSchema = z.object({
  moduleTitle: z.string().describe('A concise and engaging title for the academic module.'),
  imagePrompt: z.string().describe('A descriptive prompt for an image generation model to create a vibrant and visually engaging illustration (not a simple icon) related to the module title. The image should be colorful, clear, and suitable for an educational context. Avoid requesting text in the image. For example, for \'The Water Cycle\', a prompt could be \'Stylized illustration of the water cycle showing evaporation from a lake, cloud formation, precipitation as rain over mountains, and water flowing back in a river, bright and clear educational style, flat design\'.'),
  animationConcept: z.string().describe('A brief explanation of the core concept the animation should visually represent using the generated image. This concept will also be used as informational text alongside the image.'),
  suggestedKeywords: z.array(z.string()).describe('A list of 2-3 keywords that could inspire the animation style or elements (e.g., "slide-in", "reveal", "informational", "educational").'),
});
export type GenerateModuleContentIdeaOutput = z.infer<typeof GenerateModuleContentIdeaOutputSchema>;

export async function generateModuleContentIdea(input: GenerateModuleContentIdeaInput): Promise<GenerateModuleContentIdeaOutput> {
  return generateModuleContentIdeaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateModuleContentIdeaPrompt',
  input: {schema: GenerateModuleContentIdeaInputSchema},
  output: {schema: GenerateModuleContentIdeaOutputSchema},
  prompt: `You are an AI assistant specialized in creating engaging academic module content.
Given the user's topic: {{{topic}}}

Please generate the following:
1.  A 'moduleTitle': A concise and captivating title for the module.
2.  An 'imagePrompt': A descriptive prompt for an image generation model to create a **vibrant and visually engaging illustration** (not a simple icon) related to the module title. The image should be **colorful, clear, and suitable for an educational context**. For example, for 'The Water Cycle', a prompt could be 'Stylized illustration of the water cycle showing evaporation from a lake, cloud formation, precipitation as rain over mountains, and water flowing back in a river, bright and clear educational style, flat design'. Ensure the prompt does not request any text to be part of the image itself.
3.  An 'animationConcept': A short (1-2 sentences) description of what a simple animation using this image should convey. This text will also be displayed alongside the image in the module. For example, for a module on photosynthesis, "This animation shows how a plant leaf absorbs sunlight and carbon dioxide to produce energy, releasing oxygen in the process."
4.  'suggestedKeywords': A list of 2-3 keywords that could inspire the animation style (e.g., "slide-in", "informational", "educational", "diagram").

Focus on clarity and engagement for the image and the animation concept.
`,
});

const generateModuleContentIdeaFlow = ai.defineFlow(
  {
    name: 'generateModuleContentIdeaFlow',
    inputSchema: GenerateModuleContentIdeaInputSchema,
    outputSchema: GenerateModuleContentIdeaOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate module content ideas.');
    }
    return output;
  }
);

