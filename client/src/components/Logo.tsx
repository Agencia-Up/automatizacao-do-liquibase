import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * "mark" → recorta só o símbolo (cérebro+cruz+livro).
   * "full" → logo completo com texto LOGOS|IA.
   */
  variant?: "mark" | "full";
  className?: string;
  /** Altura em px (mantém aspect ratio). */
  size?: number;
  alt?: string;
}

const LOGO_SRC = "/logo.png";

/**
 * Logo da Logos|IA.
 *
 * Carrega o arquivo `/public/logo.png`. Trocar o logo = substituir o arquivo.
 *
 * - `full`: exibe o PNG inteiro
 * - `mark`: recorta apenas a metade superior (símbolo), zoom 1.7x
 */
export function Logo({
  variant = "full",
  className,
  size,
  alt = "Logos | IA",
}: LogoProps) {
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(LOGO_SRC, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setExists(res.ok);
      })
      .catch(() => {
        if (!cancelled) setExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (exists === false) {
    return <FallbackLogo variant={variant} className={className} size={size} />;
  }

  if (variant === "mark") {
    // O símbolo (cérebro+cruz+livro) ocupa ~os 60% superiores do PNG
    const boxSize = size ?? 40;
    return (
      <div
        className={cn(
          "relative overflow-hidden shrink-0 rounded-lg",
          className
        )}
        style={{
          height: boxSize,
          width: boxSize,
          aspectRatio: "1 / 1",
          background: "#0C0C3C",
        }}
      >
        <img
          src={LOGO_SRC}
          alt={alt}
          draggable={false}
          className="absolute select-none pointer-events-none"
          style={{
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            height: `${boxSize * 1.7}px`,
            width: "auto",
            maxWidth: "none",
          }}
        />
      </div>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      style={size ? { height: size, width: "auto" } : undefined}
      className={cn("inline-block select-none", className)}
      draggable={false}
    />
  );
}

function FallbackLogo({
  variant,
  className,
  size,
}: {
  variant: "mark" | "full";
  className?: string;
  size?: number;
}) {
  if (variant === "full") {
    return (
      <svg
        viewBox="0 0 320 96"
        className={className}
        style={size ? { height: size, width: "auto" } : undefined}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="320" height="96" rx="12" fill="#0C0C3C" />
        <g fill="#0C84CC">
          <circle cx="40" cy="32" r="3" />
          <circle cx="32" cy="44" r="2.5" />
          <circle cx="44" cy="52" r="2.5" />
        </g>
        <g fill="#E4B43C">
          <circle cx="64" cy="32" r="3" />
          <circle cx="72" cy="44" r="2.5" />
          <circle cx="60" cy="52" r="2.5" />
        </g>
        <line
          x1="52"
          y1="20"
          x2="52"
          y2="64"
          stroke="#FCCC54"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1="42"
          y1="40"
          x2="62"
          y2="40"
          stroke="#FCCC54"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <text
          x="102"
          y="58"
          fontSize="34"
          fontWeight="700"
          letterSpacing="3"
          fontFamily="Sora, system-ui, sans-serif"
          fill="#FCFCFC"
        >
          LOGOS
        </text>
        <text
          x="232"
          y="58"
          fontSize="34"
          fontWeight="700"
          fontFamily="Sora, system-ui, sans-serif"
          fill="#E4B43C"
        >
          |
        </text>
        <text
          x="248"
          y="58"
          fontSize="34"
          fontWeight="700"
          letterSpacing="3"
          fontFamily="Sora, system-ui, sans-serif"
          fill="#E4B43C"
        >
          IA
        </text>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      style={size ? { height: size, width: "auto" } : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="#0C0C3C" />
      <g fill="#0C84CC">
        <circle cx="18" cy="20" r="2" />
        <circle cx="14" cy="30" r="1.6" />
        <circle cx="20" cy="36" r="1.6" />
      </g>
      <g fill="#E4B43C">
        <circle cx="46" cy="20" r="2" />
        <circle cx="50" cy="30" r="1.6" />
        <circle cx="44" cy="36" r="1.6" />
      </g>
      <line
        x1="32"
        y1="12"
        x2="32"
        y2="48"
        stroke="#FCCC54"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="26"
        x2="40"
        y2="26"
        stroke="#FCCC54"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path
        d="M14 52 Q32 48 50 52 L48 56 Q32 52 16 56 Z"
        fill="#E4B43C"
        opacity="0.85"
      />
    </svg>
  );
}
