
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { generateModuleContentIdea, type GenerateModuleContentIdeaOutput } from "@/ai/flows/generate-module-content-idea-flow";
import { generateImage, type GenerateImageOutput } from "@/ai/flows/generate-image-from-prompt";
import { generateAnimationCode, type GenerateAnimationCodeOutput } from "@/ai/flows/generate-animation-code-flow";
import { Code, Lightbulb, Image as ImageIcon, Film } from "lucide-react";

export function AcademicModuleCreator() {
  const [topic, setTopic] = useState<string>("");
  const [moduleIdea, setModuleIdea] = useState<GenerateModuleContentIdeaOutput | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GenerateImageOutput | null>(null);
  const [animationCode, setAnimationCode] = useState<GenerateAnimationCodeOutput | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

    try {
      setCurrentStep("Generating module ideas & image prompt...");
      toast({ title: "Step 1: Generating Ideas", description: "AI is brainstorming content and image ideas..." });
      const ideaOutput = await generateModuleContentIdea({ topic });
      setModuleIdea(ideaOutput);
      toast({ title: "Ideas Generated!", description: "Module title and image prompt created." });

      setCurrentStep("Generating image...");
      toast({ title: "Step 2: Creating Image", description: "AI is generating the visual..." });
      if (!ideaOutput.imagePrompt) throw new Error("Image prompt was not generated.");
      const imageOutput = await generateImage({ prompt: ideaOutput.imagePrompt });
      if (!imageOutput.imageDataUri) throw new Error("Image data URI is missing.");
      setGeneratedImage(imageOutput);
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
      toast({ title: "Animation Code Ready!", description: "Module creation complete." });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed during '${currentStep}': ${errorMessage}`);
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
    <Card className="w-full max-w-3xl shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center flex items-center justify-center">
          <Lightbulb className="mr-3 h-8 w-8 text-primary" />
          AI Academic Module Creator
        </CardTitle>
        <CardDescription className="text-center text-base">
          Enter an academic topic, and AI will generate a module title, a relevant image, and simple HTML/CSS/JS animation code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-lg">Enter Academic Topic:</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, The Water Cycle, Pythagorean Theorem"
            className="text-base"
            disabled={isLoading}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleCreateModule}
          disabled={isLoading}
          className="w-full text-lg py-6"
          size="lg"
        >
          {isLoading ? (
            <> <LoadingSpinner className="mr-2 h-5 w-5" /> {currentStep || "Creating Module..."} </>
          ) : (
            "✨ Generate Academic Module"
          )}
        </Button>

        {moduleIdea && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-accent"/>Module Idea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="font-semibold">Title:</Label>
                <p className="text-lg">{moduleIdea.moduleTitle}</p>
              </div>
              <div>
                <Label className="font-semibold">Image Prompt (for AI):</Label>
                <p className="italic text-sm p-2 border rounded-md bg-background">{moduleIdea.imagePrompt}</p>
              </div>
              <div>
                <Label className="font-semibold">Animation Concept:</Label>
                <p>{moduleIdea.animationConcept}</p>
              </div>
              <div>
                <Label className="font-semibold">Suggested Keywords:</Label>
                <p>{moduleIdea.suggestedKeywords.join(", ")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {generatedImage?.imageDataUri && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-accent"/>Generated Image</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="relative aspect-video w-full max-w-md rounded-md overflow-hidden border-2 border-primary shadow-md">
                <Image
                  src={generatedImage.imageDataUri}
                  alt={moduleIdea?.imagePrompt || "Generated image for module"}
                  fill={true}
                  style={{objectFit:"contain"}}
                  data-ai-hint="educational illustration"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {animationCode?.htmlContent && (
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center"><Film className="mr-2 h-5 w-5 text-accent"/>Animation Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video w-full border rounded-md overflow-hidden shadow-md">
                <iframe
                  srcDoc={animationCode.htmlContent}
                  title="Animation Preview"
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin" 
                />
              </div>
               <div>
                <Label htmlFor="animation-code" className="font-semibold flex items-center"><Code className="mr-2 h-4 w-4"/>Generated Animation Code (HTML, CSS, JS):</Label>
                <Textarea
                  id="animation-code"
                  value={animationCode.htmlContent}
                  readOnly
                  rows={15}
                  className="w-full mt-1 text-xs font-mono bg-background"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
