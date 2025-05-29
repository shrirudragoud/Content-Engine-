
"use client";

import { useState, useEffect } from "react";
import Image from "next/image"; // Keep for potential future use, though not directly in right panel
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Keep for potential future use
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { generateModuleContentIdea, type GenerateModuleContentIdeaOutput } from "@/ai/flows/generate-module-content-idea-flow";
import { generateImage, type GenerateImageOutput } from "@/ai/flows/generate-image-from-prompt";
import { generateAnimationCode, type GenerateAnimationCodeOutput } from "@/ai/flows/generate-animation-code-flow";
import { Code, Lightbulb, Image as ImageIcon, Film, CheckCircle, BookOpenText, Code2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function AcademicModuleCreator() {
  const [topic, setTopic] = useState<string>("");
  const [moduleIdea, setModuleIdea] = useState<GenerateModuleContentIdeaOutput | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GenerateImageOutput | null>(null); // Still needed for the flow
  const [animationCode, setAnimationCode] = useState<GenerateAnimationCodeOutput | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [ideaGenerated, setIdeaGenerated] = useState(false);
  const [imageGeneratedState, setImageGeneratedState] = useState(false);
  const [codeGenerated, setCodeGenerated] = useState(false);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    setIdeaGenerated(false);
    setImageGeneratedState(false);
    setCodeGenerated(false);
    setCurrentStep(""); // Reset current step

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
      setGeneratedImage(imageOutput); // Store for the animation code flow
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
      toast({ title: "Animation Code Ready!", description: "Module creation complete." });

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
  
  return (
    <div className="w-full max-w-full flex flex-col md:flex-row gap-6 flex-grow">
      {/* Left Panel */}
      <Card className="md:w-2/5 lg:w-1/3 flex flex-col space-y-4 p-4 sm:p-6 shadow-lg h-fit md:max-h-[calc(100vh-120px)] md:overflow-y-auto">
        <div>
          <Label htmlFor="topic" className="text-base sm:text-lg font-semibold">Academic Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, The Water Cycle"
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
            "✨ Generate Module"
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle className="text-sm sm:text-base">Error</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {(isLoading || ideaGenerated || imageGeneratedState || codeGenerated || moduleIdea) && (
          <div className="space-y-2.5 mt-3 pt-3 border-t">
            <h3 className="text-sm sm:text-base font-semibold text-primary">Generation Steps:</h3>
            
            <div className="flex items-center">
              {isLoading && currentStep.includes("ideas") ? (
                <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" />
              ) : ideaGenerated ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" />
              ) : (
                <Lightbulb className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              )}
              <span className={cn("text-xs sm:text-sm", ideaGenerated && "font-medium", error && currentStep.includes("ideas") && "text-destructive")}>
                Module Idea {isLoading && currentStep.includes("ideas") ? "(Processing...)" : ideaGenerated ? "(Completed)" : error && currentStep.includes("ideas") ? "(Failed)" : ""}
              </span>
            </div>
            {moduleIdea && ideaGenerated && (
              <Card className="ml-6 p-2.5 bg-muted/30 text-xs space-y-1 border-l-2 border-accent">
                <p><strong>Title:</strong> {moduleIdea.moduleTitle}</p>
                <details className="cursor-pointer">
                  <summary className="hover:text-accent text-xs">Image Prompt (Click to expand)</summary>
                  <p className="italic p-1 border rounded bg-background mt-1 text-gray-700">{moduleIdea.imagePrompt}</p>
                </details>
                 {generatedImage?.imageDataUri && isClient && (
                  <div className="mt-2">
                    <p className="text-xs font-medium">Idea Image:</p>
                    <Image
                      src={generatedImage.imageDataUri}
                      alt={moduleIdea?.imagePrompt || "Generated image for module idea"}
                      width={100}
                      height={100}
                      style={{objectFit:"contain", borderRadius: '4px', border: '1px solid hsl(var(--border))'}}
                      data-ai-hint="educational illustration"
                    />
                  </div>
                )}
                <p><strong>Concept:</strong> {moduleIdea.animationConcept}</p>
                <p><strong>Keywords:</strong> {moduleIdea.suggestedKeywords.join(", ")}</p>
              </Card>
            )}

            {(isLoading || imageGeneratedState || (ideaGenerated && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("image") ? (
                <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" />
              ) : imageGeneratedState ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              )}
              <span className={cn("text-xs sm:text-sm", imageGeneratedState && "font-medium", error && currentStep.includes("image") && "text-destructive")}>
                Image Generation {isLoading && currentStep.includes("image") ? "(Processing...)" : imageGeneratedState ? "(Completed)" : error && currentStep.includes("image") ? "(Failed)" : ""}
              </span>
            </div>
            )}

            {(isLoading || codeGenerated || (imageGeneratedState && !error)) && (
            <div className="flex items-center">
              {isLoading && currentStep.includes("animation") ? (
                <LoadingSpinner className="h-4 w-4 text-accent mr-2 shrink-0" />
              ) : codeGenerated ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 shrink-0" />
              ) : (
                <Code className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
              )}
              <span className={cn("text-xs sm:text-sm", codeGenerated && "font-medium", error && currentStep.includes("animation") && "text-destructive")}>
                Animation Code {isLoading && currentStep.includes("animation") ? "(Processing...)" : codeGenerated ? "(Completed)" : error && currentStep.includes("animation") ? "(Failed)" : ""}
              </span>
            </div>
            )}
          </div>
        )}
      </Card>

      {/* Right Panel - Module Preview */}
      <Card className="md:w-3/5 lg:w-2/3 flex-grow p-4 sm:p-6 shadow-lg md:max-h-[calc(100vh-120px)] flex flex-col">
        {(() => {
          if (isClient && animationCode?.htmlContent) {
            return (
              <>
                <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 flex items-center shrink-0">
                  <Film className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-accent"/>
                  Generated Module Preview
                </h3>
                <div className="flex-grow w-full border rounded-md overflow-hidden shadow-md bg-background">
                  <iframe
                    srcDoc={animationCode.htmlContent}
                    title="Generated Module Preview"
                    className="w-full h-full"
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
                  {currentStep || "Generating your module..."}
                </p>
              </div>
            );
          }
          // Fallback to placeholder
          return (
            <div className="flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg p-6 sm:p-12 text-center">
              <BookOpenText className="h-12 w-12 sm:h-16 sm:w-16 mb-3 sm:mb-4 text-primary" />
              <p className="text-base sm:text-xl font-semibold">Module Preview Area</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter a topic and click "Generate Module". The interactive module will appear here.</p>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}
