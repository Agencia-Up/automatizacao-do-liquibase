/**
 * Canvas Renderer — carrosséis Instagram 4:5 (1080×1350) e stories 9:16
 * (1080×1920). Sistema de cores baseado em 8 tokens derivados, três modos
 * de fundo (light / dark / gradient) e tipografia editorial.
 */

import {
  deriveBrandTokens,
  pickTextOn,
  type BrandTokens,
} from "./colorTokens.js";
import type { BgMode } from "./templates.js";

// ──────────────────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────────────────

export const CAROUSEL_W = 1080;
export const CAROUSEL_H = 1350;
export const STORY_W = 1080;
export const STORY_H = 1920;

/** Safe zones (px) */
const SAFE_TOP = 80;
const SAFE_BOTTOM = 100;
const SAFE_SIDE = 60;

/** Escala tipográfica (px sobre canvas 1080×1350) */
const FS = {
  hero: 64,
  title: 44,
  subtitle: 24,
  body: 20,
  tag: 14,
  number: 84,
  caption: 14,
  ctaButton: 18,
  meta: 16,
};

// ──────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────

export type CarouselSlideType = "cover" | "middle" | "cta";

/** Tipos de componente especializado para slides intermediários. */
export type SlideComponent =
  | "default"
  | "metric"
  | "quote"
  | "steps";

export interface CarouselSlide {
  /** Tipo lógico do slide (compat antigo) */
  type?: CarouselSlideType;
  /** Modo de fundo deste slide (do template). Sobrescreve `bgColor`. */
  bgMode?: BgMode;
  /** Componente visual especializado (default = título + body) */
  component?: SlideComponent;
  /** Etiqueta exibida acima do título */
  tag?: string;
  /** Conteúdo */
  headline: string;
  body?: string;
  /** Dados extra para componentes (quote.author, metric.label, steps[]) */
  metric?: { value: string; label?: string };
  quote?: { text: string; author?: string };
  steps?: Array<{ title: string; description?: string }>;
  /** Imagem usada na capa como fundo decorativo */
  coverUrl?: string;
  /** Avatar circular do perfil */
  profileUrl?: string;
  channelName?: string;
  channelHandle?: string;
  ctaText?: string;
  /** Compat com versão antiga: branco/preto global */
  bgColor?: "white" | "black";
  /** Cor primária da marca (gera os 8 tokens) */
  accent?: string;
  /** Cor secundária (compat — usada como BRAND_LIGHT se fornecida) */
  accent2?: string;
  /** Família de fonte de display (títulos). Default: Sora */
  displayFont?: string;
  /** Família de fonte de body (texto). Default: Nunito */
  bodyFont?: string;
  slideNumber?: number;
  totalSlides?: number;
}

