
'use server';
/**
 * @fileOverview A Genkit flow to generate HTML/CSS/JS animation code.
 *
 * - generateAnimationCode - Generates animation code using a provided image and concept.
 * - GenerateAnimationCodeInput - Input type for the flow.
 * - GenerateAnimationCodeOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnimationCodeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The image to be animated, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  animationConcept: z.string().describe('A description of the concept the animation should visually represent.'),
  suggestedKeywords: z.array(z.string()).describe('Keywords to guide the animation style (e.g., "reveal", "move left to right", "fade in").'),
  moduleTitle: z.string().describe('The title of the module, for context.')
});
export type GenerateAnimationCodeInput = z.infer<typeof GenerateAnimationCodeInputSchema>;

const GenerateAnimationCodeOutputSchema = z.object({
  htmlContent: z.string().describe('The complete HTML content, including embedded CSS (in <style> tags) and JavaScript (in <script> tags), for the animation. The provided image must be embedded as a base64 data URI in an <img> tag.'),
});
export type GenerateAnimationCodeOutput = z.infer<typeof GenerateAnimationCodeOutputSchema>;

export async function generateAnimationCode(input: GenerateAnimationCodeInput): Promise<GenerateAnimationCodeOutput> {
  return generateAnimationCodeFlow(input);
}

const IMAGE_PLACEHOLDER_SRC = "%%IMAGE_DATA_URI_PLACEHOLDER%%";

const prompt = ai.definePrompt({
  name: 'generateAnimationCodePrompt',
  input: {schema: GenerateAnimationCodeInputSchema},
  output: {schema: z.object({ htmlContent: z.string() }) }, // LLM outputs HTML with placeholder
  prompt: `You are an expert web developer tasked with creating a simple, self-contained HTML animation.

Module Title: {{{moduleTitle}}}
Animation Concept: {{{animationConcept}}}
Suggested Keywords for Animation: {{#each suggestedKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Image to use (for your reference, will be inserted later): {{media url=imageDataUri}}

Your task is to generate a single HTML file that includes:
1.  HTML structure.
2.  CSS within \`<style>\` tags for styling and animation. Prefer CSS animations/transitions.
3.  JavaScript within \`<script>\` tags if necessary for simple interactions or sequencing, but aim for CSS-first.
4.  **Crucially, the \`<img>\` tag's \`src\` attribute MUST be set to the exact string "${IMAGE_PLACEHOLDER_SRC}". This placeholder will be programmatically replaced with the actual image data URI later. Do not use any other value for the src of the main animated image.**

The animation should be:
-   Simple and clear, effectively illustrating the '{{{animationConcept}}}'.
-   Visually clean and modern.
-   Looping or easily restartable if it's a short sequence.
-   Responsive if possible, but prioritize simplicity. The image should be reasonably sized or allow CSS to control its size.
-   Self-contained: No external libraries or assets (except the image that will be inserted via the placeholder).

Provide ONLY the HTML content as a string in the 'htmlContent' field.

Example structure for the output:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Animation: {{{moduleTitle}}}</title>
    <style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
        .animation-container { width: 300px; height: 200px; border: 1px solid #ccc; overflow: hidden; position: relative; background-color: white; }
        /* Your CSS animations and styles here */
        img.animated-image { /* styles for the image */ }
    </style>
</head>
<body>
    <div class="animation-container">
        <img src="${IMAGE_PLACEHOLDER_SRC}" alt="Animated Content for {{{moduleTitle}}}" class="animated-image" />
        <!-- Other elements for animation if needed -->
    </div>
    <script>
        // Your JavaScript for animation control here (if any)
        // e.g., document.addEventListener('DOMContentLoaded', () => { /* animation logic */ });
    </script>
</body>
</html>
\`\`\`

Ensure the image \`src\` in your generated HTML is exactly "${IMAGE_PLACEHOLDER_SRC}".
Focus on making the animation visually represent the '{{{animationConcept}}}' using the '{{{suggestedKeywords}}}' as inspiration.
`,
});

const generateAnimationCodeFlow = ai.defineFlow(
  {
    name: 'generateAnimationCodeFlow',
    inputSchema: GenerateAnimationCodeInputSchema,
    outputSchema: GenerateAnimationCodeOutputSchema, // Final output schema
  },
  async (input) => {
    const {output} = await prompt(input); // LLM generates HTML with the placeholder

    if (!output || typeof output.htmlContent !== 'string') {
      throw new Error('Failed to generate animation code or htmlContent is missing.');
    }

    // Replace the placeholder with the actual image data URI
    // Using a regex with global flag in case the placeholder somehow appears multiple times.
    const finalHtmlContent = output.htmlContent.replace(new RegExp(`"${IMAGE_PLACEHOLDER_SRC}"`, 'g'), `"${input.imageDataUri}"`);
    
    return { htmlContent: finalHtmlContent };
  }
);

