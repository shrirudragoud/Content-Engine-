
'use server';
/**
 * @fileOverview A Genkit flow to generate complex, interactive HTML/CSS/JS educational modules.
 *
 * - generateAnimationCode - Generates interactive module code using a provided image, concept, title, and keywords.
 * - GenerateAnimationCodeInput - Input type for the flow.
 * - GenerateAnimationCodeOutput - Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAnimationCodeInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The main image for the module, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  animationConcept: z.string().describe('A description of the core educational concept the interactive module should explain or demonstrate. This will guide content generation for the tabs.'),
  suggestedKeywords: z.array(z.string()).describe('Keywords to guide the interactive module style (e.g., "simulation", "game", "interactive diagram").'),
  moduleTitle: z.string().describe('The title of the module, for context and display.')
});
export type GenerateAnimationCodeInput = z.infer<typeof GenerateAnimationCodeInputSchema>;

const GenerateAnimationCodeOutputSchema = z.object({
  htmlContent: z.string().describe('The complete, self-contained HTML content, including embedded CSS (in <style> tags) and JavaScript (in <script> tags), for the interactive educational module. The provided image must be embedded as a base64 data URI in an <img> tag using the specified placeholder.'),
});
export type GenerateAnimationCodeOutput = z.infer<typeof GenerateAnimationCodeOutputSchema>;

export async function generateAnimationCode(input: GenerateAnimationCodeInput): Promise<GenerateAnimationCodeOutput> {
  return generateAnimationCodeFlow(input);
}

const IMAGE_PLACEHOLDER_SRC = "%%IMAGE_DATA_URI_PLACEHOLDER%%";

// Helper function to escape string for use in a RegExp
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const prompt = ai.definePrompt({
  name: 'generateAnimationCodePrompt',
  input: {schema: GenerateAnimationCodeInputSchema},
  output: {schema: z.object({ htmlContent: z.string() }) }, // LLM outputs HTML with placeholder
  prompt: `You are an expert in educational technology and instructional design. Your primary task is to build a highly interactive, single-page educational module using HTML, CSS, and JavaScript. The module should be self-contained in a single HTML file.

**Module Context:**
Module Title: {{{moduleTitle}}}
Core Educational Concept: {{{animationConcept}}}
Suggested Keywords for Style/Interaction: {{#each suggestedKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

**Key Image Resource:**
You will be provided with a main image. In the HTML you generate, you MUST use the exact placeholder \`src="${IMAGE_PLACEHOLDER_SRC}"\` for this image's \`<img>\` tag. This placeholder will be automatically replaced with the actual image data URI.

**Core Requirements for the HTML Output:**

1.  **Single HTML File Structure:**
    *   All CSS must be within \`<style>\` tags in the \`<head>\`. Ensure CSS is well-organized.
    *   All JavaScript must be within \`<script>\` tags, preferably at the end of the \`<body>\`.
    *   The HTML should be well-structured with semantic tags (e.g., \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`).

2.  **Tabbed Layout (Mandatory):**
    *   Implement a clear tabbed navigation system.
    *   There must be exactly THREE tabs with the following titles and purposes:
        *   **"📚 Theory"**:
            *   **Content**: This tab serves as both the introduction and the main theory section. It should explain the core concepts related to \`{{{animationConcept}}}\`.
            *   **Layout**: For the content area of THIS TAB ONLY, you MUST use the following HTML grid structure and CSS.
                HTML Structure:
                \`\`\`html
                <div class="parent">
                    <div class="div4">
                        <!-- Place the module title ({{{moduleTitle}}}) here, e.g., as an <h1> -->
                    </div>
                    <div class="div2">
                        <!-- The main image (using src="${IMAGE_PLACEHOLDER_SRC}") MUST be placed here. Ensure it fills the container appropriately. Example: <img src="${IMAGE_PLACEHOLDER_SRC}" alt="Visual for {{{moduleTitle}}}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" /> -->
                    </div>
                    <div class="div3">
                        <!-- Place the introductory and theoretical text related to {{{animationConcept}}} here. Use paragraphs, lists, etc. for clarity. -->
                    </div>
                    <div class="div5">
                        <!-- This can be a footer or empty space within the theory tab's content area. -->
                    </div>
                </div>
                \`\`\`
                CSS (to be included in the main \`<style>\` tags):
                \`\`\`css
                .parent {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    grid-template-rows: repeat(5, 1fr);
                    gap: 8px; /* Or a suitable gap like 1em or 16px */
                    height: 100%; /* Ensure parent takes full height of tab content area if needed */
                    padding: 1em; /* Add some padding */
                    box-sizing: border-box;
                }
                .div2 { /* Image container */
                    grid-column: span 3 / span 3;
                    grid-row: span 3 / span 3;
                    grid-column-start: 1;
                    grid-row-start: 2;
                    display: flex; /* For centering image if needed */
                    align-items: center;
                    justify-content: center;
                    overflow: hidden; /* To contain image */
                }
                .div3 { /* Text container */
                    grid-column: span 2 / span 2;
                    grid-row: span 3 / span 3;
                    grid-column-start: 4;
                    grid-row-start: 2;
                    padding: 1em; /* Add padding for text */
                    overflow-y: auto; /* Allow scrolling for long text */
                    border-left: 1px solid #eee; /* Optional separator */
                }
                .div4 { /* Header/Title container */
                    grid-column: span 5 / span 5;
                    grid-column-start: 1;
                    grid-row-start: 1;
                    padding: 0.5em 1em;
                    text-align: center; /* Center title */
                }
                .div5 { /* Footer container */
                    grid-column: span 5 / span 5;
                    grid-row-start: 5;
                    padding: 0.5em 1em;
                    text-align: center; /* Optional footer content */
                }
                /* Ensure the image within div2 is responsive */
                .div2 img {
                  max-width: 100%;
                  max-height: 100%;
                  object-fit: contain; /* or 'cover' depending on desired effect */
                  border-radius: 8px;
                }
                \`\`\`
        *   **"🃏 Flashcards"**:
            *   **Content**: Interactive flashcards for at least 8 key terms/definitions related to the topic (\`{{{animationConcept}}}\`).
            *   **Functionality**: Cards MUST flip on click/tap to reveal the answer. Implement a "Shuffle" button that randomizes the order of the flashcards. Ensure the JavaScript for flipping and shuffling is fully functional.
            *   **Animation**: Smooth flip animations for the cards.
        *   **"📐 Visual Demo"**:
            *   **Content**: An interactive simulation, diagram, or activity to visually explain a key aspect of \`{{{animationConcept}}}\`. This is where the main provided image (\`src="${IMAGE_PLACEHOLDER_SRC}"\`) could be used again if relevant, or another visual described/generated.
            *   **Interactivity**: Use elements like sliders, buttons that trigger changes, or an interactive diagram. The interaction should be meaningful and related to the \`{{{suggestedKeywords}}}\`.
            *   If charting is essential and feasible, use a simple approach (e.g., CSS-based bar chart or very basic SVG). If using a library, it MUST be from CDNJS (e.g., a very lightweight chart library if absolutely needed, but prefer native solutions).

3.  **Design and UI/UX:**
    *   **Modern Aesthetic**: Aim for a clean, modern, and professional look. Consider using subtle gradients, perhaps a touch of glassmorphism on elements like cards or tab containers if it enhances clarity without clutter.
    *   **Color Palette**: Use a colorful, topic-appropriate, and accessible color scheme. Ensure good contrast.
    *   **Typography**: Use clear, legible sans-serif fonts (e.g., system-ui, Arial, Helvetica).
    *   **Micro-animations**: Implement subtle hover effects, smooth transitions for tab changes, and other small animations to enhance user experience.
    *   **Responsiveness**: The entire module MUST be mobile-friendly and adapt gracefully to different screen sizes. Use flexbox/grid for layout (outside the specific "Theory" tab grid).
    *   **Branding**: The \`{{{moduleTitle}}}\` should be prominently displayed.

4.  **Technical Requirements:**
    *   **JavaScript for Interactivity**: Implement all dynamic behaviors (tabs, flashcards, demo interactions) using vanilla JavaScript. Ensure this JavaScript is functional.
    *   **No localStorage/sessionStorage**: All state (e.g., flashcard order) must be managed within JavaScript variables/objects for the current session.
    *   **Performance**: Ensure smooth animations and fast load times. Optimize CSS and JS.
    *   **Error Handling**: While complex error handling isn't expected, ensure JavaScript interactions are robust (e.g., check for element existence before manipulating).
    *   **Code Comments**: Add brief comments in HTML, CSS, and JS to explain complex parts or sections.

**Output Format:**
Provide ONLY the complete HTML content as a string in the 'htmlContent' field.

**Example of how to use the image placeholder in the "Theory" tab's \`.div2\` (adapt as needed):**
\`<img src="${IMAGE_PLACEHOLDER_SRC}" alt="Visual representation for {{{moduleTitle}}}" style="max-width: 100%; height: auto; border-radius: 8px;" />\`

**Content Generation Guidance:**
*   Use the \`{{{moduleTitle}}}\` and \`{{{animationConcept}}}\` to generate plausible and relevant educational content for each tab.
*   The \`{{{suggestedKeywords}}}\` can inspire the type of interactivity in the "Visual Demo" tab.

Make sure the output is a single, complete, and functional HTML file. Prioritize creating a working, interactive, and well-designed educational module based on all the above requirements. Ensure the flashcards are fully interactive (flip and shuffle). The "Theory" tab MUST use the specified grid layout.
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
    const placeholderRegex = new RegExp(escapeRegExp(IMAGE_PLACEHOLDER_SRC), 'g');
    // Ensure the replacement is properly quoted if the placeholder was expected within quotes
    const finalHtmlContent = output.htmlContent.replace(placeholderRegex, input.imageDataUri);
    
    return { htmlContent: finalHtmlContent };
  }
);

