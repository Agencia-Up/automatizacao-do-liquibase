/**
 * Pares tipográficos do Google Fonts — 8 combos com perfis distintos.
 * Cada par define a fonte de display (títulos) e a de body (texto/UI).
 */

export type FontPairId =
  | "editorial"
  | "moderno"
  | "acolhedor"
  | "tecnico"
  | "expressivo"
  | "classico"
  | "bold"
  | "artistico";

export interface FontPair {
  id: FontPairId;
  label: string;
  description: string;
  display: string;
  body: string;
  /** Spec do Google Fonts em URL-friendly format */
  googleFontsHref: string;
}

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  editorial: {
    id: "editorial",
    label: "Editorial sofisticado",
    description: "Playfair Display + DM Sans",
    display: "Playfair Display",
    body: "DM Sans",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap",
  },
  moderno: {
    id: "moderno",
    label: "Moderno limpo",
    description: "Plus Jakarta Sans",
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  },
  acolhedor: {
    id: "acolhedor",
    label: "Acolhedor humano",
    description: "Lora + Nunito Sans",
    display: "Lora",
    body: "Nunito Sans",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap",
  },
  tecnico: {
    id: "tecnico",
    label: "Técnico minimalista",
    description: "Space Grotesk",
    display: "Space Grotesk",
    body: "Space Grotesk",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  },
  expressivo: {
    id: "expressivo",
    label: "Expressivo contemporâneo",
    description: "Fraunces + Outfit",
    display: "Fraunces",
    body: "Outfit",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700;800&family=Outfit:wght@400;500;600;700&display=swap",
  },
  classico: {
    id: "classico",
    label: "Clássico confiável",
    description: "Libre Baskerville + Work Sans",
    display: "Libre Baskerville",
    body: "Work Sans",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Work+Sans:wght@400;500;600;700&display=swap",
  },
  bold: {
    id: "bold",
    label: "Bold provocador",
    description: "Anton + Inter",
    display: "Anton",
    body: "Inter",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&display=swap",
  },
  artistico: {
    id: "artistico",
    label: "Artístico contemporâneo",
    description: "Cormorant Garamond + Manrope",
    display: "Cormorant Garamond",
    body: "Manrope",
    googleFontsHref:
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap",
  },
};

export const FONT_PAIR_IDS = Object.keys(FONT_PAIRS) as FontPairId[];

/**
 * Garante que o <link> do par de fontes esteja injetado no <head>.
 * Idempotente — uma chamada por par, máximo.
 */
export function ensureFontPairLoaded(pairId: FontPairId): void {
  if (typeof document === "undefined") return;
  const pair = FONT_PAIRS[pairId];
  if (!pair) return;
  const linkId = `font-pair-${pairId}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = pair.googleFontsHref;
  document.head.appendChild(link);
}

/** Aguarda as fontes do par ficarem prontas (`document.fonts.ready`). */
export async function waitFontPairReady(pairId: FontPairId): Promise<void> {
  ensureFontPairLoaded(pairId);
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await document.fonts.ready;
  } catch {
    /* ignore */
  }
}
