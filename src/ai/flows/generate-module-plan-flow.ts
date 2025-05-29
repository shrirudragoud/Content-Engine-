
'use server';
/**
 * @fileOverview A Genkit flow to generate a multi-module learning plan for an academic topic.
 *
 * - generateModulePlan - A function that takes a topic and generates a plan of sub-modules.
 * - GenerateModulePlanInput - The input type for the generateModulePlan function.
 * - GenerateModulePlanOutput - The return type for the generateModulePlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateModulePlanInputSchema = z.object({
  topic: z.string().describe('The broad academic topic provided by the user (e.g., "Climate Change", "Quantum Physics").'),
});
export type GenerateModulePlanInput = z.infer<typeof GenerateModulePlanInputSchema>;

const PlannedModuleSchema = z.object({
  title: z.string().describe('A concise and engaging title for this specific sub-module.'),
  concept: z.string().describe('A brief 1-2 sentence concept explaining what this sub-module will cover. This will guide its content generation.'),
});
export type PlannedModule = z.infer<typeof PlannedModuleSchema>;

const GenerateModulePlanOutputSchema = z.object({
  overallTopic: z.string().describe('The original topic the plan is for.'),
  plannedModules: z.array(PlannedModuleSchema).describe('An array of 2-3 planned sub-modules, ordered logically.'),
});
export type GenerateModulePlanOutput = z.infer<typeof GenerateModulePlanOutputSchema>;

export async function generateModulePlan(input: GenerateModulePlanInput): Promise<GenerateModulePlanOutput> {
  return generateModulePlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateModulePlanPrompt',
  input: {schema: GenerateModulePlanInputSchema},
  output: {schema: GenerateModulePlanOutputSchema},
  prompt: `You are an expert instructional designer. Your task is to break down a broad academic topic into a logical sequence of 2 to 3 smaller, focused sub-modules that build upon each other to explain the overall topic effectively.

Given the user's topic: {{{topic}}}

Please generate the following:
1.  'overallTopic': Echo back the original topic.
2.  'plannedModules': An array of 2 to 3 sub-modules. For each sub-module:
    *   'title': A concise and engaging title. Make sure titles are distinct.
    *   'concept': A brief 1-2 sentence concept explaining what this specific sub-module will cover. This concept will be used to guide the content generation for this sub-module.

Example for topic "The Solar System":
overallTopic: "The Solar System"
plannedModules: [
  { title: "Introduction to the Sun and Inner Planets", concept: "Explore the Sun's role and the characteristics of Mercury, Venus, Earth, and Mars." },
  { title: "The Outer Planets and Beyond", concept: "Discover the gas giants Jupiter and Saturn, the ice giants Uranus and Neptune, and dwarf planets like Pluto." },
  { title: "Asteroids, Comets, and Meteors", concept: "Learn about the smaller celestial bodies that inhabit our solar system and their significance." }
]

Ensure the output is well-structured JSON matching the provided output schema. The number of planned modules should be between 2 and 3.
`,
});

const generateModulePlanFlow = ai.defineFlow(
  {
    name: 'generateModulePlanFlow',
    inputSchema: GenerateModulePlanInputSchema,
    outputSchema: GenerateModulePlanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.plannedModules || output.plannedModules.length === 0) {
      throw new Error('Failed to generate a valid module plan.');
    }
    // Ensure overallTopic is present, if not, use input topic
    return {
        overallTopic: output.overallTopic || input.topic,
        plannedModules: output.plannedModules,
    };
  }
);
