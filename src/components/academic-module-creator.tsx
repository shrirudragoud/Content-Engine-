
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
import { Progress } from "@/components/ui/progress";
import { generateModuleContentIdea, type GenerateModuleContentIdeaOutput } from "@/ai/flows/generate-module-content-idea-flow";
import { generateImage, type GenerateImageOutput } from "@/ai/flows/generate-image-from-prompt";
import { generateAnimationCode, type GenerateAnimationCodeOutput } from "@/ai/flows/generate-animation-code-flow";
import { generateAudioScript, type GenerateAudioScriptInput, type GenerateAudioScriptOutput } from "@/ai/flows/generate-audio-script-flow";
import { generateSpeechFromText, type GenerateSpeechFromTextInput, type GenerateSpeechFromTextOutput } from "@/ai/flows/generate-speech-from-text-flow";

import { Code, Lightbulb, Image as ImageIconLucide, Film, CheckCircle, BookOpenText, Mic, FileAudio, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 'idea', label: 'Module Idea & Concept', icon: Lightbulb, processingText: 'ideas' },
  { id: 'image', label: 'Image Generation', icon: ImageIconLucide, processingText: 'image' },
  { id: 'code', label: 'Module Code', icon: Code, processingText: 'animation' },
  { id: 'script', label: 'Audio Script', icon: Mic, processingText: 'script' },
  { id: 'synthesis', label: 'Audio Synthesis', icon: FileAudio, processingText: 'Synthesizing audio' },
];

