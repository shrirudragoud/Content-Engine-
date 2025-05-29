
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
  imagePrompt: z.string().describe('A descriptive prompt for an image generation model to create a vibrant, clear, and visually engaging illustration (NOT a simple icon, and ABSOLUTELY NO TEXT or letters within the image itself) related to the module title. The image should be colorful and suitable for an educational context. For example, for \'The Water Cycle\', a prompt could be \'Stylized illustration of the water cycle showing evaporation from a lake, cloud formation, precipitation as rain over mountains, and water flowing back in a river, bright and clear educational style, flat design, no words or letters in the image\'.'),
  animationConcept: z.string().describe('A brief explanation of the core concept the animation/interactive module should visually represent and explain. This concept will also be used as informational text alongside the image and to guide the AI in generating the module content.'),
  suggestedKeywords: z.array(z.string()).describe('A list of 2-3 keywords that could inspire the interactive module style or elements (e.g., "interactive simulation", "visual explanation", "educational game", "concept map").'),
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
2.  An 'imagePrompt': A descriptive prompt for an image generation model. This prompt MUST instruct the model to create a **vibrant and visually engaging illustration** (not a simple icon). Crucially, the prompt must ensure there is **ABSOLUTELY NO TEXT, letters, or words rendered as part of the image itself**. The image should be colorful, clear, and suitable for an educational context. For example, for 'The Water Cycle', a good imagePrompt would be: 'Stylized illustration of the water cycle showing evaporation from a lake, cloud formation, precipitation as rain over mountains, and water flowing back in a river, bright and clear educational style, flat design, no words or letters in the image'.
3.  An 'animationConcept': A short (1-3 sentences) description of the core educational concept the interactive module should explain or demonstrate. This concept will guide the AI generating the interactive HTML content. For example, for a module on photosynthesis, "This interactive module explains how a plant leaf absorbs sunlight, water, and carbon dioxide to produce glucose (energy) and oxygen. It will feature a visual demonstration and interactive elements to explore the process."
4.  'suggestedKeywords': A list of 2-3 keywords relevant to the type of interactive module desired (e.g., "interactive simulation", "visual explanation", "educational game", "concept map", "timeline").

Focus on clarity, engagement, and ensuring the image prompt strictly forbids any text within the generated image.
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
