import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Instagram,
  Loader2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InstagramFrame } from "@/components/InstagramFrame";
import {
  renderCarouselSlide,
  downloadCanvasAsPNG,
  canvasToBlob,
  type CarouselSlide,
} from "@/utils/canvasRenderer";
import { cn } from "@/lib/utils";

interface CarouselPreviewProps {
  slides: CarouselSlide[];
  bgColor?: "white" | "black";
  filenamePrefix?: string;
  /** Legenda exibida no frame Instagram (campo "...mais") */
  captionMedium?: string;
  /** Cor primária para os dots do frame */
  accent?: string;
}

type ViewMode = "raw" | "instagram";

export function CarouselPreview({
  slides,
  bgColor,
  filenamePrefix = "carrossel",
  captionMedium,
  accent,
}: CarouselPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [zipState, setZipState] = useState<{
    busy: boolean;
    label: string;
  }>({ busy: false, label: "" });
  const [view, setView] = useState<ViewMode>("instagram");
  const [drag, setDrag] = useState<{ start: number; dx: number } | null>(null);

  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(slides.length - 1);
    }
  }, [slides.length, currentSlide]);

  // Renderiza o slide atual no canvas
  useEffect(() => {
    if (!canvasRef.current || slides.length === 0) return;
    let cancelled = false;
    (async () => {
      setIsRendering(true);
      try {
        const slide = slides[currentSlide] ?? slides[0];
        await renderCarouselSlide(
          {
            ...slide,
            bgColor: slide.bgColor ?? bgColor,
            slideNumber: currentSlide + 1,
            totalSlides: slides.length,
          },
          canvasRef.current!
        );
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Erro ao renderizar slide");
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSlide, slides, bgColor]);

  if (slides.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Nenhum slide gerado ainda.
      </Card>
    );
  }

  const goPrev = () => setCurrentSlide((c) => Math.max(0, c - 1));
  const goNext = () =>
    setCurrentSlide((c) => Math.min(slides.length - 1, c + 1));

  // Swipe / drag handlers (pointer events para touch + mouse)
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ start: e.clientX, dx: 0 });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ start: drag.start, dx: e.clientX - drag.start });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const threshold = 60;
    if (drag.dx < -threshold) goNext();
    else if (drag.dx > threshold) goPrev();
    setDrag(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  const onPointerCancel = () => setDrag(null);

  const handleDownloadSingle = () => {
    if (!canvasRef.current) return;
    downloadCanvasAsPNG(
      canvasRef.current,
      `${filenamePrefix}-slide-${currentSlide + 1}.png`
    );
    toast.success("Slide baixado!");
  };

  const handleDownloadZip = async () => {
    setZipState({ busy: true, label: "Iniciando..." });
    try {
      const zip = new JSZip();
      const folder = zip.folder("carrossel") ?? zip;
      for (let i = 0; i < slides.length; i++) {
        setZipState({
          busy: true,
          label: `Gerando slide ${i + 1}/${slides.length}…`,
        });
        const tmp = document.createElement("canvas");
        await renderCarouselSlide(
          {
            ...slides[i],
            bgColor: slides[i].bgColor ?? bgColor,
            slideNumber: i + 1,
            totalSlides: slides.length,
          },
          tmp
        );
        const blob = await canvasToBlob(tmp);
        folder.file(`slide-${String(i + 1).padStart(2, "0")}.png`, blob);
      }
      setZipState({ busy: true, label: "Compactando ZIP…" });
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${filenamePrefix}.zip`);
      toast.success("ZIP baixado!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar ZIP");
    } finally {
      setZipState({ busy: false, label: "" });
    }
  };

  const dx = drag?.dx ?? 0;
  const dragStyle: React.CSSProperties = drag
    ? {
        transform: `translateX(${dx}px) rotate(${dx * 0.02}deg)`,
        transition: "none",
      }
    : { transform: "translateX(0)", transition: "transform 250ms ease" };

  const canvasEl = (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full h-auto rounded-md pointer-events-none"
      style={{ aspectRatio: "4/5" }}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex bg-muted rounded-md p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("instagram")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-semibold inline-flex items-center gap-1.5",
              view === "instagram"
                ? "bg-brand-orange text-white"
                : "text-muted-foreground"
            )}
          >
            <Instagram className="h-3 w-3" /> Feed
          </button>
          <button
            type="button"
            onClick={() => setView("raw")}
            className={cn(
              "px-3 py-1.5 rounded-sm font-semibold inline-flex items-center gap-1.5",
              view === "raw"
                ? "bg-brand-orange text-white"
                : "text-muted-foreground"
            )}
          >
            <Maximize2 className="h-3 w-3" /> Canvas
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          1080×1350 · 4:5
        </span>
      </div>

      {view === "instagram" ? (
        <InstagramFrame
          channelName={slides[0]?.channelName}
          channelHandle={slides[0]?.channelHandle}
          profileUrl={slides[0]?.profileUrl}
          currentSlide={currentSlide + 1}
          totalSlides={slides.length}
          caption={captionMedium}
          accent={accent ?? slides[0]?.accent}
        >
          <div
            ref={wrapperRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className={cn(
              "w-full h-full grid place-items-center cursor-grab",
              drag && "cursor-grabbing"
            )}
            style={dragStyle}
          >
            {canvasEl}
          </div>
        </InstagramFrame>
      ) : (
        <Card className="p-3">
          <div
            ref={wrapperRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className={cn(
              "flex justify-center cursor-grab",
              drag && "cursor-grabbing"
            )}
            style={{ ...dragStyle, maxHeight: 720 }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-md shadow-2xl pointer-events-none"
              style={{ maxHeight: 720, aspectRatio: "4/5" }}
            />
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="icon"
          onClick={goPrev}
          disabled={currentSlide === 0 || isRendering}
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Slide {currentSlide + 1} de {slides.length}
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={goNext}
          disabled={currentSlide === slides.length - 1 || isRendering}
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleDownloadSingle}
          disabled={isRendering || zipState.busy}
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
              Baixar este slide
            </>
          )}
        </Button>
        <Button
          variant="gradient"
          onClick={handleDownloadZip}
          disabled={zipState.busy || isRendering}
          className="flex-1"
        >
          {zipState.busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {zipState.label}
            </>
          ) : (
            <>
              <FileArchive className="h-4 w-4 mr-2" />
              Baixar tudo (ZIP)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
