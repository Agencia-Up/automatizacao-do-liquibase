import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { CarouselPreview } from "@/components/CarouselPreview";
import { CopyButton } from "@/components/CopyButton";
import { BriefingWizard, type BriefingResult } from "@/components/BriefingWizard";
import { QualityChecklist } from "@/components/QualityChecklist";
import { AlertTriangle, ListChecks, RefreshCw, Sparkle, Wand2 } from "lucide-react";
import type { CarouselSlide, SlideComponent } from "@/utils/canvasRenderer";
import {
  buildTemplateSlides,
  TEMPLATES,
  TEMPLATE_IDS,
  type TemplateId,
} from "@/utils/templates";
import {
  FONT_PAIRS,
  FONT_PAIR_IDS,
  ensureFontPairLoaded,
  type FontPairId,
} from "@/utils/fontPairs";
import { checkWcag, deriveBrandTokens } from "@/utils/colorTokens";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/useAuth";

interface HookAlt {
  technique: string;
  text: string;
}
interface GeneratedContent {
  headlines: string[];
  caption: {
    short: string;
    medium: string;
    long: string;
    attention: string;
    interest: string;
    desire: string;
    action: string;
  };
  hookAlternatives: HookAlt[];
  hashtags: {
    big: string[];
    medium: string[];
    small: string[];
    niche: string[];
  };
  firstComment: string;
  strategicNotes: {
    bestTime: string;
    engagementQuestion: string;
    storyIdea: string;
  };
}