export function AcademicModuleCreator() {
  const [topic, setTopic] = useState<string>("");
  const [moduleIdea, setModuleIdea] = useState<GenerateModuleContentIdeaOutput | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GenerateImageOutput | null>(null);
  const [animationCode, setAnimationCode] = useState<GenerateAnimationCodeOutput | null>(null);
  const [audioScript, setAudioScript] = useState<GenerateAudioScriptOutput | null>(null);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStepText, setCurrentStepText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [ideaGenerated, setIdeaGenerated] = useState(false);
  const [imageGeneratedState, setImageGeneratedState] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [audioScriptGenerated, setAudioScriptGenerated] = useState(false);
  const [audioSynthesized, setAudioSynthesized] = useState(false);
  const [failedStep, setFailedStep] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!isClient || !audioElement) return;

    const handleAudioError = (event: Event) => {
      const targetAudioElement = event.target as HTMLAudioElement;
      const mediaError = targetAudioElement.error;
      const currentAudioSrc = targetAudioElement.currentSrc || targetAudioElement.src;
      let errorMessage = "Audio playback failed: Unknown error.";

      console.log("--- Audio Playback Error Details ---");
      console.log("Failed Audio Source (first 200 chars):", currentAudioSrc ? currentAudioSrc.substring(0, 200) + (currentAudioSrc.length > 200 ? "..." : "") : "N/A");
      if (currentAudioSrc && currentAudioSrc.startsWith("data:")) {
        console.log("Full Failed Audio Data URI (inspect in console):");
        console.log(currentAudioSrc);
      }

      if (mediaError) {
        const mediaErrorDetails: Record<string, any> = { code: mediaError.code, message: mediaError.message };
        for (const key in mediaError) {
          if (Object.prototype.hasOwnProperty.call(mediaError, key) && typeof (mediaError as any)[key] !== 'function') {
            mediaErrorDetails[key] = (mediaError as any)[key];
          }
        }
        console.log("MediaError Object Details:", mediaErrorDetails);
        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED: errorMessage = "Audio playback was aborted."; break;
          case mediaError.MEDIA_ERR_NETWORK: errorMessage = "A network error caused audio download to fail."; break;
          case mediaError.MEDIA_ERR_DECODE: errorMessage = "Audio playback failed: The audio data could not be decoded (corrupted or unparsable)."; break;
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = "Audio playback failed: The audio format (e.g., codec or container) provided by the AI is not supported by your browser or the source URI is invalid. Please check the console for the full audio data URI and MediaError details for more information on the exact format received."; break;
          default: errorMessage = `Audio playback failed with an unknown error code: ${mediaError.code}. Refer to MediaError details in console.`;
        }
      } else {
        console.log("MediaError object was null or undefined at the time of error handling.");
      }
      console.error("Audio Element Error:", errorMessage, mediaError);
      toast({ title: "Audio Playback Error", description: errorMessage, variant: "destructive" });
    };
    
    audioElement.addEventListener('error', handleAudioError);

    if (audioDataUri) {
      console.log("AcademicModuleCreator: Received audioDataUri (first 100 chars):", audioDataUri.substring(0, 100));
      if (audioElement.src !== audioDataUri) {
        audioElement.src = audioDataUri;
        audioElement.load(); 
      }
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log("Audio play() promise rejected:", err);
          if (err.name === 'NotAllowedError') {
            toast({ title: "Audio Autoplay Blocked", description: "Audio autoplay was blocked by the browser. Please use the provided controls to play the narration.", variant: "default" });
          } else if (err.name === 'NotSupportedError' && !audioElement.error) { // NotSupportedError is a DOMException, not a MediaError
            toast({ title: "Audio Playback Error", description: "The browser reported it cannot play this audio format, or the audio source is invalid/empty. Check console for details.", variant: "destructive" });
          } else if (err.name !== 'NotSupportedError' && err.name !== 'AbortError' && !audioElement.error) { 
             toast({ title: "Audio Playback Issue", description: `Could not play audio: ${err.message || 'Unknown error'}.`, variant: "destructive" });
          }
          // The audioElement.error listener will handle MediaError specific issues (like decode, network, src_not_supported after load attempt)
        });
      }
    } else {
      audioElement.pause();
      audioElement.currentTime = 0;
      if (audioElement.src) audioElement.src = "";
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('error', handleAudioError);
        audioElement.pause();
      }
    };
  }, [isClient, audioDataUri, toast]);

  const resetState = () => {
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
    setError(null);
    setFailedStep(null);
    setCurrentStepText("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src) audioRef.current.src = "";
    }
  };

  const handleCreateModule = async () => {
    if (!topic.trim()) {
      setError("Topic cannot be empty.");
      toast({ title: "Error", description: "Please enter an academic topic.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    resetState();

    try {
      setCurrentStepText("Generating module ideas & image prompt...");
      setFailedStep(null);
      toast({ title: "Step 1: Generating Ideas", description: "AI is brainstorming content and image ideas..." });
      const ideaOutput = await generateModuleContentIdea({ topic });
      setModuleIdea(ideaOutput);
      setIdeaGenerated(true);
      toast({ title: "Ideas Generated!", description: "Module title and image prompt created." });

      setCurrentStepText("Generating image...");
      if (!ideaOutput.imagePrompt) throw new Error("Image prompt was not generated.");
      const imageOutput = await generateImage({ prompt: ideaOutput.imagePrompt });
      if (!imageOutput.imageDataUri) throw new Error("Image data URI is missing.");
      setGeneratedImage(imageOutput);
      setImageGeneratedState(true);
      toast({ title: "Image Generated!", description: "Visual created successfully." });

      setCurrentStepText("Generating animation code...");
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

      setCurrentStepText("Generating audio script...");
      const scriptInput: GenerateAudioScriptInput = { moduleTitle: ideaOutput.moduleTitle, animationConcept: ideaOutput.animationConcept };
      const scriptOutput = await generateAudioScript(scriptInput);
      if (!scriptOutput.audioScript) throw new Error("Audio script was not generated.");
      setAudioScript(scriptOutput);
      setAudioScriptGenerated(true);
      toast({ title: "Audio Script Generated!", description: "Narration script ready." });
      
      setCurrentStepText("Synthesizing audio...");
      const speechInput: GenerateSpeechFromTextInput = { textToSpeak: scriptOutput.audioScript };
      const speechOutput = await generateSpeechFromText(speechInput);
      if (!speechOutput.audioDataUri) throw new Error("Audio data URI is missing from TTS flow output.");
      setAudioDataUri(speechOutput.audioDataUri); 
      setAudioSynthesized(true);
      toast({ title: "Audio Ready!", description: "Voiceover generated successfully." });
      setCurrentStepText("All steps completed!");

    } catch (err) {
      const currentProcessingStepId = STAGES.find(s => currentStepText.toLowerCase().includes(s.processingText.toLowerCase()))?.id;
      setFailedStep(currentProcessingStepId || 'unknown');
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed during '${currentStepText || "module creation"}': ${errorMessage}`);
      toast({ title: "Error Creating Module", description: errorMessage, variant: "destructive" });
      console.error("Error creating module:", err);
    } finally {
      setIsLoading(false);
      // currentStepText is set to "All steps completed!" on success or left as the failing step on error.
    }
  };
  
  const isPreviewReady = isClient && animationCode?.htmlContent && audioDataUri;
  
  let completedStepCount = 0;
  if (ideaGenerated) completedStepCount++;
  if (imageGeneratedState) completedStepCount++;
  if (codeGenerated) completedStepCount++;
  if (audioScriptGenerated) completedStepCount++;
  if (audioSynthesized) completedStepCount++;
  const progressPercentage = (completedStepCount / STAGES.length) * 100;

  const getStageStatus = (stageId: string) => {
    if (failedStep === stageId) return 'failed';
    if (stageId === 'idea' && ideaGenerated) return 'completed';
    if (stageId === 'image' && imageGeneratedState) return 'completed';
    if (stageId === 'code' && codeGenerated) return 'completed';
    if (stageId === 'script' && audioScriptGenerated) return 'completed';
    if (stageId === 'synthesis' && audioSynthesized) return 'completed';
    
    const currentProcessingStage = STAGES.find(s => currentStepText.toLowerCase().includes(s.processingText.toLowerCase()));
    if (isLoading && currentProcessingStage?.id === stageId && !failedStep) return 'processing'; // Only processing if not failed
    
    // If a previous step failed, subsequent steps are effectively pending/blocked
    if (failedStep) {
        const failedStageIndex = STAGES.findIndex(s => s.id === failedStep);
        const currentStageIndex = STAGES.findIndex(s => s.id === stageId);
        if (currentStageIndex > failedStageIndex) return 'pending'; // Or 'blocked', visually 'pending' is fine
    }
    
    // If loading but this step hasn't started and no prior step failed it's pending
    if (isLoading && !failedStep) {
      const currentStageIndex = STAGES.findIndex(s => s.id === stageId);
      const processingStageIndex = currentProcessingStage ? STAGES.findIndex(s => s.id === currentProcessingStage.id) : -1;
      if (currentStageIndex > processingStageIndex) return 'pending';
    }

    // Before generation starts, all are pending unless completed (which they aren't)
    if (!isLoading && completedStepCount < STAGES.length && STAGES.findIndex(s => s.id === stageId) >= completedStepCount) return 'pending';

    return 'pending'; // Default if none of the above
  };


  return (
    <div className="w-full max-w-full flex flex-col md:flex-row gap-6 flex-grow">
      {/* Left Panel */}
      <Card className="md:w-1/4 lg:w-1/5 flex flex-col p-4 sm:p-6 shadow-lg h-fit md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        {/* Progress Section */}
        {(isLoading || completedStepCount > 0 || error) && (
          <div className="mb-6">
             {/* Overall status header removed based on user request */}
            {isLoading && <p className="text-xs text-muted-foreground mb-2">{currentStepText}</p>}
            
            <Progress value={progressPercentage} className="w-full h-2 mb-4" />
            
            <div className="space-y-2.5">
              {STAGES.map((stage) => {
                const status = getStageStatus(stage.id);
                const IconComponent = 
                  status === 'completed' ? CheckCircle :
                  status === 'failed' ? XCircle :
                  status === 'processing' ? LoadingSpinner :
                  stage.icon;
                const iconColor = 
                  status === 'completed' ? "text-green-500" :
                  status === 'failed' ? "text-destructive" :
                  status === 'processing' ? "text-accent" :
                  "text-muted-foreground";

                return (
                  <div key={stage.id} className="flex items-start">
                    <IconComponent className={cn("h-4 w-4 mt-0.5 mr-2 shrink-0", iconColor, status === 'processing' && "animate-spin")} />
                    <div className="flex-grow">
                       {/* Individual status suffixes like "(Processing...)" removed based on user request */}
                      <span className={cn("text-xs sm:text-sm", status === 'completed' && "font-medium", status==='failed' && "text-destructive font-medium")}>
                        {stage.label}
                      </span>
                      {stage.id === 'idea' && moduleIdea && (status === 'completed' || (status === 'failed' && ideaGenerated)) && (
                        <details className="mt-1 group text-xs">
                          <summary className="text-muted-foreground hover:text-accent list-none py-0.5 flex items-center cursor-pointer">
                            <ChevronRight className="h-3 w-3 mr-1 group-open:rotate-90 transition-transform shrink-0" />
                            <span>View Details</span>
                          </summary>
                          <Card className="p-2 bg-muted/30 space-y-1 border-l-2 border-accent mt-1">
                            <p><strong>Title:</strong> {moduleIdea.moduleTitle}</p>
                            <details className="cursor-pointer">
                              <summary className="hover:text-accent">Image Prompt & Image</summary>
                              <p className="italic p-1 border rounded bg-background mt-0.5 text-gray-700">{moduleIdea.imagePrompt}</p>
                              {generatedImage?.imageDataUri && isClient && (
                                <div className="mt-1">
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
                        </details>
                      )}
                      {stage.id === 'script' && audioScript && (status === 'completed' || (status === 'failed' && audioScriptGenerated)) && (
                        <details className="mt-1 group text-xs">
                          <summary className="text-muted-foreground hover:text-accent list-none py-0.5 flex items-center cursor-pointer">
                            <ChevronRight className="h-3 w-3 mr-1 group-open:rotate-90 transition-transform shrink-0" />
                            <span>View Audio Script</span>
                          </summary>
                          <Card className="p-2 bg-muted/30 space-y-1 border-l-2 border-accent mt-1">
                            <p className="italic p-1 border rounded bg-background mt-0.5 text-gray-700 whitespace-pre-wrap">{audioScript.audioScript}</p>
                          </Card>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Section - pushed to bottom if space allows, or flows naturally */}
        <div className={cn("mt-auto pt-6", (isLoading || completedStepCount > 0 || error) && "border-t")}>
          <Label htmlFor="topic" className="text-base sm:text-lg font-semibold">Academic Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis"
            className="text-sm sm:text-base mt-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleCreateModule}
            disabled={isLoading || !topic.trim()}
            className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-4"
            size="lg"
          >
            {isLoading ? (
              <> <LoadingSpinner className="mr-2 h-4 sm:h-5 w-4 sm:w-5" /> Generating... </>
            ) : (
              "✨ Generate Full Module"
            )}
          </Button>
          {error && !isLoading && ( 
            <Alert variant="destructive" className="mt-4">
              <AlertTitle className="text-sm sm:text-base">Error</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </Card>

      {/* Right Panel */}
      <Card className={cn(
        "md:w-3/4 lg:w-4/5 flex-grow shadow-lg md:max-h-[calc(100vh-120px)] flex flex-col overflow-hidden",
         isPreviewReady ? "p-1" : "p-4 sm:p-6" 
      )}>
        {(() => {
          if (isPreviewReady) {
            return (
              <>
                <div className="flex items-center justify-between mb-1 sm:mb-1.5 shrink-0 px-1 pt-1">
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
                <div className="flex-grow w-full overflow-hidden rounded-md"> 
                  <iframe
                    srcDoc={animationCode!.htmlContent} 
                    title="Generated Module Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin" 
                  />
                </div>
              </>
            );
          }
          if (isLoading) { 
            return (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-muted-foreground">
                  {currentStepText || "Preparing to generate module..."}
                </p>
                 <Progress value={progressPercentage} className="w-3/4 max-w-md mt-4 h-2.5" />
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

