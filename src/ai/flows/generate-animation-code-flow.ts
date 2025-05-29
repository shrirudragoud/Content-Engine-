
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
You will be provided with a main image. In the HTML you generate, you MUST use the exact placeholder \`src="${IMAGE_PLACEHOLDER_SRC}"\` for this image's \`<img>\` tag. This placeholder will be automatically replaced with the actual image data URI. This image should be used meaningfully, perhaps in the introduction, the Visual Demo tab, or as a general branding element.

**Core Requirements for the HTML Output:**

1.  **Single HTML File Structure:**
    *   All CSS must be within \`<style>\` tags in the \`<head>\`.
    *   All JavaScript must be within \`<script>\` tags, preferably at the end of the \`<body>\`.
    *   The HTML should be well-structured with semantic tags (e.g., \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`).

2.  **Tabbed Layout (Mandatory):**
    *   Implement a clear tabbed navigation system.
    *   There must be exactly FIVE tabs with the following titles and purposes:
        *   **"Introduction"**: A brief overview of the module topic (\`{{{moduleTitle}}}\`) and what the user will learn. Could feature the main image.
        *   **"📚 Theory"**: Explanation of core concepts related to \`{{{animationConcept}}}\`. Use clear headings, paragraphs, and lists.
        *   **"🃏 Flashcards"**: Interactive flashcards for at least 8 key terms/definitions related to the topic.
            *   Functionality: Cards should flip on click/tap. Implement a "Shuffle" button.
            *   Animation: Smooth flip animations for the cards.
        *   **"📐 Visual Demo"**: An interactive simulation, diagram, or activity to visually explain a key aspect of \`{{{animationConcept}}}\`.
            *   Interactivity: If applicable, use elements like sliders, buttons that trigger changes, or an interactive diagram. This is where the main provided image (\`src="${IMAGE_PLACEHOLDER_SRC}"\`) could be central.
            *   If charting is essential and feasible, use a simple approach (e.g., CSS-based bar chart or very basic SVG). If using a library, it MUST be from CDNJS (e.g., a very lightweight chart library if absolutely needed, but prefer native solutions).
        *   **"📝 Quiz"**: A short multiple-choice quiz (4-5 questions) to test understanding.
            *   Functionality: Show feedback (correct/incorrect) after each question or at the end. Display a score.
        *   **"💡 Summary"**: Recap of key learning points.

3.  **Design and UI/UX:**
    *   **Modern Aesthetic**: Aim for a clean, modern, and professional look. Consider using subtle gradients, perhaps a touch of glassmorphism on elements like cards or tab containers if it enhances clarity without clutter.
    *   **Color Palette**: Use a colorful, topic-appropriate, and accessible color scheme. Ensure good contrast.
    *   **Typography**: Use clear, legible sans-serif fonts (e.g., system-ui, Arial, Helvetica).
    *   **Micro-animations**: Implement subtle hover effects, smooth transitions for tab changes, and other small animations to enhance user experience.
    *   **Responsiveness**: The entire module MUST be mobile-friendly and adapt gracefully to different screen sizes. Use flexbox/grid for layout.
    *   **Branding**: Display the \`{{{moduleTitle}}}\` prominently, perhaps in a header.

4.  **Technical Requirements:**
    *   **JavaScript for Interactivity**: Implement all dynamic behaviors (tabs, flashcards, quiz, demo interactions) using vanilla JavaScript.
    *   **No localStorage/sessionStorage**: All state (e.g., quiz scores, flashcard order) must be managed within JavaScript variables/objects for the current session.
    *   **Performance**: Ensure smooth animations and fast load times. Optimize CSS and JS.
    *   **Error Handling**: While complex error handling isn't expected, ensure JavaScript interactions are robust (e.g., check for element existence before manipulating).
    *   **Code Comments**: Add brief comments in HTML, CSS, and JS to explain complex parts or sections.

**Output Format:**
Provide ONLY the complete HTML content as a string in the 'htmlContent' field.

**Example of how to use the image placeholder (adapt as needed within your structure):**
\`<img src="${IMAGE_PLACEHOLDER_SRC}" alt="Visual representation for {{{moduleTitle}}}" style="max-width: 100%; height: auto; border-radius: 8px;" />\`

**Content Generation Guidance:**
*   Use the \`{{{moduleTitle}}}\` and \`{{{animationConcept}}}\` to generate plausible and relevant educational content for each tab.
*   The \`{{{suggestedKeywords}}}\` can inspire the type of interactivity in the "Visual Demo" tab.

Make sure the output is a single, complete, and functional HTML file. Prioritize creating a working, interactive, and well-designed educational module based on all the above requirements.
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