export interface StorySlide {
  headline: string;
  body?: string;
  emoji?: string;
  bgColor?: "branco" | "preto";
  accentColor?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Carrossel — entrypoint
// ──────────────────────────────────────────────────────────────────────────

export async function renderCarouselSlide(
  slide: CarouselSlide,
  canvas: HTMLCanvasElement | OffscreenCanvas
): Promise<void> {
  canvas.width = CAROUSEL_W;
  canvas.height = CAROUSEL_H;
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("Canvas 2D context not available");

  const tokens = deriveBrandTokens(slide.accent || "#E4B43C");
  const bgMode: BgMode = slide.bgMode ?? inferLegacyBgMode(slide);
  const fonts: Fonts = {
    display: slide.displayFont || "Sora",
    body: slide.bodyFont || "Nunito",
  };

  // pintar fundo
  paintBackground(ctx, bgMode, tokens, slide.coverUrl);
  if (slide.coverUrl && bgMode === "light") {
    await drawCoverBackground(ctx, slide.coverUrl);
  }

  // texto principal: cor adaptada
  const fg = textColorFor(bgMode, tokens);

  // logo / marca (canto superior para slides 1 e último)
  const isFirst = slide.slideNumber === 1;
  const isLast =
    slide.totalSlides !== undefined && slide.slideNumber === slide.totalSlides;
  if (isFirst || isLast) {
    await drawBrandMark(ctx, slide, fg, tokens, fonts);
  }

  // numeração "01/07" pequena no canto (slides intermediários)
  if (!isFirst && !isLast && slide.slideNumber && slide.totalSlides) {
    drawCornerNumber(ctx, slide.slideNumber, slide.totalSlides, fg, fonts);
  }

  // tag uppercase (slides intermediários)
  if (slide.tag && !isFirst && !isLast) {
    drawTag(ctx, slide.tag, fg, tokens, bgMode, fonts);
  }

  // conteúdo
  if (isLast) {
    await drawCTAContent(ctx, slide, tokens, fonts);
  } else if (isFirst) {
    drawHeroContent(ctx, slide, fg, tokens, bgMode, fonts);
  } else {
    switch (slide.component) {
      case "metric":
        drawMetricSlide(ctx, slide, fg, tokens, fonts);
        break;
      case "quote":
        drawQuoteSlide(ctx, slide, fg, tokens, fonts);
        break;
      case "steps":
        drawStepsSlide(ctx, slide, fg, tokens, fonts);
        break;
      default:
        drawBodyContent(ctx, slide, fg, tokens, fonts);
    }
  }

  // chevron de swipe (todos exceto último)
  if (!isLast) drawChevronHint(ctx, fg);

  // barra de progresso (todos)
  if (slide.slideNumber && slide.totalSlides) {
    drawProgressBar(
      ctx,
      slide.slideNumber,
      slide.totalSlides,
      bgMode,
      tokens,
      fonts
    );
  }
}

interface Fonts {
  display: string;
  body: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Fundo
// ──────────────────────────────────────────────────────────────────────────

function paintBackground(
  ctx: Ctx,
  mode: BgMode,
  tokens: BrandTokens,
  coverUrl?: string
) {
  if (mode === "gradient") {
    const grad = ctx.createLinearGradient(0, 0, CAROUSEL_W, CAROUSEL_H);
    // 165° gradient: aproxima a direção do CSS linear-gradient(165deg, …)
    const angleRad = ((165 - 90) * Math.PI) / 180;
    const cx = CAROUSEL_W / 2;
    const cy = CAROUSEL_H / 2;
    const r = Math.max(CAROUSEL_W, CAROUSEL_H);
    const x0 = cx - Math.cos(angleRad) * r;
    const y0 = cy - Math.sin(angleRad) * r;
    const x1 = cx + Math.cos(angleRad) * r;
    const y1 = cy + Math.sin(angleRad) * r;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, tokens.dark);
    g.addColorStop(0.5, tokens.primary);
    g.addColorStop(1, tokens.light);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H);
    return;
  }

  if (mode === "dark") {
    ctx.fillStyle = tokens.darkBg;
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H);
    // textura sutil: aro radial top-right
    const radial = ctx.createRadialGradient(
      CAROUSEL_W,
      0,
      0,
      CAROUSEL_W,
      0,
      CAROUSEL_W * 0.8
    );
    radial.addColorStop(0, hexToRgba(tokens.primary, 0.08));
    radial.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H);
    return;
  }

  // light
  if (coverUrl) {
    // a imagem é pintada depois por drawCoverBackground
    return;
  }
  ctx.fillStyle = tokens.lightBg;
  ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H);
}

async function drawCoverBackground(ctx: Ctx, url: string) {
  try {
    const img = await loadImage(url);
    drawCoverFill(ctx, img, 0, 0, CAROUSEL_W, CAROUSEL_H);
    const overlay = ctx.createLinearGradient(0, 0, 0, CAROUSEL_H);
    overlay.addColorStop(0, "rgba(0,0,0,0.05)");
    overlay.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, CAROUSEL_W, CAROUSEL_H);
  } catch {
    // ignora
  }
}

