import { useState, type ReactNode } from "react";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InstagramFrameProps {
  channelName?: string;
  channelHandle?: string;
  profileUrl?: string;
  /** Slide atual (1-based) para os dots */
  currentSlide: number;
  /** Total de slides */
  totalSlides: number;
  /** Texto da legenda para o "...mais" */
  caption?: string;
  /** Conteúdo do viewport (canvas) */
  children: ReactNode;
  /** Cor primária da marca para o dot ativo */
  accent?: string;
  className?: string;
}

export function InstagramFrame({
  channelName,
  channelHandle,
  profileUrl,
  currentSlide,
  totalSlides,
  caption,
  children,
  accent = "#E4B43C",
  className,
}: InstagramFrameProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const displayHandle = channelHandle?.startsWith("@")
    ? channelHandle.slice(1)
    : channelHandle ?? "seuhandle";
  const displayName = channelName || "Seu canal";
  const initial = (displayName || "?").slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border">
        <div
          className="h-8 w-8 rounded-full overflow-hidden grid place-items-center text-white text-xs font-display font-bold shrink-0"
          style={{ background: accent }}
        >
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight truncate">
            {displayHandle}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Patrocinado · {displayName}
          </p>
        </div>
        <button className="p-1 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Viewport */}
      <div className="relative bg-black aspect-[4/5] flex items-center justify-center select-none">
        {children}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 py-2.5">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-all"
            style={{
              background:
                i + 1 === currentSlide
                  ? accent
                  : "hsl(var(--muted-foreground) / 0.4)",
              transform: i + 1 === currentSlide ? "scale(1.15)" : "scale(1)",
            }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLiked((v) => !v)}
            className="text-foreground/80 hover:text-foreground"
          >
            <Heart
              className={cn(
                "h-6 w-6 transition-colors",
                liked && "fill-red-500 stroke-red-500"
              )}
            />
          </button>
          <button className="text-foreground/80 hover:text-foreground">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button className="text-foreground/80 hover:text-foreground">
            <Send className="h-6 w-6" />
          </button>
        </div>
        <button
          onClick={() => setSaved((v) => !v)}
          className="text-foreground/80 hover:text-foreground"
        >
          <Bookmark
            className={cn(
              "h-6 w-6 transition-colors",
              saved && "fill-foreground"
            )}
          />
        </button>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-xs leading-snug">
          <span className="font-semibold mr-1">{displayHandle}</span>
          <span className="text-foreground/80">
            {truncateForFeed(caption || "Sua legenda aparece aqui.")}
            {caption && caption.length > 120 && (
              <span className="text-muted-foreground"> ...mais</span>
            )}
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">
          Há 2 horas
        </p>
      </div>
    </div>
  );
}

function truncateForFeed(text: string, max = 120) {
  const oneLine = text.replace(/\n+/g, " ");
  return oneLine.length > max ? oneLine.slice(0, max).trimEnd() : oneLine;
}
