
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { generateModuleContentIdea, type GenerateModuleContentIdeaOutput } from "@/ai/flows/generate-module-content-idea-flow";
import { generateImage, type GenerateImageOutput } from "@/ai/flows/generate-image-from-prompt";
import { generateAnimationCode, type GenerateAnimationCodeOutput } from "@/ai/flows/generate-animation-code-flow";
import { generateAudioScript, type GenerateAudioScriptInput, type GenerateAudioScriptOutput } from "@/ai/flows/generate-audio-script-flow";
import { generateSpeechFromText, type GenerateSpeechFromTextInput, type GenerateSpeechFromTextOutput } from "@/ai/flows/generate-speech-from-text-flow";

import { Code, Lightbulb, Image as ImageIconLucide, Film, CheckCircle, BookOpenText, Mic, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";

export function AcademicModuleCreator() {
  const [topic, setTopic] = useState<string>("");
  const [moduleIdea, setModuleIdea] = useState<GenerateModuleContentIdeaOutput | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GenerateImageOutput | null>(null);
  const [animationCode, setAnimationCode] = useState<GenerateAnimationCodeOutput | null>(null);
  const [audioScript, setAudioScript] = useState<GenerateAudioScriptOutput | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [ideaGenerated, setIdeaGenerated] = useState(false);
  const [imageGeneratedState, setImageGeneratedState] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [audioScriptGenerated, setAudioScriptGenerated] = useState(false);
  const [audioSynthesized, setAudioSynthesized] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!isClient || !audioElement) {
      return;
    }
    
    const handleAudioError = (event: Event) => {
      const targetAudioElement = event.target as HTMLAudioElement;
      const mediaError = targetAudioElement.error;
      const currentAudioSrc = targetAudioElement.currentSrc || targetAudioElement.src;
      
      let errorMessage = "Audio playback failed: Unknown error.";

      console.log("--- Audio Playback Error Details ---");
      console.log("Failed Audio Source (first 200 chars):", currentAudioSrc ? currentAudioSrc.substring(0, 200) + (currentAudioSrc.length > 200 ? "..." : "") : "N/A");
      
      if (currentAudioSrc && currentAudioSrc.startsWith("data:")) {
        console.log("Full Failed Audio Data URI (inspect in console):");
        console.log(currentAudioSrc); // Log the full data URI for inspection
      }

      if (mediaError) {
        // Create a plain object for more reliable logging of MediaError properties
        const mediaErrorDetails: Record<string, any> = { code: mediaError.code, message: mediaError.message };
        for (const key in mediaError) {
            // Avoid trying to serialize functions or complex objects that might not log well
            if (Object.prototype.hasOwnProperty.call(mediaError, key) && typeof (mediaError as any)[key] !== 'function') {
                mediaErrorDetails[key] = (mediaError as any)[key];
            }
        }
        console.log("MediaError Object Details:", mediaErrorDetails);

        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Audio playback was aborted by the user or system.";
            break;
          case mediaError.MEDIA_ERR_NETWORK:
            errorMessage = "A network error caused audio download to fail part-way.";
            break;
          case mediaError.MEDIA_ERR_DECODE:
            errorMessage = "Audio playback failed: The audio data could not be decoded. The file might be corrupted or the format, while recognized, is unparsable.";
            break;
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Audio playback failed: The audio format (e.g., codec or container) provided by the AI is not supported by your browser or the source URI is invalid. Please check the console for the audio data URI's MIME type and full MediaError details.";
            break;
          default:
            errorMessage = `Audio playback failed with an unknown error code: ${mediaError.code}. Refer to MediaError details in console.`;
        }
      } else {
         console.log("MediaError object was null or undefined at the time of error handling.");
      }
      console.log("Final Error Message for UI:", errorMessage);
      console.log("--- End Audio Playback Error Details ---");
      
      toast({
        title: "Audio Playback Error",
        description: errorMessage,
        variant: "destructive",
      });
    };
    
    audioElement.addEventListener('error', handleAudioError);

    if (audioDataUri) {
      console.log("AcademicModuleCreator: Received audioDataUri (first 100 chars):", audioDataUri.substring(0, 100));
      if (audioElement.src !== audioDataUri) {
        audioElement.src = audioDataUri;
        audioElement.load(); // Explicitly load the new source
      }

      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log("Audio play() promise rejected:", err);
          if (err.name === 'NotAllowedError') {
            toast({
              title: "Audio Autoplay Blocked",
              description: "Audio autoplay was blocked by the browser. Please use the provided controls to play the narration.",
              variant: "default"
            });
          } else if (err.name === 'NotSupportedError' && !audioElement.error) {
            toast({
              title: "Audio Playback Error",
              description: "The browser reported it cannot play this audio format. Check console for details on the audio source and MediaError.",
              variant: "destructive"
            });
          } else if (err.name !== 'NotSupportedError' && err.name !== 'AbortError' && !audioElement.error) { 
            toast({
              title: "Audio Playback Issue",
              description: `Could not play audio: ${err.message || 'Unknown error during play attempt'}.`,
              variant: "destructive"
            });
          }
        });
      }
    } else {
      audioElement.pause();
      audioElement.currentTime = 0;
      if (audioElement.src) { 
         audioElement.src = ""; 
      }
    }

    return () => {
      if (audioElement) {
        audioElement.removeEventListener('error', handleAudioError);
        audioElement.pause();
      }
    };
  }, [isClient, audioDataUri, toast]);


  const handleCreateModule = async () => {
    if (!topic.trim()) {
      setError("Topic cannot be empty.");
      toast({
        title: "Error",
        description: "Please enter an academic topic.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setModuleIdea(null);
    setGeneratedImage(null);
    setAnimationCode(null);
    setAudioScript(null);
    setAudioDataUri(null); 

    setIdeaGenerated(false);
    setImageGeneratedState(false);
    setCodeGenerated(false);
    setAudioScriptGenerated(false);
    setAudioSynthesized(false);
    
    setCurrentStep(""); 

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src) { 
         audioRef.current.src = ""; 
      }
    }

    try {
      setCurrentStep("Generating module ideas & image prompt...");
      toast({ title: "Step 1: Generating Ideas", description: "AI is brainstorming content and image ideas..." });
      const ideaOutput = await generateModuleContentIdea({ topic });
      setModuleIdea(ideaOutput);
      setIdeaGenerated(true);
      toast({ title: "Ideas Generated!", description: "Module title and image prompt created." });

      setCurrentStep("Generating image...");
      toast({ title: "Step 2: Creating Image", description: "AI is generating the visual..." });
      if (!ideaOutput.imagePrompt) throw new Error("Image prompt was not generated.");
      const imageOutput = await generateImage({ prompt: ideaOutput.imagePrompt });
      if (!imageOutput.imageDataUri) throw new Error("Image data URI is missing.");
      setGeneratedImage(imageOutput);
      setImageGeneratedState(true);
      toast({ title: "Image Generated!", description: "Visual created successfully." });

      setCurrentStep("Generating animation code...");
      toast({ title: "Step 3: Crafting Animation", description: "AI is developing the animation code..." });
      const codeOutput = await generateAnimationCode({
        imageDataUri: imageOutput.imageDataUri,
        animationConcept: ideaOutput.animationConcept,
        suggestedKeywords: ideaOutput.suggestedKeywords,
        moduleTitle: ideaOutput.moduleTitle,
      });
      if (!codeOutput.htmlContent) throw new Error("Animation HTML content is missing.");
      setAnimationCode(codeOutput);
      setCodeGenerated(true);
      toast({ title: "Animation Code Ready!", description: "Module content created." });

      setCurrentStep("Generating audio script...");
      toast({ title: "Step 4: Writing Audio Script", description: "AI is drafting the narration..." });
      const scriptInput: GenerateAudioScriptInput = { moduleTitle: ideaOutput.moduleTitle, animationConcept: ideaOutput.animationConcept };
      const scriptOutput = await generateAudioScript(scriptInput);
      if (!scriptOutput.audioScript) throw new Error("Audio script was not generated.");
      setAudioScript(scriptOutput);
      setAudioScriptGenerated(true);
      toast({ title: "Audio Script Generated!", description: "Narration script ready." });
      
      setCurrentStep("Synthesizing audio...");
      toast({ title: "Step 5: Synthesizing Audio", description: "AI is generating the voiceover..." });
      const speechInput: GenerateSpeechFromTextInput = { textToSpeak: scriptOutput.audioScript };
      const speechOutput = await generateSpeechFromText(speechInput);
      if (!speechOutput.audioDataUri) throw new Error("Audio data URI is missing from TTS flow output.");
      setAudioDataUri(speechOutput.audioDataUri); 
      setAudioSynthesized(true);
      toast({ title: "Audio Ready!", description: "Voiceover generated successfully." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed during '${currentStep || "module creation"}': ${errorMessage}`);
      toast({
        title: "Error Creating Module",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error creating module:", err);
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };
  
  const isPreviewReady = isClient && animationCode?.htmlContent && audioDataUri;

  return (
    <div className="w-full max-w-full flex flex-col md:flex-row gap-6 flex-grow">
      {/* Left Panel - Adjusted to be narrower */}
      <Card className="md:w-1/4 lg:w-1/5 flex flex-col space-y-4 p-4 sm:p-6 shadow-lg h-fit md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        <div>
          <Label htmlFor="topic" className="text-base sm:text-lg font-semibold">Academic Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis"
            className="text-sm sm:text-base mt-1"
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={handleCreateModule}
          disabled={isLoading || !topic.trim()}
          className="w-full text-base sm:text-lg py-2.5 sm:py-3"
          size="lg"
        >
          {isLoading ? (
            <> <LoadingSpinner className="mr-2 h-4 sm:h-5 w-4 sm:w-5" /> {currentStep || "Generating..."} </>
          ) : (
            "✨ Generate Full Module"
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle className="text-sm sm:text-base">Error</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {(isLoading || ideaGenerated || imageGeneratedState || codeGenerated || audioScriptGenerated || audioSynthesized || moduleIdea) && (
          <div className="space-y-2.5 mt-3 pt-3 border-t">
            <h3 className="text-sm sm:text-base font-semibold text-primary">Generation Steps:</h3>
            
            <div className="flex items-center">
              {isLoading && currentStep.includes("ideas") ? ( <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" /> ) 
               : ideaGenerated ? ( <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" /> ) 
               : ( <Lightbulb className="h-4 w-4 text-muted-foreground mr-2 shrink-0" /> )}
              <span className={cn("text-xs sm:text-sm", ideaGenerated && "font-medium", error && currentStep.includes("ideas") && "text-destructive")}>
                Module Idea {isLoading && currentStep.includes("ideas") ? "(Processing...)" : ideaGenerated ? "(Completed)" : error && currentStep.includes("ideas") ? "(Failed)" : ""}
              </span>
            </div>
            {moduleIdea && ideaGenerated && (
              <Card className="ml-6 p-2.5 bg-muted/30 text-xs space-y-1 border-l-2 border-accent">
                <p><strong>Title:</strong> {moduleIdea.moduleTitle}</p>
                <details className="cursor-pointer">
                  <summary className="hover:text-accent text-xs">Image Prompt & Image</summary>
                  <p className="italic p-1 border rounded bg-background mt-1 text-gray-700">{moduleIdea.imagePrompt}</p>
                  {generatedImage?.imageDataUri && isClient && (
                    <div className="mt-1.5">
                      <Image
                        src={generatedImage.imageDataUri}
                        alt={moduleIdea?.imagePrompt || "Generated image for module idea"}
                        width={80}
                        height={80}
                        style={{objectFit:"contain", borderRadius: '4px', border: '1px solid hsl(var(--border))'}}
                        data-ai-hint="educational illustration"
                      />
                    </div>
                  )}
                </details>
                <p><strong>Concept:</strong> {moduleIdea.animationConcept}</p>
                <p><strong>Keywords:</strong> {moduleIdea.suggestedKeywords.join(", ")}</p>
              </Card>
            )}

            {(isLoading || imageGeneratedState || (ideaGenerated && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("image") ? ( <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" /> ) 
               : imageGeneratedState ? ( <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" /> ) 
               : ( <ImageIconLucide className="h-4 w-4 text-muted-foreground mr-2 shrink-0" /> )}
              <span className={cn("text-xs sm:text-sm", imageGeneratedState && "font-medium", error && currentStep.includes("image") && "text-destructive")}>
                Image Generation {isLoading && currentStep.includes("image") ? "(Processing...)" : imageGeneratedState ? "(Completed)" : error && currentStep.includes("image") ? "(Failed)" : ""}
              </span>
            </div>
            )}
            
            {(isLoading || codeGenerated || (imageGeneratedState && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("animation") ? ( <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" /> ) 
               : codeGenerated ? ( <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" /> ) 
               : ( <Code className="h-4 w-4 text-muted-foreground mr-2 shrink-0" /> )}
              <span className={cn("text-xs sm:text-sm", codeGenerated && "font-medium", error && currentStep.includes("animation") && "text-destructive")}>
                Module Code {isLoading && currentStep.includes("animation") ? "(Processing...)" : codeGenerated ? "(Completed)" : error && currentStep.includes("animation") ? "(Failed)" : ""}
              </span>
            </div>
            )}

            {(isLoading || audioScriptGenerated || (codeGenerated && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("script") ? ( <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" /> ) 
               : audioScriptGenerated ? ( <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" /> ) 
               : ( <Mic className="h-4 w-4 text-muted-foreground mr-2 shrink-0" /> )}
              <span className={cn("text-xs sm:text-sm", audioScriptGenerated && "font-medium", error && currentStep.includes("script") && "text-destructive")}>
                Audio Script {isLoading && currentStep.includes("script") ? "(Processing...)" : audioScriptGenerated ? "(Completed)" : error && currentStep.includes("script") ? "(Failed)" : ""}
              </span>
            </div>
            )}
             {audioScript && audioScriptGenerated && (
              <Card className="ml-6 p-2.5 bg-muted/30 text-xs space-y-1 border-l-2 border-accent">
                <details className="cursor-pointer">
                  <summary className="hover:text-accent text-xs">Audio Script (Click to expand)</summary>
                  <p className="italic p-1 border rounded bg-background mt-1 text-gray-700 whitespace-pre-wrap">{audioScript.audioScript}</p>
                </details>
              </Card>
            )}

            {(isLoading || audioSynthesized || (audioScriptGenerated && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("Synthesizing audio") ? ( <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" /> ) 
               : audioSynthesized ? ( <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" /> ) 
               : ( <FileAudio className="h-4 w-4 text-muted-foreground mr-2 shrink-0" /> )}
              <span className={cn("text-xs sm:text-sm", audioSynthesized && "font-medium", error && currentStep.includes("Synthesizing audio") && "text-destructive")}>
                Audio Synthesis {isLoading && currentStep.includes("Synthesizing audio") ? "(Processing...)" : audioSynthesized ? "(Completed)" : error && currentStep.includes("Synthesizing audio") ? "(Failed)" : ""}
              </span>
            </div>
            )}
          </div>
        )}
      </Card>

      {/* Right Panel - Adjusted to be wider */}
      <Card className="md:w-3/4 lg:w-4/5 flex-grow p-4 sm:p-6 shadow-lg md:max-h-[calc(100vh-120px)] flex flex-col">
        {(() => {
          if (isPreviewReady) {
            return (
              <>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2 shrink-0">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center">
                    <Film className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-accent"/>
                    Generated Module Preview
                    </h3>
                     <audio 
                        key={audioDataUri} 
                        ref={audioRef} 
                        controls 
                        className="max-w-xs sm:max-w-sm md:max-w-md h-10"
                     >
                        Your browser does not support the audio element.
                     </audio>
                </div>
                <div className="flex-grow w-full border rounded-md overflow-hidden shadow-md bg-background">
                  <iframe
                    srcDoc={animationCode!.htmlContent} 
                    title="Generated Module Preview"
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin" 
                  />
                </div>
              </>
            );
          }
          if (isLoading && (!animationCode || !audioDataUri)) { 
            return (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-muted-foreground">
                  {currentStep || "Generating your module..."}
                </p>
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg p-6 sm:p-12 text-center">
              <BookOpenText className="h-12 w-12 sm:h-16 sm:w-16 mb-3 sm:mb-4 text-primary" />
              <p className="text-base sm:text-xl font-semibold">Module Preview Area</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter a topic and click "Generate Full Module". The interactive module and audio will appear here once all generation steps are complete.</p>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

    