function textColorFor(mode: BgMode, tokens: BrandTokens): string {
  if (mode === "light") return tokens.lightText;
  return tokens.darkText; // dark e gradient usam texto claro
}

// ──────────────────────────────────────────────────────────────────────────
// Marca / logo
// ──────────────────────────────────────────────────────────────────────────

async function drawBrandMark(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  tokens: BrandTokens,
  fonts: Fonts
) {
  const x = SAFE_SIDE;
  const y = SAFE_TOP - 20;

  await drawCircleAvatar(
    ctx,
    x + 24,
    y + 24,
    24,
    slide.profileUrl,
    slide.channelName ?? "?",
    tokens.primary,
    fonts
  );

  if (slide.channelName) {
    setFont(ctx, FS.meta, "700", fonts.display);
    ctx.fillStyle = fg;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(slide.channelName, x + 60, y + 16);
  }
  if (slide.channelHandle) {
    setFont(ctx, FS.caption, "500", fonts.body);
    ctx.fillStyle = withAlpha(fg, 0.6);
    ctx.fillText(slide.channelHandle, x + 60, y + 36);
  }
}

function drawCornerNumber(
  ctx: Ctx,
  cur: number,
  total: number,
  fg: string,
  fonts: Fonts
) {
  const text = `${pad(cur)}/${pad(total)}`;
  setFont(ctx, FS.caption, "700", fonts.display);
  ctx.fillStyle = withAlpha(fg, 0.45);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(text, CAROUSEL_W - SAFE_SIDE, SAFE_TOP - 20);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ──────────────────────────────────────────────────────────────────────────
// Tag
// ──────────────────────────────────────────────────────────────────────────

function drawTag(
  ctx: Ctx,
  tag: string,
  fg: string,
  tokens: BrandTokens,
  mode: BgMode,
  fonts: Fonts
) {
  // fg parameter kept for API symmetry (no use after color override below)
  void fg;
  setFont(ctx, FS.tag, "800", fonts.display);
  const color =
    mode === "light"
      ? tokens.primary
      : mode === "dark"
        ? tokens.light
        : "rgba(255,255,255,0.85)";
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // letter-spacing 2px simulado via spaces
  const spaced = tag.split("").join("  ");
  ctx.fillText(spaced.toUpperCase(), SAFE_SIDE, SAFE_TOP + 32);
}

// ──────────────────────────────────────────────────────────────────────────
// Conteúdo — Hero / Body / CTA
// ──────────────────────────────────────────────────────────────────────────

function drawHeroContent(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  tokens: BrandTokens,
  mode: BgMode,
  fonts: Fonts
) {
  const useShadow = !!slide.coverUrl && mode === "light";
  const heroColor = slide.coverUrl ? "#FFFFFF" : fg;

  setFont(ctx, FS.hero, "800", fonts.display);
  ctx.fillStyle = heroColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const maxWidth = CAROUSEL_W - SAFE_SIDE * 2;
  const lines = wrapText(ctx, slide.headline, maxWidth);

  // posicionamento: vertical center entre safe top + marca e safe bottom + progress
  const topArea = SAFE_TOP + 60;
  const bottomArea = CAROUSEL_H - SAFE_BOTTOM - 80;
  const totalLines = lines.length;
  const lineHeight = FS.hero * 1.05;
  const blockH = totalLines * lineHeight;
  let y = Math.max(topArea, (topArea + bottomArea - blockH) / 2);

  for (const line of lines) {
    if (useShadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 2;
      ctx.fillText(line, SAFE_SIDE, y);
      ctx.restore();
    } else {
      ctx.fillText(line, SAFE_SIDE, y);
    }
    y += lineHeight;
  }

  // underline curto de marca
  drawRoundedRect(
    ctx,
    SAFE_SIDE,
    y + 16,
    96,
    8,
    4,
    tokens.primary
  );

  // body opcional como subtítulo
  if (slide.body) {
    setFont(ctx, FS.subtitle, "500", fonts.body);
    ctx.fillStyle = withAlpha(heroColor, 0.72);
    const bodyLines = wrapText(ctx, slide.body, maxWidth);
    let by = y + 56;
    for (const line of bodyLines) {
      ctx.fillText(line, SAFE_SIDE, by);
      by += FS.subtitle * 1.4;
    }
  }
}

function drawBodyContent(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  _tokens: BrandTokens,
  fonts: Fonts
) {
  const maxWidth = CAROUSEL_W - SAFE_SIDE * 2;
  // título
  setFont(ctx, FS.title, "700", fonts.display);
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const titleY = SAFE_TOP + 90; // abaixo da tag
  const lines = wrapText(ctx, slide.headline, maxWidth);
  let y = titleY;
  const lh = FS.title * 1.12;
  for (const line of lines) {
    ctx.fillText(line, SAFE_SIDE, y);
    y += lh;
  }

  // body
  if (slide.body) {
    y += 24;
    setFont(ctx, FS.body, "400", fonts.body);
    ctx.fillStyle = withAlpha(fg, 0.78);
    const bodyLines = wrapText(ctx, slide.body, maxWidth);
    const bodyLh = FS.body * 1.5;
    for (const line of bodyLines) {
      ctx.fillText(line, SAFE_SIDE, y);
      y += bodyLh;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Componentes especializados
// ──────────────────────────────────────────────────────────────────────────

function drawMetricSlide(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  tokens: BrandTokens,
  fonts: Fonts
) {
  const cx = CAROUSEL_W / 2;
  const value =
    slide.metric?.value || slide.headline.split(" ")[0] || "100%";
  const label =
    slide.metric?.label ||
    slide.headline.split(" ").slice(1).join(" ") ||
    slide.body ||
    "";

  // número gigante centralizado
  setFont(ctx, FS.number * 1.6, "800", fonts.display);
  ctx.fillStyle = tokens.primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, cx, CAROUSEL_H / 2 - 80);

  // barra decorativa
  drawRoundedRect(ctx, cx - 80, CAROUSEL_H / 2 + 30, 160, 6, 3, tokens.primary);

  // label embaixo
  setFont(ctx, FS.title, "700", fonts.display);
  ctx.fillStyle = fg;
  const labelLines = wrapText(ctx, label, CAROUSEL_W - SAFE_SIDE * 2);
  let y = CAROUSEL_H / 2 + 90;
  for (const line of labelLines) {
    ctx.fillText(line, cx, y);
    y += FS.title * 1.2;
  }
}

function drawQuoteSlide(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  tokens: BrandTokens,
  fonts: Fonts
) {
  const maxWidth = CAROUSEL_W - SAFE_SIDE * 2 - 60;
  const quoteText = slide.quote?.text || slide.body || slide.headline;
  const author = slide.quote?.author || slide.channelName || "";

  // aspas gigante
  setFont(ctx, 220, "800", fonts.display);
  ctx.fillStyle = withAlpha(tokens.primary, 0.25);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("“", SAFE_SIDE, SAFE_TOP + 60);

  // barra lateral
  drawRoundedRect(
    ctx,
    SAFE_SIDE,
    SAFE_TOP + 280,
    8,
    220,
    4,
    tokens.primary
  );

  // texto da citação
  setFont(ctx, FS.title, "600", fonts.display);
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const lines = wrapText(ctx, quoteText, maxWidth);
  let y = SAFE_TOP + 300;
  const lh = FS.title * 1.25;
  for (const line of lines) {
    ctx.fillText(line, SAFE_SIDE + 36, y);
    y += lh;
  }

  // autor
  if (author) {
    setFont(ctx, FS.subtitle, "700", fonts.body);
    ctx.fillStyle = tokens.primary;
    ctx.fillText(`— ${author}`, SAFE_SIDE + 36, y + 20);
  }
}

function drawStepsSlide(
  ctx: Ctx,
  slide: CarouselSlide,
  fg: string,
  tokens: BrandTokens,
  fonts: Fonts
) {
  const steps =
    slide.steps && slide.steps.length > 0
      ? slide.steps
      : (slide.body
          ? slide.body
              .split(/[\n;]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .map((title, i) => ({ title: `Passo ${i + 1}: ${title}` }))
          : [{ title: slide.headline }]);

  // título do slide
  setFont(ctx, FS.title, "700", fonts.display);
  ctx.fillStyle = fg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const titleLines = wrapText(
    ctx,
    slide.headline,
    CAROUSEL_W - SAFE_SIDE * 2
  );
  let y = SAFE_TOP + 90;
  for (const line of titleLines) {
    ctx.fillText(line, SAFE_SIDE, y);
    y += FS.title * 1.12;
  }
  y += 30;

  // até 4 passos
  const visible = steps.slice(0, 4);
  const itemH = Math.min(110, (CAROUSEL_H - y - SAFE_BOTTOM - 80) / visible.length);
  for (let i = 0; i < visible.length; i++) {
    const step = visible[i];
    const number = String(i + 1).padStart(2, "0");

    // número grande
    setFont(ctx, FS.number * 0.9, "300", fonts.display);
    ctx.fillStyle = tokens.primary;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(number, SAFE_SIDE, y);

    // título do passo
    setFont(ctx, FS.subtitle, "700", fonts.display);
    ctx.fillStyle = fg;
    const tLines = wrapText(
      ctx,
      step.title,
      CAROUSEL_W - SAFE_SIDE * 2 - 130
    );
    let py = y + 4;
    for (const l of tLines.slice(0, 2)) {
      ctx.fillText(l, SAFE_SIDE + 130, py);
      py += FS.subtitle * 1.2;
    }
    // descrição
    if (step.description) {
      setFont(ctx, FS.body, "400", fonts.body);
      ctx.fillStyle = withAlpha(fg, 0.7);
      const dLines = wrapText(
        ctx,
        step.description,
        CAROUSEL_W - SAFE_SIDE * 2 - 130
      );
      for (const l of dLines.slice(0, 1)) {
        ctx.fillText(l, SAFE_SIDE + 130, py);
        py += FS.body * 1.3;
      }
    }
    // separador
    if (i < visible.length - 1) {
      ctx.strokeStyle = withAlpha(fg, 0.15);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(SAFE_SIDE, y + itemH - 8);
      ctx.lineTo(CAROUSEL_W - SAFE_SIDE, y + itemH - 8);
      ctx.stroke();
    }
    y += itemH;
  }
}

async function drawCTAContent(
  ctx: Ctx,
  slide: CarouselSlide,
  tokens: BrandTokens,
  fonts: Fonts
) {
  // CTA fica sobre gradient — texto branco
  const maxWidth = CAROUSEL_W - SAFE_SIDE * 2;
  // avatar grande
  const cx = CAROUSEL_W / 2;
  const avatarY = SAFE_TOP + 160;
  const r = 96;
  await drawCircleAvatar(
    ctx,
    cx,
    avatarY,
    r,
    slide.profileUrl,
    slide.channelName ?? "?",
    "#FFFFFF",
    fonts
  );
  // borda
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, avatarY, r + 10, 0, Math.PI * 2);
  ctx.stroke();

  // nome
  if (slide.channelName) {
    setFont(ctx, FS.title, "800", fonts.display);
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(slide.channelName, cx, avatarY + r + 60);
  }
  if (slide.channelHandle) {
    setFont(ctx, FS.subtitle, "500", fonts.body);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(slide.channelHandle, cx, avatarY + r + 100);
  }

  // CTA principal
  const ctaText = slide.ctaText?.trim() || slide.headline.trim() || "Vem comigo!";
  setFont(ctx, FS.hero, "800", fonts.display);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ctaLines = wrapText(ctx, ctaText, maxWidth);
  let y = avatarY + r + 200;
  const lh = FS.hero * 1.1;
  for (const line of ctaLines) {
    ctx.fillText(line, cx, y);
    y += lh;
  }

  // botão "Seguir"
  const btnW = 220;
  const btnH = 64;
  const btnX = (CAROUSEL_W - btnW) / 2;
  const btnY = CAROUSEL_H - SAFE_BOTTOM - 80;
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 32, "#FFFFFF");
  setFont(ctx, FS.ctaButton, "800", fonts.display);
  ctx.fillStyle = tokens.dark;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Seguir", cx, btnY + btnH / 2);
}

// ──────────────────────────────────────────────────────────────────────────
// Barra de progresso + chevron
// ──────────────────────────────────────────────────────────────────────────

function drawProgressBar(
  ctx: Ctx,
  cur: number,
  total: number,
  mode: BgMode,
  tokens: BrandTokens,
  fonts: Fonts
) {
  const trackColor =
    mode === "light"
      ? "rgba(0,0,0,0.08)"
      : mode === "dark"
        ? "rgba(255,255,255,0.12)"
        : "rgba(255,255,255,0.25)";
  const fillColor =
    mode === "light" ? tokens.primary : "#FFFFFF";

  const y = CAROUSEL_H - 56;
  const counterW = 56;
  const trackX = SAFE_SIDE;
  const trackW = CAROUSEL_W - SAFE_SIDE * 2 - counterW - 16;
  const trackH = 6;
  drawRoundedRect(ctx, trackX, y, trackW, trackH, 3, trackColor);
  const fillW = (trackW * cur) / total;
  drawRoundedRect(ctx, trackX, y, fillW, trackH, 3, fillColor);

  // contador
  setFont(ctx, FS.tag, "700", fonts.display);
  ctx.fillStyle =
    mode === "light" ? withAlpha(tokens.lightText, 0.55) : "rgba(255,255,255,0.8)";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`${cur}/${total}`, CAROUSEL_W - SAFE_SIDE, y + trackH / 2);
}

function drawChevronHint(ctx: Ctx, fg: string) {
  const x = CAROUSEL_W - SAFE_SIDE - 12;
  const y = CAROUSEL_H / 2;
  ctx.save();
  ctx.strokeStyle = withAlpha(fg, 0.45);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 14);
  ctx.lineTo(x + 4, y);
  ctx.lineTo(x - 10, y + 14);
  ctx.stroke();
  ctx.restore();
}

