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
  imagePrompt: z.string().describe('A descriptive prompt for generating a simple, text-free image. The image should be iconic, suitable for code-based animation, and visually represent the core concept. Avoid requesting text in the image.'),
  animationConcept: z.string().describe('A brief explanation of the core concept the animation should visually represent using the generated image.'),
  suggestedKeywords: z.array(z.string()).describe('A few keywords that can guide the animation style or elements (e.g., "reveal", "growth", "transformation", "connection", "compare").'),
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
2.  An 'imagePrompt': A detailed prompt for an image generation model. This image should be simple, symbolic, contain NO TEXT, and be suitable for a basic code-based animation. It should visually represent the core of the topic. For example, for "photosynthesis", a good prompt might be "A single green leaf absorbing stylized sunlight rays, minimalist icon".
3.  An 'animationConcept': A short description of what a simple animation using this image should convey. For example, for the photosynthesis leaf, "Show sunlight rays moving towards and being absorbed by the leaf, then the leaf subtly glowing or pulsing."
4.  'suggestedKeywords': A list of 2-3 keywords that could inspire the animation style (e.g., "show absorption", "gradual change", "cycle").

Focus on clarity and simplicity for both the image and the animation concept.
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
