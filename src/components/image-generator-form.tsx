
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { generateImage, type GenerateImageInput } from "@/ai/flows/generate-image-from-prompt";
import { removeImageBackground, type RemoveImageBackgroundInput } from "@/ai/flows/remove-image-background-flow";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Download } from "lucide-react";

export function ImageGeneratorForm() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
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
    setProcessedImageUri(null);

    try {
      const input: GenerateImageInput = { prompt };
      const result = await generateImage(input);

      if (result.imageDataUri) {
        setGeneratedImage(result.imageDataUri);
        toast({
          title: "Original Image Generated!",
          description: "Successfully created the initial image.",
        });

        if (removeBg) {
          setIsRemovingBg(true);
          try {
            const bgRemovalInput: RemoveImageBackgroundInput = { imageDataUri: result.imageDataUri };
            const bgRemovalResult = await removeImageBackground(bgRemovalInput);
            if (bgRemovalResult.processedImageDataUri) {
              setProcessedImageUri(bgRemovalResult.processedImageDataUri);
              toast({
                title: "Background Removed!",
                description: "Image background made transparent.",
              });
            } else {
              throw new Error("Background removal did not return an image.");
            }
          } catch (bgErr) {
            const bgErrorMessage = bgErr instanceof Error ? bgErr.message : "Unknown error during background removal.";
            setError(`Original image generated, but background removal failed: ${bgErrorMessage}`);
            toast({
              title: "Background Removal Error",
              description: bgErrorMessage,
              variant: "destructive",
            });
            console.error("Error removing background:", bgErr);
          } finally {
            setIsRemovingBg(false);
          }
        }
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
      setIsLoading(false); // Handles loading from initial generation
    }
  };

  const handleDownloadImage = () => {
    const imageToDownload = processedImageUri || generatedImage;
    if (!imageToDownload) return;

    const img = new window.Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const link = document.createElement("a");
      link.href = imageToDownload;
      
      const safePrompt = prompt.substring(0, 25).replace(/[^a-zA-Z0-9_]/g, '_').replace(/_{2,}/g, '_').trim() || 'generated_image';
      const bgStatus = processedImageUri ? '_no_bg' : '';
      const dimensions = `_${width}x${height}`;
      const timestamp = Date.now();
      
      link.download = `gemini_alchemist_${safePrompt}${bgStatus}${dimensions}_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Image Downloaded",
        description: "The image has been saved to your device.",
      });
    };
    img.onerror = () => {
      toast({
        title: "Download Error",
        description: "Could not load image to determine dimensions. Downloading with generic name.",
        variant: "destructive",
      });
      const link = document.createElement("a");
      link.href = imageToDownload;
      const safePrompt = prompt.substring(0, 25).replace(/[^a-zA-Z0-9_]/g, '_').replace(/_{2,}/g, '_').trim() || 'generated_image';
      const bgStatus = processedImageUri ? '_no_bg' : '';
      const timestamp = Date.now();
      link.download = `gemini_alchemist_${safePrompt}${bgStatus}_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = imageToDownload;
  };
  
  const displayImage = processedImageUri || generatedImage;

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
            disabled={isLoading || isRemovingBg}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="remove-bg"
            checked={removeBg}
            onCheckedChange={(checked) => setRemoveBg(Boolean(checked))}
            disabled={isLoading || isRemovingBg}
          />
          <Label htmlFor="remove-bg" className="text-sm font-medium cursor-pointer">
            Remove background (transparent PNG)
          </Label>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerateImage}
          disabled={isLoading || isRemovingBg}
          className="w-full text-lg py-6"
          size="lg"
        >
          {isLoading ? (
            <> <LoadingSpinner className="mr-2 h-5 w-5" /> Generating...</>
          ) : isRemovingBg ? (
            <> <LoadingSpinner className="mr-2 h-5 w-5" /> Removing Background...</>
          ) : (
            "Generate Image"
          )}
        </Button>

        {displayImage && (
          <div className="mt-6 p-4 border rounded-lg bg-muted/30 shadow-inner">
            <h3 className="text-xl font-semibold mb-3 text-center">Generated Image:</h3>
            <div className="relative aspect-square w-full max-w-md mx-auto rounded-md overflow-hidden border-2 border-primary">
              <Image
                src={displayImage}
                alt={prompt || "Generated image"}
                layout="fill"
                objectFit="contain"
                data-ai-hint="creative abstract"
              />
            </div>
          </div>
        )}
      </CardContent>
      {displayImage && (
        <CardFooter>
          <Button
            onClick={handleDownloadImage}
            variant="outline"
            className="w-full text-lg py-6 border-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground"
            size="lg"
            disabled={isRemovingBg} // Disable download if background removal is in progress
          >
            <Download className="mr-2 h-5 w-5" />
            Download Image
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