// ──────────────────────────────────────────────────────────────────────────
// Avatar circular
// ──────────────────────────────────────────────────────────────────────────

async function drawCircleAvatar(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  url: string | undefined,
  initials: string,
  fallbackColor: string,
  fonts: Fonts
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (url) {
    try {
      const img = await loadImage(url);
      drawCoverFill(ctx, img, cx - r, cy - r, r * 2, r * 2);
    } catch {
      paintInitial(ctx, cx, cy, r, initials, fallbackColor, fonts);
    }
  } else {
    paintInitial(ctx, cx, cy, r, initials, fallbackColor, fonts);
  }
  ctx.restore();
}

function paintInitial(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  text: string,
  color: string,
  fonts: Fonts
) {
  ctx.fillStyle = color;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = "#FFFFFF";
  setFont(ctx, r * 0.9, "800", fonts.display);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 1).toUpperCase(), cx, cy);
}

// ──────────────────────────────────────────────────────────────────────────
// Story
// ──────────────────────────────────────────────────────────────────────────

export async function renderStorySlide(
  slide: StorySlide,
  canvas: HTMLCanvasElement | OffscreenCanvas
): Promise<void> {
  canvas.width = STORY_W;
  canvas.height = STORY_H;
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("Canvas 2D context not available");

  const tokens = deriveBrandTokens(slide.accentColor || "#E4B43C");
  const isDark = slide.bgColor === "preto";
  const bg = isDark ? tokens.darkBg : tokens.lightBg;
  const fg = isDark ? tokens.darkText : tokens.lightText;
  const accent = tokens.primary;

  const gradient = ctx.createLinearGradient(0, 0, 0, STORY_H);
  gradient.addColorStop(0, bg);
  gradient.addColorStop(1, mixHex(bg, accent, 0.08));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, STORY_W, 14);

  if (slide.emoji) {
    ctx.font = "240px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji', system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(slide.emoji, STORY_W / 2, 520);
  }

  ctx.fillStyle = fg;
  setFont(ctx, 100, "800", "Sora");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const headlineLines = wrapText(ctx, slide.headline, STORY_W - 160);
  let y = 920 - (headlineLines.length - 1) * 60;
  for (const line of headlineLines) {
    ctx.fillText(line, STORY_W / 2, y);
    y += 124;
  }

  if (slide.body) {
    ctx.fillStyle = withAlpha(fg, 0.7);
    setFont(ctx, 44, "500", "Nunito");
    const bodyLines = wrapText(ctx, slide.body, STORY_W - 200);
    y += 60;
    for (const line of bodyLines) {
      ctx.fillText(line, STORY_W / 2, y);
      y += 68;
    }
  }

  const pillW = 320;
  const pillH = 88;
  const pillX = (STORY_W - pillW) / 2;
  const pillY = STORY_H - 240;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 44, accent);
  ctx.fillStyle = "#FFFFFF";
  setFont(ctx, 40, "800", "Sora");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Saiba mais →", STORY_W / 2, pillY + pillH / 2);

  ctx.fillStyle = withAlpha(fg, 0.55);
  setFont(ctx, 26, "600", "Nunito");
  ctx.textAlign = "center";
  ctx.fillText("@logosia", STORY_W / 2, STORY_H - 80);
}

