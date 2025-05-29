
# Content Engine Demo - Technical Explainer

This document provides a technical overview of the "Content Engine Demo" application, built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI functionalities.

## 1. Project Overview

The application demonstrates AI-powered content generation, featuring two main tools:

1.  **Gemini Image Alchemist**: Generates images from text prompts and can optionally remove their backgrounds.
2.  **AI Academic Module Creator**: Takes an academic topic from the user and generates a complete interactive learning module, including a title, illustrative image, animated HTML/CSS/JS content with tabs (Theory, Flashcards, Visual Demo), and an accompanying audio narration.

## 2. Technology Stack

*   **Frontend**:
    *   Next.js (App Router)
    *   React (Functional Components, Hooks)
    *   TypeScript
    *   ShadCN UI (Component Library)
    *   Tailwind CSS (Styling)
    *   Lucide React (Icons)
*   **Backend/AI Logic**:
    *   Genkit (AI framework for defining and running flows)
    *   Google AI Models (via `@genkit-ai/googleai` plugin, e.g., Gemini for text/image, TTS models)
*   **Development**:
    *   `next dev` for frontend development.
    *   `genkit start` for running Genkit flows locally.

## 3. Core Features & Implementation

### 3.1. Gemini Image Alchemist

*   **Entry Point**: `src/app/page.tsx`
*   **UI Component**: `src/components/image-generator-form.tsx`
    *   Handles user input for the image prompt.
    *   Provides a checkbox to request background removal.
    *   Displays the generated image(s).
    *   Handles image download with dynamic naming (prompt, dimensions, bg status, timestamp).
*   **AI Flows**:
    *   `src/ai/flows/generate-image-from-prompt.ts`:
        *   Input: `prompt` (string).
        *   Output: `imageDataUri` (string, base64 encoded image).
        *   Uses `googleai/gemini-2.0-flash-exp` model with `responseModalities: ['TEXT', 'IMAGE']`.
    *   `src/ai/flows/remove-image-background-flow.ts`:
        *   Input: `imageDataUri` (string).
        *   Output: `processedImageDataUri` (string, base64 encoded image with transparent background).
        *   Uses `googleai/gemini-2.0-flash-exp` model.
        *   Takes the input image and a text prompt instructing the model to remove the background and output a transparent PNG.
        *   Includes specific `safetySettings` to allow for more permissive image manipulation.

### 3.2. AI Academic Module Creator

*   **Entry Point**: `src/app/academic-module/page.tsx`
*   **UI Component**: `src/components/academic-module-creator.tsx`
    *   Manages the multi-step generation process.
    *   Handles user input for the academic topic.
    *   Displays progress through stages (Idea, Image, Code, Script, Synthesis) in a left panel.
    *   Previews the generated module (HTML content in an `iframe`) and plays the audio narration in a right panel.
    *   Uses React state and `useEffect` for managing asynchronous AI calls, loading states, and UI updates, including audio playback and error handling.
*   **AI Flows (Orchestrated in Sequence)**:
    1.  **`src/ai/flows/generate-module-content-idea-flow.ts`**:
        *   Input: `topic` (string).
        *   Output: `moduleTitle`, `imagePrompt`, `animationConcept`, `suggestedKeywords`.
        *   Prompts an AI to brainstorm a module title, a detailed image prompt (instructing **no text in the image**), a core animation concept, and relevant keywords.
    2.  **`src/ai/flows/generate-image-from-prompt.ts` (Reused)**:
        *   Input: `imagePrompt` (from the previous flow).
        *   Output: `imageDataUri` for the module.
    3.  **`src/ai/flows/generate-animation-code-flow.ts`**:
        *   Input: `imageDataUri`, `animationConcept`, `suggestedKeywords`, `moduleTitle`.
        *   Output: `htmlContent` (string, self-contained HTML with embedded CSS/JS).
        *   Prompts an AI to generate a complex, interactive HTML module with specific requirements:
            *   Tabbed layout (Theory, Flashcards, Visual Demo).
            *   The "Theory" tab must use a specific 5x5 grid CSS layout (image on left, text on right). The image is embedded using a placeholder `%%IMAGE_DATA_URI_PLACEHOLDER%%` which the flow replaces with the actual `imageDataUri`.
            *   Interactive flashcards (flip, shuffle) and a visual demo.
            *   Modern UI/UX styling guidelines.
    4.  **`src/ai/flows/generate-audio-script-flow.ts`**:
        *   Input: `moduleTitle`, `animationConcept`.
        *   Output: `audioScript` (string).
        *   Prompts an AI to write a concise narration script (approx. 100-150 words).
    5.  **`src/ai/flows/generate-speech-from-text-flow.ts`**:
        *   Input: `textToSpeak` (the `audioScript`).
        *   Output: `audioDataUri` (string, base64 encoded WAV audio).
        *   Uses `googleai/gemini-2.5-flash-preview-tts` model.
        *   Fetches the audio output from the model (which is often raw PCM data, e.g., `audio/l16`).
        *   **Crucially, this flow includes logic to convert raw PCM data to a WAV format by constructing a valid WAV header and prepending it to the PCM data before base64 encoding.** This ensures better browser compatibility for playback.

