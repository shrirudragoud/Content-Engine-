"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateImage, type GenerateImageInput } from "@/ai/flows/generate-image-from-prompt";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Download } from "lucide-react";

export function ImageGeneratorForm() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      toast({
        title: "Error",
        description: "Prompt cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const input: GenerateImageInput = { prompt };
      const result = await generateImage(input);
      if (result.imageDataUri) {
        setGeneratedImage(result.imageDataUri);
        toast({
          title: "Success!",
          description: "Image generated successfully.",
        });
      } else {
        throw new Error("Image generation failed to return an image.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({
        title: "Error Generating Image",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error generating image:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    // Sanitize prompt for filename, or use a generic name
    const safePrompt = prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'generated';
    link.download = `gemini_alchemist_${safePrompt}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Image Downloaded",
      description: "The image has been saved to your device.",
    });
  };

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">Gemini Image Alchemist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-lg">Enter your image prompt:</Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A futuristic cityscape at sunset with flying cars"
            rows={4}
            className="resize-none text-base"
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
          onClick={handleGenerateImage}
          disabled={isLoading}
          className="w-full text-lg py-6"
          size="lg"
        >
          {isLoading ? (
            <>
              <LoadingSpinner className="mr-2 h-5 w-5" />
              Generating...
            </>
          ) : (
            "Generate Image"
          )}
        </Button>

        {generatedImage && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/30 shadow-inner">
            <h3 className="text-xl font-semibold mb-3 text-center">Generated Image:</h3>
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-md overflow-hidden border-2 border-primary">
              <Image
                src={generatedImage}
                alt={prompt || "Generated image"}
                layout="fill"
                objectFit="contain"
                data-ai-hint="abstract creative"
              />
            </div>
          </div>
        )}
      </CardContent>
      {generatedImage && (
        <CardFooter>
          <Button
            onClick={handleDownloadImage}
            variant="outline"
            className="w-full text-lg py-6 border-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Image
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
