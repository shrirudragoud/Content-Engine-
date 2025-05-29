
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
import { generateModulePlan, type GenerateModulePlanOutput, type PlannedModule } from "@/ai/flows/generate-module-plan-flow";
import { generateModuleContentIdea, type GenerateModuleContentIdeaOutput } from "@/ai/flows/generate-module-content-idea-flow";
import { generateImage, type GenerateImageOutput } from "@/ai/flows/generate-image-from-prompt";
import { generateAnimationCode, type GenerateAnimationCodeOutput } from "@/ai/flows/generate-animation-code-flow";
import { generateAudioScript, type GenerateAudioScriptInput, type GenerateAudioScriptOutput } from "@/ai/flows/generate-audio-script-flow";
import { generateSpeechFromText, type GenerateSpeechFromTextInput, type GenerateSpeechFromTextOutput } from "@/ai/flows/generate-speech-from-text-flow";

import { Code, Lightbulb, Image as ImageIconLucide, Film, CheckCircle, BookOpenText, Mic, FileAudio, ChevronRight, XCircle, ListTree, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_STAGES = [
  { id: 'idea', label: 'Module Idea & Concept', icon: Lightbulb, processingText: 'ideas' },
  { id: 'image', label: 'Image Generation', icon: ImageIconLucide, processingText: 'image' },
  { id: 'code', label: 'Module Code', icon: Code, processingText: 'animation' },
  { id: 'script', label: 'Audio Script', icon: Mic, processingText: 'script' },
  { id: 'synthesis', label: 'Audio Synthesis', icon: FileAudio, processingText: 'audio' },
];

const ALL_STAGES_INCLUDING_PLAN = [
  { id: 'plan', label: 'Module Plan Generation', icon: ListTree, processingText: 'plan' },
  ...BASE_STAGES,
];

type GeneratedModuleData = {
  id: string; // Use PlannedModule.title as a unique ID for the generated data
  plannedModule: PlannedModule;
  moduleIdea: GenerateModuleContentIdeaOutput;
  generatedImage: GenerateImageOutput;
  animationCode: GenerateAnimationCodeOutput;
  audioScript: GenerateAudioScriptOutput;
  audioDataUri: string;
};


export function AcademicModuleCreator() {
  const [topic, setTopic] = useState<string>("");
  const [modulePlan, setModulePlan] = useState<GenerateModulePlanOutput | null>(null);
  
  const [generatedModulesData, setGeneratedModulesData] = useState<GeneratedModuleData[]>([]);
  const [currentGeneratingModuleIndex, setCurrentGeneratingModuleIndex] = useState<number | null>(null);
  const [currentDisplayModuleIndex, setCurrentDisplayModuleIndex] = useState<number>(0);
  
  const [currentGeneratingSubStepId, setCurrentGeneratingSubStepId] = useState<string | null>(null);
  const [generationErrorForCurrentModule, setGenerationErrorForCurrentModule] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStepText, setCurrentStepText] = useState<string>(""); // Overall status text for current operation
  const [error, setError] = useState<string | null>(null); // Global error for plan generation or fatal errors
  const { toast } = useToast();

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
        // console.log("Full Failed Audio Data URI (inspect in console):");
        // console.log(currentAudioSrc); 
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
          case mediaError.MEDIA_ERR_ABORTED: errorMessage = "Audio playback was aborted by the user or system."; break;
          case mediaError.MEDIA_ERR_NETWORK: errorMessage = "A network error caused audio download to fail part-way."; break;
          case mediaError.MEDIA_ERR_DECODE: errorMessage = "Audio playback failed: The audio data could not be decoded. It might be corrupted or in an unparsable format."; break;
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = "Audio playback failed: The audio format (e.g., codec or container) provided by the AI is not supported by your browser, or the source URI is invalid/empty. Please check the console for the audio data URI's MIME type and full MediaError details."; break;
          default: errorMessage = `Audio playback failed with an unknown error code: ${mediaError.code}. Refer to MediaError details in console.`;
        }
      } else {
        console.log("MediaError object was null or undefined at the time of error handling.");
      }
      console.error("Audio Element Error:", errorMessage, mediaError); 
      toast({ title: "Audio Playback Error", description: errorMessage, variant: "destructive" });
    };
    
    audioElement.addEventListener('error', handleAudioError);

    const currentModuleData = generatedModulesData[currentDisplayModuleIndex];
    if (currentModuleData?.audioDataUri) {
      console.log("AcademicModuleCreator: Setting audio source for module:", currentModuleData.plannedModule.title, ` (URI starts with: ${currentModuleData.audioDataUri.substring(0,100)}...)`);
      if (audioElement.src !== currentModuleData.audioDataUri) {
        audioElement.src = currentModuleData.audioDataUri;
        audioElement.load(); 
      }
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log("Audio play() promise rejected:", err);
          if (err.name === 'NotAllowedError') {
            toast({ title: "Audio Autoplay Blocked", description: "Audio autoplay was blocked by the browser. Please use the provided controls to play the narration.", variant: "default" });
          } else if (err.name === 'NotSupportedError' && !audioElement.error) { 
            toast({ title: "Audio Playback Error", description: "The browser reported it cannot play this audio format, or the audio source is invalid/empty. Check console for details.", variant: "destructive" });
          } else if (err.name !== 'NotSupportedError' && err.name !== 'AbortError' && !audioElement.error) { 
             toast({ title: "Audio Playback Issue", description: `Could not play audio: ${err.message || 'Unknown error'}. Ensure the audio source is valid.`, variant: "destructive" });
          }
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
  }, [isClient, currentDisplayModuleIndex, generatedModulesData, toast]);

  const resetStateForNewGeneration = () => {
    setModulePlan(null);
    setGeneratedModulesData([]);
    setCurrentGeneratingModuleIndex(null);
    setCurrentDisplayModuleIndex(0);
    setCurrentGeneratingSubStepId(null);
    setGenerationErrorForCurrentModule(null);
    setError(null);
    setCurrentStepText("");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      if (audioRef.current.src) audioRef.current.src = "";
    }
  };

  const handleCreateModulePlanAndGenerateModules = async () => {
    if (!topic.trim()) {
      setError("Topic cannot be empty.");
      toast({ title: "Error", description: "Please enter an academic topic.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    resetStateForNewGeneration();

    try {
      setCurrentGeneratingSubStepId('plan');
      setCurrentStepText("Generating module plan...");
      toast({ title: "Step 1: Generating Plan", description: "AI is creating a learning plan..." });
      const planOutput = await generateModulePlan({ topic });
      setModulePlan(planOutput);
      toast({ title: "Plan Generated!", description: `Created a plan with ${planOutput.plannedModules.length} modules.` });

      if (!planOutput.plannedModules || planOutput.plannedModules.length === 0) {
        throw new Error("Module plan is empty or invalid.");
      }
      
      const newGeneratedModulesDataAccumulator: GeneratedModuleData[] = [];

      for (let i = 0; i < planOutput.plannedModules.length; i++) {
        setCurrentGeneratingModuleIndex(i);
        const currentPlannedModule = planOutput.plannedModules[i];
        const moduleIdentifier = `Module ${i + 1} of ${planOutput.plannedModules.length}: "${currentPlannedModule.title}"`;
        setGenerationErrorForCurrentModule(null); 

        let moduleIdeaOutput: GenerateModuleContentIdeaOutput;
        let imageOutput: GenerateImageOutput;
        let codeOutput: GenerateAnimationCodeOutput;
        let scriptOutput: GenerateAudioScriptOutput;
        let speechOutput: GenerateSpeechFromTextOutput;

        try {
          setCurrentGeneratingSubStepId('idea');
          setCurrentStepText(`Generating ideas for ${moduleIdentifier}...`);
          toast({ title: `${moduleIdentifier}: Generating Ideas`, description: "AI is brainstorming content..." });
          moduleIdeaOutput = await generateModuleContentIdea({ topic: currentPlannedModule.concept });
          if (!moduleIdeaOutput?.imagePrompt || !moduleIdeaOutput?.animationConcept) throw new Error("Module idea generation failed to return key data.");

          setCurrentGeneratingSubStepId('image');
          setCurrentStepText(`Generating image for ${moduleIdentifier}...`);
          imageOutput = await generateImage({ prompt: moduleIdeaOutput.imagePrompt });
          if (!imageOutput?.imageDataUri) throw new Error("Image data URI is missing.");

          setCurrentGeneratingSubStepId('code');
          setCurrentStepText(`Generating animation code for ${moduleIdentifier}...`);
          codeOutput = await generateAnimationCode({
            imageDataUri: imageOutput.imageDataUri,
            animationConcept: moduleIdeaOutput.animationConcept,
            suggestedKeywords: moduleIdeaOutput.suggestedKeywords,
            moduleTitle: moduleIdeaOutput.moduleTitle,
          });
          if (!codeOutput?.htmlContent) throw new Error("Animation HTML content is missing.");

          setCurrentGeneratingSubStepId('script');
          setCurrentStepText(`Generating audio script for ${moduleIdentifier}...`);
          const scriptInput: GenerateAudioScriptInput = { 
              currentModuleTitle: moduleIdeaOutput.moduleTitle,
              currentModuleConcept: moduleIdeaOutput.animationConcept,
              overallTopic: planOutput.overallTopic,
              moduleIndex: i,
              totalModulesInPlan: planOutput.plannedModules.length,
              previousModuleConcept: i > 0 ? planOutput.plannedModules[i-1].concept : undefined,
          };
          scriptOutput = await generateAudioScript(scriptInput);
          if (!scriptOutput?.audioScript) throw new Error("Audio script was not generated.");
          
          setCurrentGeneratingSubStepId('synthesis');
          setCurrentStepText(`Synthesizing audio for ${moduleIdentifier}...`);
          const speechInput: GenerateSpeechFromTextInput = { textToSpeak: scriptOutput.audioScript };
          speechOutput = await generateSpeechFromText(speechInput);
          if (!speechOutput?.audioDataUri) throw new Error("Audio data URI is missing from TTS flow output.");

          const completedModuleData = {
            id: currentPlannedModule.title, 
            plannedModule: currentPlannedModule,
            moduleIdea: moduleIdeaOutput,
            generatedImage: imageOutput,
            animationCode: codeOutput,
            audioScript: scriptOutput,
            audioDataUri: speechOutput.audioDataUri,
          };

          newGeneratedModulesDataAccumulator.push(completedModuleData);
          setGeneratedModulesData([...newGeneratedModulesDataAccumulator]); 
          setCurrentDisplayModuleIndex(i); // Auto-switch to the newly completed module

          toast({ title: `${moduleIdentifier}: Fully Generated!`, description: "Module ready for preview."});

        } catch (moduleErr) {
            const errorMessage = moduleErr instanceof Error ? moduleErr.message : "An unknown error occurred.";
            setGenerationErrorForCurrentModule(`Failed during '${currentGeneratingSubStepId || "generation"}' for ${moduleIdentifier}: ${errorMessage}`);
            toast({ title: `Error in ${moduleIdentifier}`, description: errorMessage, variant: "destructive" });
            console.error(`Error generating ${moduleIdentifier}:`, moduleErr);
            throw new Error(`Generation failed for ${moduleIdentifier}. ${errorMessage}`); 
        }
      }
      setCurrentStepText("All modules generated successfully!");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during the planning or generation process.";
      setError(errorMessage); 
      setCurrentStepText(`Module generation process encountered an error. Check details.`);
      toast({ title: "Error Creating Modules", description: errorMessage, variant: "destructive" });
      console.error("Error creating modules:", err);
    } finally {
      setIsLoading(false);
      setCurrentGeneratingSubStepId(null);
      setCurrentGeneratingModuleIndex(null);
    }
  };
  
  const currentModuleToPreview = generatedModulesData[currentDisplayModuleIndex];
  const isPreviewReady = isClient && currentModuleToPreview?.animationCode?.htmlContent && currentModuleToPreview?.audioDataUri;
  
  const subStageIds = BASE_STAGES.map(s => s.id);
  let completedSubStepsForCurrentModuleGeneration = 0;
  if (isLoading && currentGeneratingModuleIndex !== null && currentGeneratingSubStepId) {
      const currentPlannedModule = modulePlan?.plannedModules[currentGeneratingModuleIndex];
      if (currentPlannedModule && generatedModulesData.find(m => m.id === currentPlannedModule.title)) {
        completedSubStepsForCurrentModuleGeneration = subStageIds.length;
      } else {
        const subStepIndex = subStageIds.indexOf(currentGeneratingSubStepId);
        if (subStepIndex !== -1) {
          completedSubStepsForCurrentModuleGeneration = generationErrorForCurrentModule ? subStepIndex : subStepIndex +1;
        }
      }
  }

  const overallProgressForLeftPanel = modulePlan ?
  (
    (generatedModulesData.length / modulePlan.plannedModules.length) * 100 +
    (isLoading && currentGeneratingModuleIndex !== null && !generatedModulesData.find(m => m.id === modulePlan.plannedModules[currentGeneratingModuleIndex!].title) ? 
      (completedSubStepsForCurrentModuleGeneration / subStageIds.length) * (100 / modulePlan.plannedModules.length)
      : 0)
  )
  : (isLoading && currentGeneratingSubStepId === 'plan' ? 5 : 0); // Small progress if only planning

  const getStageStatus = (stageId: string, forModuleIndex: number | null) => {
    if (forModuleIndex === null) return 'pending'; 

    const targetModuleData = generatedModulesData.find(m => m.plannedModule.title === modulePlan?.plannedModules[forModuleIndex]?.title);

    if (targetModuleData) return 'completed'; 

    if (isLoading && currentGeneratingModuleIndex === forModuleIndex) {
      if (generationErrorForCurrentModule && currentGeneratingSubStepId === stageId) return 'failed';
      
      const currentSubStepOrder = subStageIds.indexOf(currentGeneratingSubStepId!);
      const stageOrder = subStageIds.indexOf(stageId);

      if (currentSubStepOrder > stageOrder) return 'completed';
      if (currentSubStepOrder === stageOrder && !generationErrorForCurrentModule) return 'processing';
    }
    
    if (currentGeneratingModuleIndex !== null && forModuleIndex < currentGeneratingModuleIndex) {
        return 'completed'; 
    }

    return 'pending';
  };

  const getPlanStageStatus = () => {
    if (!isLoading && modulePlan) return 'completed';
    if (isLoading && currentGeneratingSubStepId === 'plan') return 'processing';
    if (modulePlan || (isLoading && currentGeneratingSubStepId !== 'plan' && currentGeneratingSubStepId !== null)) return 'completed'; 
    if (error && !modulePlan && !isLoading) return 'failed'; 
    return 'pending';
  }

  const currentModuleDetailsForLeftPanel = 
    isLoading && currentGeneratingModuleIndex !== null && modulePlan?.plannedModules[currentGeneratingModuleIndex] ? 
    (generatedModulesData.find(m => m.plannedModule.title === modulePlan.plannedModules[currentGeneratingModuleIndex!].title) || null) // Use generated if available (e.g. error on next module)
    : (generatedModulesData[currentDisplayModuleIndex] || null); // Default to display module if not loading
  
  const ideaToDisplay = currentModuleDetailsForLeftPanel?.moduleIdea;
  const imageToDisplay = currentModuleDetailsForLeftPanel?.generatedImage;
  const scriptToDisplay = currentModuleDetailsForLeftPanel?.audioScript;

  return (
    <div className="w-full max-w-full flex flex-col md:flex-row gap-6 flex-grow">
      {/* Left Panel */}
      <Card className="md:w-1/4 lg:w-1/5 flex flex-col p-4 sm:p-6 shadow-lg h-fit md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        {(isLoading || generatedModulesData.length > 0 || error || modulePlan ) && (
          <div className="mb-6">
            {isLoading && currentStepText && (
              <p className="text-sm font-semibold mb-2 text-primary">{currentStepText}</p>
            )}
            {!isLoading && error && ( 
              <p className="text-sm font-semibold mb-2 text-destructive">{currentStepText || "Process ended with an error."}</p>
            )}
             {!isLoading && !error && modulePlan && generatedModulesData.length === modulePlan.plannedModules.length && (
              <p className="text-sm font-semibold mb-2 text-green-600">{currentStepText || "All modules generated."}</p>
            )}

            {(isLoading || (modulePlan && generatedModulesData.length < modulePlan.plannedModules.length && !error)) && modulePlan && (
                 <Progress value={overallProgressForLeftPanel} className="w-full h-2 mb-4" />
            )}
            
            <div className="space-y-2.5">
              {ALL_STAGES_INCLUDING_PLAN.map((stage) => {
                const isPlanStage = stage.id === 'plan';
                let status = 'pending';
                let stageLabel = stage.label;

                if (isPlanStage) {
                  status = getPlanStageStatus();
                } else if (currentGeneratingModuleIndex !== null && modulePlan) { 
                  status = getStageStatus(stage.id, currentGeneratingModuleIndex);
                  if (isLoading && currentGeneratingModuleIndex !== null) {
                     // stageLabel = `${stage.label} (M${currentGeneratingModuleIndex + 1})`;
                  }
                } else if (generatedModulesData.length > 0 && modulePlan && currentDisplayModuleIndex < generatedModulesData.length) {
                   status = 'completed';
                } else if (!isLoading && error && currentGeneratingModuleIndex !== null && modulePlan){
                    // If there was an error, show status for the module that was being generated
                    status = getStageStatus(stage.id, currentGeneratingModuleIndex);
                }


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
                      <span className={cn("text-xs sm:text-sm", status === 'completed' && "font-medium", status ==='failed' && "text-destructive font-medium")}>
                        {stageLabel}
                      </span>
                      {stage.id === 'plan' && modulePlan && (status === 'completed' || (status === 'failed' && modulePlan)) && (
                        <details className="mt-1 group text-xs">
                          <summary className="text-muted-foreground hover:text-accent list-none py-0.5 flex items-center cursor-pointer">
                            <ChevronRight className="h-3 w-3 mr-1 group-open:rotate-90 transition-transform shrink-0" />
                            <span>View Plan ({modulePlan.plannedModules.length} modules)</span>
                          </summary>
                          <Card className="p-2 bg-muted/30 space-y-1 border-l-2 border-accent mt-1">
                            <p><strong>Overall Topic:</strong> {modulePlan.overallTopic}</p>
                            {modulePlan.plannedModules.map((mod, idx) => (
                                <div key={idx} className="p-1 border-b last:border-b-0">
                                    <p className={cn("font-semibold", 
                                        idx === currentGeneratingModuleIndex && isLoading && "text-primary", 
                                        idx === currentDisplayModuleIndex && !isLoading && generatedModulesData.length > 0 && "text-primary")}>
                                        Module {idx + 1}: {mod.title}
                                    </p>
                                    <p className="text-gray-700 text-xs">{mod.concept}</p>
                                </div>
                            ))}
                          </Card>
                        </details>
                      )}
                      {stage.id === 'idea' && ideaToDisplay && (getStageStatus('idea', isLoading ? currentGeneratingModuleIndex : currentDisplayModuleIndex) !== 'pending' ) && (
                        <details className="mt-1 group text-xs">
                          <summary className="text-muted-foreground hover:text-accent list-none py-0.5 flex items-center cursor-pointer">
                            <ChevronRight className="h-3 w-3 mr-1 group-open:rotate-90 transition-transform shrink-0" />
                            <span>View Module Idea Details</span>
                          </summary>
                          <Card className="p-2 bg-muted/30 space-y-1 border-l-2 border-accent mt-1">
                            <p><strong>Title:</strong> {ideaToDisplay.moduleTitle}</p>
                            <details className="cursor-pointer">
                              <summary className="hover:text-accent">Image Prompt & Image</summary>
                              <p className="italic p-1 border rounded bg-background mt-0.5 text-gray-700">{ideaToDisplay.imagePrompt}</p>
                              {imageToDisplay?.imageDataUri && isClient && (
                                <div className="mt-1">
                                  <Image
                                    src={imageToDisplay.imageDataUri}
                                    alt={ideaToDisplay?.imagePrompt || "Generated image for module idea"}
                                    width={80}
                                    height={80}
                                    style={{objectFit:"contain", borderRadius: '4px', border: '1px solid hsl(var(--border))'}}
                                    data-ai-hint="educational illustration"
                                  />
                                </div>
                              )}
                            </details>
                            <p><strong>Concept:</strong> {ideaToDisplay.animationConcept}</p>
                            <p><strong>Keywords:</strong> {ideaToDisplay.suggestedKeywords.join(", ")}</p>
                          </Card>
                        </details>
                      )}
                      {stage.id === 'script' && scriptToDisplay && (getStageStatus('script', isLoading ? currentGeneratingModuleIndex : currentDisplayModuleIndex) !== 'pending' ) &&(
                        <details className="mt-1 group text-xs">
                          <summary className="text-muted-foreground hover:text-accent list-none py-0.5 flex items-center cursor-pointer">
                            <ChevronRight className="h-3 w-3 mr-1 group-open:rotate-90 transition-transform shrink-0" />
                            <span>View Audio Script</span>
                          </summary>
                          <Card className="p-2 bg-muted/30 space-y-1 border-l-2 border-accent mt-1">
                            <p className="italic p-1 border rounded bg-background mt-0.5 text-gray-700 whitespace-pre-wrap">{scriptToDisplay.audioScript}</p>
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

        <div className={cn("mt-auto pt-6", (isLoading || generatedModulesData.length > 0 || error || modulePlan) && "border-t")}>
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
            onClick={handleCreateModulePlanAndGenerateModules}
            disabled={isLoading || !topic.trim()}
            className="w-full text-base sm:text-lg py-2.5 sm:py-3 mt-4"
            size="lg"
          >
            {isLoading ? (
              <> <LoadingSpinner className="mr-2 h-4 sm:h-5 w-4 sm:w-5" /> Generating Modules... </>
            ) : (
              "✨ Create Learning Plan & Generate Modules"
            )}
          </Button>
          {(error && !isLoading) && ( 
            <Alert variant="destructive" className="mt-4">
              <AlertTitle className="text-sm sm:text-base">Error</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
            </Alert>
          )}
          {generationErrorForCurrentModule && !isLoading && (
             <Alert variant="destructive" className="mt-4">
              <AlertTitle className="text-sm sm:text-base">Module Generation Error</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">{generationErrorForCurrentModule}</AlertDescription>
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
          if (isPreviewReady && currentModuleToPreview) {
            return (
              <>
                <div className="flex items-center justify-between mb-1 sm:mb-1.5 shrink-0 px-1 pt-1">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center">
                    <Film className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-accent"/>
                     {`Module ${currentDisplayModuleIndex + 1}: ${currentModuleToPreview.plannedModule.title}`}
                    </h3>
                     <audio 
                        key={currentModuleToPreview.audioDataUri} 
                        ref={audioRef} 
                        controls 
                        className="max-w-xs sm:max-w-sm md:max-w-md h-10"
                     >
                        Your browser does not support the audio element.
                     </audio>
                </div>
                <div className="flex-grow w-full overflow-hidden rounded-md"> 
                  <iframe
                    srcDoc={currentModuleToPreview.animationCode.htmlContent} 
                    title={currentModuleToPreview.plannedModule.title}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin" 
                  />
                </div>
                {modulePlan && generatedModulesData.length > 0 && (
                  <div className="flex justify-between items-center p-2 border-t">
                    <Button 
                      onClick={() => setCurrentDisplayModuleIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentDisplayModuleIndex === 0}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous Module
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Viewing Module {currentDisplayModuleIndex + 1} of {generatedModulesData.length > 0 ? generatedModulesData.length : modulePlan.plannedModules.length} 
                      {isLoading && modulePlan && generatedModulesData.length < modulePlan.plannedModules.length ? ` (Generating ${modulePlan.plannedModules.length - generatedModulesData.length} more...)` : (!isLoading && modulePlan && generatedModulesData.length < modulePlan.plannedModules.length ? ' (Some modules failed)' : '')}
                    </span>
                    <Button 
                      onClick={() => setCurrentDisplayModuleIndex(prev => Math.min(generatedModulesData.length - 1, prev + 1))}
                      disabled={currentDisplayModuleIndex === generatedModulesData.length - 1 || generatedModulesData.length === 0}
                      variant="outline"
                      size="sm"
                    >
                      Next Module <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            );
          }
          if (isLoading) { 
            return (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                <p className="mt-3 sm:mt-4 text-sm sm:text-lg text-muted-foreground">
                  {currentStepText || "Preparing to generate modules..."}
                </p>
                 <Progress value={overallProgressForLeftPanel} className="w-3/4 max-w-md mt-4 h-2.5" />
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg p-6 sm:p-12 text-center">
              <BookOpenText className="h-12 w-12 sm:h-16 sm:w-16 mb-3 sm:mb-4 text-primary" />
              <p className="text-base sm:text-xl font-semibold">Module Preview Area</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter a topic and click the button. The learning plan and modules will be generated sequentially. The first module's preview will appear here once ready.</p>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

```