// ──────────────────────────────────────────────────────────────────────────
// Download helpers
// ──────────────────────────────────────────────────────────────────────────

export function downloadCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string
) {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao converter canvas para blob"));
    }, "image/png");
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────────────────

type Ctx =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

function drawRoundedRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCoverFill(
  ctx: Ctx,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const r = Math.max(dw / iw, dh / ih);
  const nw = iw * r;
  const nh = ih * r;
  const ox = dx + (dw - nw) / 2;
  const oy = dy + (dh - nh) / 2;
  ctx.drawImage(img, ox, oy, nw, nh);
}

function setFont(
  ctx: Ctx,
  size: number,
  weight: string,
  family: string
) {
  ctx.font = `${weight} ${size}px '${family}', system-ui, -apple-system, sans-serif`;
}

function wrapText(
  ctx: Ctx,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = ctx.measureText(test).width;
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba") || color.startsWith("rgb")) return color;
  const { r, g, b } = hexToRgbSafe(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgbSafe(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgbSafe(hex: string) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  let v = m[1];
  if (v.length === 3)
    v = v
      .split("")
      .map((c) => c + c)
      .join("");
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function mixHex(a: string, b: string, ratio: number): string {
  const ca = hexToRgbSafe(a);
  const cb = hexToRgbSafe(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * ratio);
  const g = Math.round(ca.g + (cb.g - ca.g) * ratio);
  const bl = Math.round(ca.b + (cb.b - ca.b) * ratio);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Compat: traduz bgColor/type antigo para bgMode novo. */
function inferLegacyBgMode(slide: CarouselSlide): BgMode {
  if (slide.type === "cta") return "gradient";
  if (slide.bgColor === "black") return "dark";
  return "light";
}

// re-export para conveniência
export { deriveBrandTokens, pickTextOn } from "./colorTokens.js";