## 4. UI and Styling

*   **ShadCN UI**: Provides pre-built, accessible UI components (Buttons, Cards, Inputs, Toasts, Progress, etc.) which are located in `src/components/ui/`.
*   **Tailwind CSS**: Used for all custom styling and layout. Configuration is in `tailwind.config.ts`.
*   **Global Styles**: `src/app/globals.css` defines the base Tailwind layers and CSS variables for the application's theme (colors, radius, etc.), including specific HSL values for primary, accent, background, and foreground colors as per the project requirements.
*   **Layout**: The main layout is defined in `src/app/layout.tsx`, which includes a simple navigation header.
*   **Responsiveness**: Tailwind's utility classes are used to ensure responsiveness.
*   **Hydration Error Prevention**: Client-side rendering of components like `iframe` (in `AcademicModuleCreator`) is deferred using an `isClient` state managed by `useEffect` to avoid hydration mismatches.

## 5. Genkit AI Flows

*   **Location**: All Genkit flows are located in the `src/ai/flows/` directory.
*   **Initialization**: Genkit is initialized in `src/ai/genkit.ts`, configuring the `googleAI` plugin.
*   **Development Server**: `src/ai/dev.ts` imports all flows, allowing them to be run and tested with the Genkit developer UI (`genkit start`).
*   **Structure**:
    *   Each flow file typically starts with `'use server';`.
    *   Uses `zod` for defining input and output schemas (`<FlowName>InputSchema`, `<FlowName>OutputSchema`) and their corresponding TypeScript types.
    *   Defines an exported async wrapper function (e.g., `async function generateImage(input): Promise<Output>`) which is called by the frontend. This wrapper calls the internal Genkit flow.
    *   Uses `ai.defineFlow()` to create the main flow logic.
    *   Uses `ai.definePrompt()` for text-based interactions with LLMs, often utilizing Handlebars templating (`{{{variable}}}`) to inject dynamic data from the input schema into the prompt text.
*   **Image Handling**: Images are passed to and from flows as base64 encoded data URIs. For image generation prompts, the prompt text instructs the model on the desired style and content, including explicitly stating "no text in the image" where necessary.
*   **Error Handling**: Flows include basic error handling (e.g., checking if output is received) and throw errors that can be caught by the frontend UI.

## 6. Key Learnings & Considerations

*   **TTS Audio Format**: A significant challenge was handling the audio format from the TTS service. The `gemini-2.5-flash-preview-tts` model (via Genkit) often returns raw PCM audio (`audio/l16`). Direct browser playback of this format is unreliable. The solution implemented in `generate-speech-from-text-flow.ts` involves programmatically constructing a WAV header and prepending it to the PCM data, then base64 encoding the result as `data:audio/wav;base64,...`. This makes the audio playable in browsers.
*   **Complex AI Prompts**: Generating complex, multi-part HTML and JavaScript (like the tabbed academic module) in a single AI call is challenging. The quality and completeness of the output depend heavily on the clarity and detail of the prompt, and the capabilities of the underlying model.
*   **Asynchronous Operations**: The frontend heavily relies on `async/await` and React state management to handle the sequential and potentially long-running AI flow calls, providing feedback to the user via loading states and progress indicators.
*   **Data URIs for Images**: Using data URIs is effective for embedding generated images directly into HTML without needing to save and serve them as separate files, which simplifies the self-contained nature of the generated modules.

This technical explainer provides a high-level understanding of the "Content Engine Demo" application's architecture and core functionalities.
