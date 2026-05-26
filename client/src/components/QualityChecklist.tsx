import { useMemo } from "react";
import { Check, X, ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CarouselSlide } from "@/utils/canvasRenderer";
import { checkWcag, deriveBrandTokens } from "@/utils/colorTokens";
import { cn } from "@/lib/utils";

interface QualityChecklistProps {
  slides: CarouselSlide[];
  caption?: { short: string; medium: string; long: string };
  hashtags?: {
    big: string[];
    medium: string[];
    small: string[];
    niche: string[];
  };
  ctaText?: string;
  accent?: string;
  /** Há legenda diferente para o primeiro slide (hook)? */
  hasHook: boolean;
}

interface CheckItem {
  id: string;
  label: string;
  pass: boolean;
  detail?: string;
}

const WORD_LIMITS = {
  /** Hero / capa: spec ≤8 palavras na linha principal */
  hero: 8,
  /** Slides intermediários */
  title: 12,
  /** CTA */
  cta: 15,
  /** Body por slide (conteúdo) */
  body: 40,
};

function countWords(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function QualityChecklist({
  slides,
  caption,
  hashtags,
  ctaText,
  accent,
  hasHook,
}: QualityChecklistProps) {
  const checks: CheckItem[] = useMemo(() => {
    const items: CheckItem[] = [];

    if (slides.length === 0) return items;

    const hero = slides[0];
    const cta = slides[slides.length - 1];

    // 1. Hook forte (≤8 palavras, não vazio)
    const heroWords = countWords(hero.headline);
    items.push({
      id: "hook",
      label: `Hook na capa tem até ${WORD_LIMITS.hero} palavras`,
      pass: hasHook && heroWords > 0 && heroWords <= WORD_LIMITS.hero,
      detail: `${heroWords} palavras${heroWords > WORD_LIMITS.hero ? " — encurte" : ""}`,
    });

    // 2. Hook específico (sem clichês)
    const cliches =
      /você sabia|vou te ensinar|aprenda agora|venha conferir|fique até o final/i;
    items.push({
      id: "cliche",
      label: "Hook sem clichês",
      pass: !cliches.test(hero.headline),
      detail: cliches.test(hero.headline) ? "Detectado clichê" : "OK",
    });

    // 3. Densidade dos slides intermediários
    const middleViolations = slides
      .slice(1, -1)
      .filter(
        (s) =>
          countWords(s.headline) > WORD_LIMITS.title ||
          countWords(s.body) > WORD_LIMITS.body
      );
    items.push({
      id: "densidade",
      label: `Slides com até ${WORD_LIMITS.title} palavras no título e ${WORD_LIMITS.body} no corpo`,
      pass: middleViolations.length === 0,
      detail:
        middleViolations.length === 0
          ? "OK"
          : `${middleViolations.length} slide(s) acima do limite`,
    });

    // 4. CTA específico
    const ctaWords = countWords(ctaText || cta.ctaText || cta.headline);
    items.push({
      id: "cta",
      label: `CTA tem até ${WORD_LIMITS.cta} palavras`,
      pass: ctaWords > 0 && ctaWords <= WORD_LIMITS.cta,
      detail: `${ctaWords} palavras`,
    });

    // 5. Fluxo lógico — slides têm tags variadas
    const tags = new Set(slides.slice(1, -1).map((s) => s.tag).filter(Boolean));
    items.push({
      id: "fluxo",
      label: "Slides intermediários com etapas distintas",
      pass: tags.size >= Math.min(slides.length - 2, 2),
      detail: `${tags.size} etapas únicas`,
    });

    // 6. Cores WCAG AA
    if (accent) {
      const tokens = deriveBrandTokens(accent);
      const w = checkWcag(tokens.primary, tokens.lightBg);
      items.push({
        id: "wcag",
        label: "Contraste de marca passa WCAG AA grande (3:1)",
        pass: w.aaLarge,
        detail: `${w.ratio.toFixed(2)}:1`,
      });
    }

    // 7. Slide final é CTA com gradiente
    items.push({
      id: "cta-gradient",
      label: "Último slide em gradient (CTA)",
      pass: cta.bgMode === "gradient" || cta.type === "cta",
      detail: cta.bgMode ?? cta.type ?? "—",
    });

    // 8. Capa em fundo claro (melhor performance no feed)
    items.push({
      id: "cover-light",
      label: "Capa em fundo claro (ou com imagem)",
      pass: hero.bgMode === "light" || !!hero.coverUrl,
      detail: hero.coverUrl ? "imagem" : (hero.bgMode ?? "—"),
    });

    // 9. Legenda em 3 versões disponível
    if (caption) {
      items.push({
        id: "captions",
        label: "Legenda em 3 versões",
        pass:
          caption.short.length > 0 &&
          caption.medium.length > 0 &&
          caption.long.length > 0,
        detail: `${caption.short.length}/${caption.medium.length}/${caption.long.length} chars`,
      });
      // 10. Legenda curta ≤125
      items.push({
        id: "short",
        label: "Legenda curta ≤125 chars",
        pass: caption.short.length <= 125 && caption.short.length > 0,
        detail: `${caption.short.length} chars`,
      });
    }

    // 11. Hashtags estratificadas
    if (hashtags) {
      const total =
        hashtags.big.length +
        hashtags.medium.length +
        hashtags.small.length +
        hashtags.niche.length;
      items.push({
        id: "hashtags",
        label: "15-20 hashtags estratificadas",
        pass: total >= 15 && total <= 20,
        detail: `${total} tags`,
      });
    }

    // 12. Não há repetição entre slides
    const headlines = slides.map((s) => s.headline?.trim().toLowerCase());
    const unique = new Set(headlines);
    items.push({
      id: "repeticao",
      label: "Sem repetição entre slides",
      pass: unique.size === headlines.length,
      detail:
        unique.size === headlines.length
          ? "OK"
          : `${headlines.length - unique.size} duplicado(s)`,
    });

    return items;
  }, [slides, caption, hashtags, ctaText, accent, hasHook]);

  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const allPass = passed === total && total > 0;

  if (slides.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-brand-orange" />
          Checklist de qualidade
        </CardTitle>
        <div
          className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full",
            allPass
              ? "bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-muted text-foreground/70"
          )}
        >
          {passed} / {total}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {checks.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 text-sm"
              title={item.detail}
            >
              <div
                className={cn(
                  "mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0",
                  item.pass
                    ? "bg-green-500/20 text-green-600 dark:text-green-400"
                    : "bg-destructive/20 text-destructive"
                )}
              >
                {item.pass ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </div>
              <span
                className={cn(
                  "flex-1",
                  !item.pass && "text-foreground/80"
                )}
              >
                {item.label}
                {item.detail && (
                  <span className="text-xs text-muted-foreground ml-1.5">
                    · {item.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
