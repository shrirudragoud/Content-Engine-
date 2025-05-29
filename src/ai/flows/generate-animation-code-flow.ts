
'use server';
/**
 * @fileOverview A Genkit flow to generate HTML/CSS/JS animation code for an academic module.
 *
 * - generateAnimationCode - Generates animation code using a provided image, concept, title, and keywords.
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
  animationConcept: z.string().describe('A description of the concept the animation should visually represent, which will also serve as informational text.'),
  suggestedKeywords: z.array(z.string()).describe('Keywords to guide the animation style (e.g., "slide-in", "reveal", "educational").'),
  moduleTitle: z.string().describe('The title of the module, for context and display.')
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
  prompt: `You are an expert web developer creating visually appealing, animated educational content.
Your task is to generate a single, self-contained HTML file for an animated module slide.

Module Title: {{{moduleTitle}}}
Informational Text (derived from animationConcept): {{{animationConcept}}}
Suggested Keywords for Animation Style: {{#each suggestedKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Image to use (placeholder, will be inserted later): ${IMAGE_PLACEHOLDER_SRC}

**Requirements for the HTML Output:**

1.  **Layout:**
    *   Create a two-column layout for the main content area. One column (e.g., 40-50% width) for the image, the other for informational text.
    *   The informational text column should display:
        *   The \`{{{moduleTitle}}}\` as a prominent heading (e.g., \`<h2>\`).
        *   The \`{{{animationConcept}}}\` as paragraph text (e.g., \`<p>\`).
    *   Ensure the layout is reasonably responsive. The columns should stack on smaller screens.

2.  **Animation:**
    *   Implement a "slide-in" or "fade-in with upward movement" animation for the main content container or its columns when the page loads.
    *   The animation should be smooth and engaging. Prefer CSS animations/transitions.

3.  **Styling (CSS within \`<style>\` tags):**
    *   Use a modern and clean aesthetic.
    *   Apply a pleasant color scheme. Example: Page background: light gray (\`#f0f4f8\`), content container background: white (\`#ffffff\`).
    *   Style the text:
        *   Heading (\`{{{moduleTitle}}}\`): Darker color (e.g., \`#333333\`), appropriate font size (e.g., 24px).
        *   Paragraph (\`{{{animationConcept}}}\`): Slightly lighter color (e.g., \`#555555\`), good font size (e.g., 16px), and line-height (e.g., 1.6).
    *   Use a common sans-serif font like Arial, Helvetica, or system-ui.
    *   The image (which will be \`src="${IMAGE_PLACEHOLDER_SRC}"\`) should be styled to fit its column (e.g., \`max-width: 100%; height: auto;\`) and have a subtle border-radius (e.g., \`border-radius: 8px;\`).
    *   The main content container should have some padding, a border-radius, and a subtle box-shadow.

4.  **Structure:**
    *   The HTML must be self-contained (CSS in \`<style>\`, JS in \`<script>\` if absolutely necessary for *simple* animation control, but prioritize CSS).
    *   **Crucially, the \`<img>\` tag's \`src\` attribute for the main module image MUST be exactly "${IMAGE_PLACEHOLDER_SRC}".**

5.  **Example Structure (Conceptual - adapt and improve):**
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Module: {{{moduleTitle}}}</title>
        <style>
            body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #f0f4f8; /* Light grayish-blue background */
                font-family: Arial, Helvetica, sans-serif;
            }
            .module-container {
                display: flex;
                flex-direction: row; /* Columns side-by-side */
                width: 90%;
                max-width: 900px;
                margin: auto;
                background-color: #ffffff; /* White background for content */
                border-radius: 12px;
                box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                overflow: hidden; /* Important for slide-in if children are animated */
                opacity: 0;
                transform: translateY(30px);
                animation: slideUpFadeIn 0.8s ease-out forwards;
            }
            @keyframes slideUpFadeIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .image-column {
                flex: 1 1 45%; /* Flex basis 45% */
                padding: 25px;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .image-column img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                object-fit: contain;
            }
            .text-column {
                flex: 1 1 55%; /* Flex basis 55% */
                padding: 25px;
                color: #333;
            }
            .text-column h2 {
                font-size: 26px;
                color: #2c3e50; /* Darker blue-gray for title */
                margin-top: 0;
                margin-bottom: 15px;
            }
            .text-column p {
                font-size: 16px;
                line-height: 1.7;
                color: #555555; /* Standard text color */
                margin-bottom: 0;
            }
            /* Responsive: Stack columns on smaller screens */
            @media (max-width: 768px) {
                .module-container {
                    flex-direction: column;
                    width: 95%;
                }
                .image-column, .text-column {
                    flex-basis: auto; /* Reset flex-basis */
                    padding: 20px;
                }
                .text-column h2 { font-size: 22px; }
                .text-column p { font-size: 15px; }
            }
        </style>
    </head>
    <body>
        <div class="module-container">
            <div class="image-column">
                <img src="${IMAGE_PLACEHOLDER_SRC}" alt="Visual for {{{moduleTitle}}}" />
            </div>
            <div class="text-column">
                <h2>{{{moduleTitle}}}</h2>
                <p>{{{animationConcept}}}</p>
            </div>
        </div>
        <script>
            // Minimal JS, if any. CSS animations preferred.
        </script>
    </body>
    </html>
    \`\`\`

Provide ONLY the HTML content as a string in the 'htmlContent' field.
Ensure the image \`src\` in your generated HTML is exactly "${IMAGE_PLACEHOLDER_SRC}".
Focus on a clean, modern, and educational "page slide" presentation with the image and text.
The \`{{{animationConcept}}}\` should be presented clearly as informational text.
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
    const finalHtmlContent = output.htmlContent.replace(new RegExp(RegExp.quote(`"${IMAGE_PLACEHOLDER_SRC}"`), 'g'), `"${input.imageDataUri}"`);
    
    return { htmlContent: finalHtmlContent };
  }
);

// Helper function to escape regex special characters
RegExp.quote = function(str: string) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};