export function Carousels() {
  const { refetch: refetchAuth } = useAuth();
  const { data: clients } = trpc.clients.list.useQuery();
  const utils = trpc.useUtils();

  // Conteúdo
  const [prompt, setPrompt] = useState("");
  const [contextExtra, setContextExtra] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [template, setTemplate] = useState<TemplateId>("vendas");

  // Marca / autor
  const [channelName, setChannelName] = useState("");
  const [channelHandle, setChannelHandle] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  // Visual
  const [accent, setAccent] = useState("#E4B43C");
  const [accent2, setAccent2] = useState("#0C0C3C");
  const [slideCount, setSlideCount] = useState(7);
  const [fontPair, setFontPair] = useState<FontPairId>("moderno");

  // garantir que a fonte do par esteja carregada via <link>
  useEffect(() => {
    ensureFontPairLoaded(fontPair);
  }, [fontPair]);

  // Briefing wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  const applyBriefing = (r: BriefingResult) => {
    setTemplate(r.suggestedTemplate);
    setContextExtra((prev) =>
      prev.trim() ? prev : r.contextExtra
    );
    if (!ctaText.trim() && r.suggestedCta) setCtaText(r.suggestedCta);
    toast.success("Briefing aplicado — ajuste os campos se quiser.");
  };

  // Resultado
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  /** Hook escolhido pelo usuário (substitui headline da capa) */
  const [hookOverride, setHookOverride] = useState<string | null>(null);
  /** Lista alternativa de hooks (após regenerar) */
  const [hookList, setHookList] = useState<HookAlt[] | null>(null);
  /** Componente especializado por índice de slide */
  const [slideComponents, setSlideComponents] = useState<
    Record<number, SlideComponent>
  >({});

  useEffect(() => {
    if (!clientId || !clients) return;
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    if (!channelName.trim()) setChannelName(c.name);
    if (!channelHandle.trim()) setChannelHandle(c.instagram);
    if (!profileUrl.trim() && c.avatarUrl) setProfileUrl(c.avatarUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, clients]);

  const generate = trpc.carousels.generate.useMutation({
    onSuccess(data) {
      setGenerated(data.generated as GeneratedContent);
      setHookOverride(null);
      setHookList(null);
      refetchAuth();
      utils.carousels.list.invalidate();
      toast.success(`Carrossel gerado! ${data.credits} créditos restantes.`);
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const regenerateHooks = trpc.carousels.regenerateHooks.useMutation({
    onSuccess(data) {
      setHookList(data.alternatives as HookAlt[]);
      toast.success("Novas opções de hook geradas (grátis)");
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  /** Slides do preview baseados no template + conteúdo (real ou placeholder). */
  const slides: CarouselSlide[] = useMemo(() => {
    const total = Math.max(1, Math.min(10, slideCount));
    const handle =
      channelHandle && !channelHandle.startsWith("@")
        ? `@${channelHandle}`
        : channelHandle;

    const tplSlides = buildTemplateSlides(template, total);

    const baseHeadlines: string[] =
      generated?.headlines && generated.headlines.length >= total
        ? generated.headlines.slice(0, total)
        : buildPlaceholderHeadlines(prompt, total);
    // se o usuário escolheu um hook alternativo, substitui o headline da capa
    const headlines = hookOverride
      ? [hookOverride, ...baseHeadlines.slice(1)]
      : baseHeadlines;

    const caption = generated?.caption ?? {
      attention: "Prévia ao vivo. Gere para ver o conteúdo da IA.",
      interest: "Ajuste cores, fotos e fundos — a tela atualiza na hora.",
      desire: "Cada slide segue o framework escolhido.",
      action: ctaText || "Vem comigo!",
    };

    const pair = FONT_PAIRS[fontPair];

    return tplSlides.map((def, i) => {
      const isFirst = i === 0;
      const isLast = i === tplSlides.length - 1;
      let body: string | undefined;
      if (isFirst) body = caption.attention;
      else if (!isLast) {
        const bodies = [caption.interest, caption.desire];
        body = bodies[(i - 1) % bodies.length];
      }

      return {
        type: isFirst ? "cover" : isLast ? "cta" : "middle",
        bgMode: def.bgMode,
        tag: def.tag,
        component: !isFirst && !isLast ? slideComponents[i] : undefined,
        headline: headlines[i] ?? def.tag,
        body,
        coverUrl: isFirst ? coverUrl || undefined : undefined,
        profileUrl: profileUrl || undefined,
        channelName: channelName || undefined,
        channelHandle: handle || undefined,
        ctaText: isLast ? ctaText || undefined : undefined,
        accent,
        accent2,
        displayFont: pair.display,
        bodyFont: pair.body,
      };
    });
  }, [
    generated,
    hookOverride,
    slideCount,
    template,
    prompt,
    coverUrl,
    profileUrl,
    channelName,
    channelHandle,
    ctaText,
    accent,
    accent2,
    fontPair,
    slideComponents,
  ]);

  /** Validação de contraste WCAG da cor primária sobre fundo claro. */
  const wcagWarning = useMemo(() => {
    try {
      const t = deriveBrandTokens(accent);
      const onLight = checkWcag(t.primary, t.lightBg);
      const onDark = checkWcag(t.darkText, t.dark);
      const warnings: string[] = [];
      if (!onLight.aaLarge) {
        warnings.push(
          `Cor primária × fundo claro: contraste ${onLight.ratio.toFixed(2)}:1 (mínimo AA grande 3.0:1).`
        );
      }
      if (!onDark.aaNormal) {
        warnings.push(
          `Texto sobre fundo gradient pode ficar fraco: ${onDark.ratio.toFixed(2)}:1.`
        );
      }
      return warnings;
    } catch {
      return [];
    }
  }, [accent]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 10) {
      toast.error("Descreva o tema com pelo menos 10 caracteres");
      return;
    }
    if (!channelName.trim() && !clientId) {
      toast.error("Informe o nome do canal ou selecione um cliente");
      return;
    }
    if (!channelHandle.trim() && !clientId) {
      toast.error("Informe o @ do Instagram ou selecione um cliente");
      return;
    }
    generate.mutate({
      prompt,
      contextExtra: contextExtra || undefined,
      template,
      fontPair,
      slideCount,
      clientId: clientId ?? undefined,
      channelName: channelName || undefined,
      channelHandle: channelHandle || undefined,
      profileUrl: profileUrl || undefined,
      coverUrl: coverUrl || undefined,
      ctaText: ctaText || undefined,
      accent,
      accent2,
    });
  };

  const tpl = TEMPLATES[template];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Gerar carrossel</h1>
          <p className="text-muted-foreground">
            Formato 4:5 (1080×1350). Escolha um template, ajuste cores e veja o
            preview ao vivo. 1 crédito por geração com IA.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setWizardOpen(true)}
          className="self-start sm:self-auto"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Briefing rápido
        </Button>
      </header>

      <BriefingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onFinish={applyBriefing}
      />

      <div className="grid lg:grid-cols-[440px_1fr] gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Estratégia */}
              <section className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estratégia
                </p>
                <div className="space-y-2">
                  <Label htmlFor="template">Template narrativo</Label>
                  <Select
                    id="template"
                    value={template}
                    onChange={(e) =>
                      setTemplate(e.target.value as TemplateId)
                    }
                  >
                    {TEMPLATE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {TEMPLATES[id].label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {tpl.description}
                  </p>
                </div>

                {/* Componentes por slide */}
                {slides.length > 2 && (
                  <div className="space-y-2 pt-2">
                    <Label>Componente por slide (intermediários)</Label>
                    <div className="space-y-1.5">
                      {slides.slice(1, -1).map((s, idx) => {
                        const realIdx = idx + 1;
                        return (
                          <div
                            key={realIdx}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="font-bold text-muted-foreground w-6">
                              {String(realIdx + 1).padStart(2, "0")}
                            </span>
                            <span
                              className="flex-1 truncate text-muted-foreground"
                              title={s.headline}
                            >
                              {s.tag || s.headline.slice(0, 28)}
                            </span>
                            <Select
                              value={slideComponents[realIdx] ?? "default"}
                              onChange={(e) =>
                                setSlideComponents((p) => ({
                                  ...p,
                                  [realIdx]: e.target.value as SlideComponent,
                                }))
                              }
                              className="h-8 text-xs w-32"
                            >
                              <option value="default">Padrão</option>
                              <option value="metric">Métrica</option>
                              <option value="quote">Citação</option>
                              <option value="steps">Passos</option>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Conteúdo */}
              <section className="space-y-3 pt-3 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conteúdo
                </p>
                <div className="space-y-2">
                  <Label htmlFor="prompt">Tema do carrossel *</Label>
                  <Textarea
                    id="prompt"
                    placeholder='Ex.: "3 erros que todo empreendedor iniciante comete"'
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context">Contexto extra (opcional)</Label>
                  <Textarea
                    id="context"
                    placeholder="Detalhes para a IA refinar — público, ângulo, novidade…"
                    value={contextExtra}
                    onChange={(e) => setContextExtra(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta">CTA personalizado (opcional)</Label>
                  <Input
                    id="cta"
                    placeholder="Vem comigo!"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                  />
                </div>
              </section>

              {/* Identidade */}
              <section className="space-y-3 pt-3 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Identidade
                </p>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente (opcional)</Label>
                  <Select
                    id="client"
                    value={clientId ?? ""}
                    onChange={(e) =>
                      setClientId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">— Sem cliente (preencher manualmente) —</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.instagram})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome / canal *</Label>
                    <Input
                      id="name"
                      placeholder="KingPlayer"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ig">@ Instagram *</Label>
                    <Input
                      id="ig"
                      placeholder="@seucanal"
                      value={channelHandle}
                      onChange={(e) => setChannelHandle(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Foto de perfil (opcional)</Label>
                  <ImageUpload
                    onUploadComplete={setProfileUrl}
                    initialUrl={profileUrl || undefined}
                    maxSize={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem de fundo da capa (opcional)</Label>
                  <ImageUpload
                    onUploadComplete={setCoverUrl}
                    initialUrl={coverUrl || undefined}
                    maxSize={5}
                  />
                </div>
              </section>

              {/* Visual */}
              <section className="space-y-3 pt-3 border-t border-border">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Visual
                </p>
                <div className="space-y-2">
                  <Label htmlFor="count">
                    Slides:{" "}
                    <span className="text-brand-orange font-bold">
                      {slideCount}
                    </span>{" "}
                    <span className="text-muted-foreground font-normal">
                      (7 ideal)
                    </span>
                  </Label>
                  <Slider
                    id="count"
                    min={3}
                    max={10}
                    value={slideCount}
                    onChange={(e) => setSlideCount(Number(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="accent">Cor primária</Label>
                    <div className="flex gap-2">
                      <input
                        id="accent"
                        type="color"
                        value={accent}
                        onChange={(e) => setAccent(e.target.value)}
                        className="h-10 w-14 rounded-md bg-transparent border border-border cursor-pointer"
                      />
                      <Input
                        value={accent}
                        onChange={(e) => setAccent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent2">Cor secundária</Label>
                    <div className="flex gap-2">
                      <input
                        id="accent2"
                        type="color"
                        value={accent2}
                        onChange={(e) => setAccent2(e.target.value)}
                        className="h-10 w-14 rounded-md bg-transparent border border-border cursor-pointer"
                      />
                      <Input
                        value={accent2}
                        onChange={(e) => setAccent2(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Os 8 tokens da marca (light, dark, muted, fundos e bordas) são
                  derivados da cor primária automaticamente.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="fontPair">Par tipográfico</Label>
                  <Select
                    id="fontPair"
                    value={fontPair}
                    onChange={(e) =>
                      setFontPair(e.target.value as FontPairId)
                    }
                  >
                    {FONT_PAIR_IDS.map((id) => (
                      <option key={id} value={id}>
                        {FONT_PAIRS[id].label} — {FONT_PAIRS[id].description}
                      </option>
                    ))}
                  </Select>
                </div>

                {wcagWarning.length > 0 && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Atenção ao contraste
                    </div>
                    {wcagWarning.map((w, i) => (
                      <p key={i} className="text-foreground/80">
                        {w}
                      </p>
                    ))}
                  </div>
                )}
              </section>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar carrossel
                  </>
                )}
              </Button>
            </form>

          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-6 space-y-4">
          <CarouselPreview
            slides={slides}
            captionMedium={generated?.caption.medium}
            accent={accent}
            filenamePrefix={
              channelHandle?.replace(/^@/, "") ||
              prompt.slice(0, 24).toLowerCase().replace(/\s+/g, "-") ||
              "carrossel"
            }
          />
        </div>
      </div>

      {generated && (
        <section className="space-y-4">
          <HookSection
            options={hookList ?? generated.hookAlternatives}
            currentHeadline={slides[0]?.headline ?? ""}
            onPick={(text) => {
              setHookOverride(text);
              toast.success("Hook aplicado à capa");
            }}
            onRegenerate={() =>
              regenerateHooks.mutate({
                prompt,
                contextExtra: contextExtra || undefined,
              })
            }
            isRegenerating={regenerateHooks.isPending}
          />

          <div className="grid lg:grid-cols-2 gap-4">
            <CaptionSection caption={generated.caption} />
            <HashtagSection hashtags={generated.hashtags} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <FirstCommentSection text={generated.firstComment} />
            <NotesSection notes={generated.strategicNotes} />
          </div>

          <QualityChecklist
            slides={slides}
            caption={generated.caption}
            hashtags={generated.hashtags}
            ctaText={ctaText || generated.caption.action}
            accent={accent}
            hasHook={!!hookOverride || generated.headlines.length > 0}
          />
        </section>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Subcomponentes pós-geração
// ──────────────────────────────────────────────────────────────────────────

const TECHNIQUE_LABELS: Record<string, string> = {
  curiosidade: "Curiosidade",
  contradicao: "Contradição",
  pergunta: "Pergunta direta",
  listicle: "Listicle numerado",
  promessa: "Promessa específica",
  confissao: "Confissão",
  estatistica: "Estatística chocante",
  desafio: "Desafio à autoridade",
  "antes-depois": "Antes / depois",
  tensao: "Tensão visual",
};

function HookSection({
  options,
  currentHeadline,
  onPick,
  onRegenerate,
  isRegenerating,
}: {
  options: HookAlt[];
  currentHeadline: string;
  onPick: (text: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>3 opções de hook</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cada hook usa uma técnica distinta. Clique para aplicar à capa.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`}
          />
          Gerar 3 novas (grátis)
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3">
          {options.map((opt, idx) => {
            const active = currentHeadline === opt.text;
            return (
              <button
                key={`${opt.technique}-${idx}`}
                type="button"
                onClick={() => onPick(opt.text)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-brand-orange bg-brand-orange/10"
                    : "border-border hover:border-brand-orange/40 hover:bg-muted"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-brand-orange font-bold mb-1">
                  {TECHNIQUE_LABELS[opt.technique] ?? opt.technique}
                </p>
                <p className="font-display font-bold text-sm leading-snug">
                  {opt.text}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {opt.text.split(/\s+/).length} palavras{" "}
                  {opt.text.split(/\s+/).length <= 8 ? "✓" : "⚠"}
                </p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CaptionSection({
  caption,
}: {
  caption: GeneratedContent["caption"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-brand-orange" />
          Legenda em 3 versões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="curta">
          <TabsList>
            <TabsTrigger value="curta">Curta</TabsTrigger>
            <TabsTrigger value="media">Média</TabsTrigger>
            <TabsTrigger value="longa">Longa</TabsTrigger>
            <TabsTrigger value="aida">AIDA</TabsTrigger>
          </TabsList>
          <CaptionTab text={caption.short} ideal={125} label="≤125 chars" />
          <CaptionTab text={caption.medium} ideal={500} label="300-500 chars" valueKey="media" />
          <CaptionTab text={caption.long} ideal={2200} label="1000+ chars" valueKey="longa" />
          <TabsContent value="aida">
            <div className="space-y-2 rounded-md bg-muted p-3 text-sm text-foreground/90">
              <p>
                <span className="text-brand-orange font-semibold">A:</span>{" "}
                {caption.attention}
              </p>
              <p>
                <span className="text-brand-orange font-semibold">I:</span>{" "}
                {caption.interest}
              </p>
              <p>
                <span className="text-brand-orange font-semibold">D:</span>{" "}
                {caption.desire}
              </p>
              <p>
                <span className="text-brand-orange font-semibold">A:</span>{" "}
                {caption.action}
              </p>
              <div className="flex justify-end pt-2">
                <CopyButton
                  text={`${caption.attention}\n\n${caption.interest}\n\n${caption.desire}\n\n${caption.action}`}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CaptionTab({
  text,
  ideal,
  label,
  valueKey = "curta",
}: {
  text: string;
  ideal: number;
  label: string;
  valueKey?: string;
}) {
  const len = text.length;
  const ok = len <= ideal;
  return (
    <TabsContent value={valueKey}>
      <div className="rounded-md bg-muted p-3 text-sm space-y-3">
        <p className="whitespace-pre-line text-foreground/90">{text}</p>
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${ok ? "text-muted-foreground" : "text-destructive"}`}
          >
            {len} chars · ideal {label}
          </span>
          <CopyButton text={text} />
        </div>
      </div>
    </TabsContent>
  );
}

function HashtagSection({
  hashtags,
}: {
  hashtags: GeneratedContent["hashtags"];
}) {
  const all = [
    ...hashtags.big,
    ...hashtags.medium,
    ...hashtags.small,
    ...hashtags.niche,
  ].join(" ");
  const groups: Array<{ label: string; tags: string[] }> = [
    { label: "Grandes (1M+)", tags: hashtags.big },
    { label: "Médias (100k-1M)", tags: hashtags.medium },
    { label: "Pequenas (<100k)", tags: hashtags.small },
    { label: "Nicho", tags: hashtags.niche },
  ];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Hashtags estratégicas</CardTitle>
        <CopyButton text={all} label="Copiar todas" />
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {g.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold"
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FirstCommentSection({ text }: { text: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>1º comentário</CardTitle>
        <CopyButton text={text} />
      </CardHeader>
      <CardContent>
        <p className="text-sm rounded-md bg-muted p-3 whitespace-pre-line">
          {text}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Cole logo após postar para gerar engajamento inicial.
        </p>
      </CardContent>
    </Card>
  );
}

function NotesSection({ notes }: { notes: GeneratedContent["strategicNotes"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notas estratégicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Melhor horário
          </p>
          <p>{notes.bestTime}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Pergunta para engajamento
          </p>
          <p>{notes.engagementQuestion}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Ideia de story complementar
          </p>
          <p>{notes.storyIdea}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function buildPlaceholderHeadlines(prompt: string, count: number): string[] {
  const base = prompt.trim() || "Seu tema aqui";
  if (count === 1) return [capitalize(base)];
  const out: string[] = [];
  out.push(capitalize(base));
  for (let i = 1; i < count - 1; i++) {
    out.push(`Ponto ${i}`);
  }
  out.push("Vem comigo!");
  return out;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
