import { useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  renderStorySlide,
  downloadCanvasAsPNG,
  type StorySlide,
} from "@/utils/canvasRenderer";
import { sleep } from "@/lib/utils";

interface StoryPreviewProps {
  stories: StorySlide[];
  bgColor: "branco" | "preto";
  accentColor?: string;
  filenamePrefix?: string;
}

export function StoryPreview({
  stories,
  bgColor,
  accentColor,
  filenamePrefix = "story",
}: StoryPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStory, setCurrentStory] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || stories.length === 0) return;
    let cancelled = false;
    (async () => {
      setIsRendering(true);
      try {
        await renderStorySlide(
          {
            ...stories[currentStory],
            bgColor,
            accentColor,
          },
          canvasRef.current!
        );
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Erro ao renderizar story");
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStory, stories, bgColor, accentColor]);

  if (stories.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Nenhuma story gerada ainda.
      </Card>
    );
  }

  const handleDownload = () => {
    if (!canvasRef.current) return;
    downloadCanvasAsPNG(
      canvasRef.current,
      `${filenamePrefix}-${currentStory + 1}.png`
    );
    toast.success("Story baixada!");
  };

  const handleDownloadAll = async () => {
    setIsBulkDownloading(true);
    try {
      for (let i = 0; i < stories.length; i++) {
        const tmp = document.createElement("canvas");
        await renderStorySlide(
          { ...stories[i], bgColor, accentColor },
          tmp
        );
        downloadCanvasAsPNG(tmp, `${filenamePrefix}-${i + 1}.png`);
        await sleep(450);
      }
      toast.success("Todas as stories baixadas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao baixar stories");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-2xl"
            style={{ maxHeight: "720px", aspectRatio: "9/16" }}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCurrentStory(Math.max(0, currentStory - 1))}
          disabled={currentStory === 0 || isRendering}
          aria-label="Story anterior"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Story {currentStory + 1} de {stories.length}
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={() =>
            setCurrentStory(Math.min(stories.length - 1, currentStory + 1))
          }
          disabled={currentStory === stories.length - 1 || isRendering}
          aria-label="Próxima story"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleDownload}
          disabled={isRendering || isBulkDownloading}
          className="flex-1"
        >
          {isRendering ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Renderizando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Baixar esta story
            </>
          )}
        </Button>
        <Button
          variant="gradient"
          onClick={handleDownloadAll}
          disabled={isBulkDownloading || isRendering}
          className="flex-1"
        >
          {isBulkDownloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Baixando todas...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Baixar todas ({stories.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
