/**
 * Sistema de cores da marca — 8 tokens derivados de uma cor primária.
 * Inclui validação de contraste WCAG AA.
 */

export interface BrandTokens {
  primary: string;
  light: string;
  dark: string;
  muted: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  darkBg: string;
  darkBorder: string;
  darkText: string;
}

/**
 * Deriva os 8 tokens da marca a partir de uma cor primária (hex).
 * Aplica também tonalidade sutil da marca aos fundos light/dark.
 */
export function deriveBrandTokens(primaryHex: string): BrandTokens {
  const primary = normalizeHex(primaryHex);
  const { h, s } = hexToHsl(primary);

  // BRAND_LIGHT — clareada ~20%
  const light = hslToHex(h, clamp(s * 0.85, 0, 1), 0.72);
  // BRAND_DARK — escurecida ~30%
  const dark = hslToHex(h, clamp(s * 0.9, 0, 1), 0.28);
  // BRAND_MUTED — dessaturada ~40%
  const muted = hslToHex(h, clamp(s * 0.5, 0, 1), 0.55);

  // LIGHT_BG — off-white com leve tint da marca (NUNCA #fff puro)
  const lightBg = hslToHex(h, Math.min(0.08, s * 0.15), 0.975);
  // LIGHT_BORDER — 1 tom mais escuro que LIGHT_BG
  const lightBorder = hslToHex(h, Math.min(0.1, s * 0.2), 0.9);
  // LIGHT_TEXT — quase preto com leve tint
  const lightText = hslToHex(h, Math.min(0.1, s * 0.2), 0.08);

  // DARK_BG — quase-preto com leve tint da marca
  const darkBg = hslToHex(h, Math.min(0.18, s * 0.3), 0.06);
  // DARK_BORDER — 1 tom mais claro que DARK_BG
  const darkBorder = hslToHex(h, Math.min(0.18, s * 0.3), 0.14);
  // DARK_TEXT — quase branco com leve tint
  const darkText = hslToHex(h, Math.min(0.08, s * 0.15), 0.97);

  return {
    primary,
    light,
    dark,
    muted,
    lightBg,
    lightBorder,
    lightText,
    darkBg,
    darkBorder,
    darkText,
  };
}

/**
 * Gradiente da marca para slides hero/CTA.
 * CSS: linear-gradient(165deg, BRAND_DARK 0%, BRAND_PRIMARY 50%, BRAND_LIGHT 100%)
 */
export function brandGradientStops(tokens: BrandTokens): {
  stops: Array<{ offset: number; color: string }>;
  angleDeg: number;
} {
  return {
    angleDeg: 165,
    stops: [
      { offset: 0, color: tokens.dark },
      { offset: 0.5, color: tokens.primary },
      { offset: 1, color: tokens.light },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// WCAG AA — Contrast Ratio
// ──────────────────────────────────────────────────────────────────────────

/** Razão de contraste WCAG (1..21). 4.5 = AA normal, 3.0 = AA grande. */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WcagResult = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
};

export function checkWcag(foreground: string, background: string): WcagResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3.0,
  };
}

/** Escolhe automaticamente foreground (branco ou quase-preto) sobre fundo. */
export function pickTextOn(
  background: string,
  tokens: BrandTokens
): string {
  const onLight = contrastRatio(tokens.lightText, background);
  const onDark = contrastRatio(tokens.darkText, background);
  return onLight >= onDark ? tokens.lightText : tokens.darkText;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const norm = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

// ──────────────────────────────────────────────────────────────────────────
// hex ↔ HSL ↔ RGB
// ──────────────────────────────────────────────────────────────────────────

export function normalizeHex(input: string): string {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(input.trim());
  if (!m) return "#E4B43C";
  let v = m[1];
  if (v.length === 3)
    v = v
      .split("")
      .map((c) => c + c)
      .join("");
  return `#${v.toUpperCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = normalizeHex(hex).slice(1);
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
