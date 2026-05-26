/**
 * Provedor LLM com fallback determinístico.
 *
 * Em produção, configure LLM_PROVIDER=anthropic|openai e a chave correspondente.
 * Quando não configurado (LLM_PROVIDER=mock), usa templates simples para que
 * a plataforma seja totalmente funcional sem chave de API.
 */

const PROVIDER = (process.env.LLM_PROVIDER || "mock").toLowerCase();

// ──────────────────────────────────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────────────────────────────────

export type TemplateFramework =
  | "vendas"
  | "educativo"
  | "storytelling"
  | "autoridade"
  | "mito-verdade";

export type HookTechnique =
  | "curiosidade"
  | "contradicao"
  | "pergunta"
  | "listicle"
  | "promessa"
  | "confissao"
  | "estatistica"
  | "desafio"
  | "antes-depois"
  | "tensao";

export interface HookAlternative {
  technique: HookTechnique;
  text: string;
}

export interface CaptionVariants {
  short: string;
  medium: string;
  long: string;
  /** AIDA estruturada (compat) */
  attention: string;
  interest: string;
  desire: string;
  action: string;
}

export interface HashtagSet {
  big: string[];
  medium: string[];
  small: string[];
  niche: string[];
}

export interface StrategicNotes {
  bestTime: string;
  engagementQuestion: string;
  storyIdea: string;
}

export interface CarouselGeneration {
  headlines: string[];
  caption: CaptionVariants;
  hookAlternatives: HookAlternative[];
  hashtags: HashtagSet;
  firstComment: string;
  strategicNotes: StrategicNotes;
}

export interface StoryItem {
  headline: string;
  body: string;
  emoji: string;
}

// ──────────────────────────────────────────────────────────────────────────
// API
// ──────────────────────────────────────────────────────────────────────────

export const llm = {
  provider: PROVIDER,

  async generateCarousel(opts: {
    prompt: string;
    slideCount: number;
    template: TemplateFramework;
    clientName?: string;
    context?: string;
  }): Promise<CarouselGeneration> {
    if (PROVIDER === "anthropic") return generateWithAnthropic(opts);
    if (PROVIDER === "openai") return generateWithOpenAI(opts);
    return mockCarousel(opts);
  },

  async generateHookOptions(opts: {
    prompt: string;
    context?: string;
  }): Promise<HookAlternative[]> {
    if (PROVIDER === "anthropic") return hooksWithAnthropic(opts);
    if (PROVIDER === "openai") return hooksWithOpenAI(opts);
    return mockHooks(opts.prompt);
  },

  async generateStories(opts: {
    nicho: string;
    type: "motivacional" | "engajamento";
    count?: number;
  }): Promise<StoryItem[]> {
    if (PROVIDER === "anthropic") return generateStoriesWithAnthropic(opts);
    if (PROVIDER === "openai") return generateStoriesWithOpenAI(opts);
    return mockStories(opts);
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Mock — funciona sem API key
// ──────────────────────────────────────────────────────────────────────────

function mockCarousel(opts: {
  prompt: string;
  slideCount: number;
  template: TemplateFramework;
  clientName?: string;
}): CarouselGeneration {
  const tema = opts.prompt.trim();
  const count = Math.max(1, Math.min(10, opts.slideCount));
  const headlines = buildHeadlinesByTemplate(opts.template, tema, count);
  const caption = buildCaption(opts.template, tema, opts.clientName);
  return {
    headlines,
    caption,
    hookAlternatives: mockHooks(tema),
    hashtags: mockHashtags(tema),
    firstComment: mockFirstComment(tema, opts.clientName),
    strategicNotes: mockNotes(tema),
  };
}

function buildHeadlinesByTemplate(
  template: TemplateFramework | undefined,
  tema: string,
  count: number
): string[] {
  const cap = capitalize(tema);
  const safe = template ?? "vendas";
  switch (safe) {
    case "vendas": {
      const all = [
        `${cap} — o que ninguém te conta`,
        `O problema invisível por trás de ${tema}`,
        `A solução em 3 passos para ${tema}`,
        `Prova social: quem aplicou e teve resultado`,
        `Como funciona na prática`,
        `Mas e se eu não tiver tempo? Quebrando objeções`,
        `Comece hoje — comenta "EU" que envio o passo a passo`,
      ];
      return adjustToCount(all, count);
    }
    case "educativo": {
      const all = [
        `${cap}: 5 erros que ninguém te conta`,
        `Por que isso importa agora`,
        `Erro 01 — ${pickInsight(tema, 0)}`,
        `Erro 02 — ${pickInsight(tema, 1)}`,
        `Erro 03 — ${pickInsight(tema, 2)}`,
        `Recapitulando os 3 erros e como evitar`,
        `Salve este post e me siga para mais 🚀`,
      ];
      return adjustToCount(all, count);
    }
    case "storytelling": {
      const all = [
        `Eu errei ${tema} por anos`,
        `Antes: eu não conseguia avançar`,
        `Até o dia em que mudei a abordagem`,
        `Depois: resultado consistente em 30 dias`,
        `O que aprendi com essa virada`,
        `Como você pode aplicar no seu caso`,
        `Vem comigo aprender mais sobre ${tema}`,
      ];
      return adjustToCount(all, count);
    }
    case "autoridade": {
      const all = [
        `${cap} está sendo feito errado`,
        `O que todo mundo pensa sobre ${tema}`,
        `A realidade que poucos enxergam`,
        `Por que essa diferença muda tudo`,
        `Dados e exemplos reais`,
        `O que fazer agora com esse insight`,
        `Comenta sua opinião abaixo`,
      ];
      return adjustToCount(all, count);
    }
    case "mito-verdade": {
      const all = [
        `${cap} é mentira`,
        `O mito que repetem por aí`,
        `A verdade que ninguém mostra`,
        `Por que esse mito persiste`,
        `Implicação prática para você`,
        `Os passos certos a partir de hoje`,
        `Compartilha esse post para acabar com o mito`,
      ];
      return adjustToCount(all, count);
    }
  }
}

function adjustToCount(arr: string[], n: number): string[] {
  if (n === 1) return [arr[0]];
  if (n <= arr.length) {
    return [...arr.slice(0, n - 1), arr[arr.length - 1]];
  }
  // expande
  const head = arr[0];
  const tail = arr[arr.length - 1];
  const middle = arr.slice(1, -1);
  const expanded: string[] = [];
  let i = 0;
  while (expanded.length < n - 2) {
    expanded.push(middle[i % middle.length]);
    i++;
  }
  return [head, ...expanded, tail];
}

function buildCaption(
  template: TemplateFramework,
  tema: string,
  clientName?: string
): CaptionVariants {
  const author = clientName ? `${clientName} aqui. ` : "";
  const attention = `Você já parou para pensar em ${tema}?`;
  const interest = `A maioria das pessoas erra em ${tema} porque ignora ${pickInsight(tema, 1).toLowerCase()}.`;
  const desire = `Imagine dominar ${tema} e colher resultados consistentes nos próximos 30 dias.`;
  const action = `Salve este post, compartilhe com alguém que precisa e me siga para mais conteúdos como este. 🚀`;

  const short = `${attention} 👀`.slice(0, 125);
  const medium = `${author}${attention}\n\n${interest}\n\n${desire}`;
  const long = `${author}${attention}\n\n${interest}\n\n${desire}\n\n${action}\n\n${closingNote(template)}`;
  return { short, medium, long, attention, interest, desire, action };
}

function closingNote(template: TemplateFramework): string {
  switch (template) {
    case "vendas":
      return "Se faz sentido pra você, comenta EU que eu te chamo na DM.";
    case "educativo":
      return "Qual desses erros você já cometeu? Comenta o número aí 👇";
    case "storytelling":
      return "Já passou por algo parecido? Conta nos comentários.";
    case "autoridade":
      return "Você concorda? Se discorda, quero saber o porquê nos comentários.";
    case "mito-verdade":
      return "Marque alguém que ainda acredita nesse mito 🙃";
  }
}

function mockHooks(tema: string): HookAlternative[] {
  return [
    { technique: "curiosidade", text: `O que ninguém te conta sobre ${tema}` },
    {
      technique: "contradicao",
      text: `Tudo que você sabe sobre ${tema} está errado`,
    },
    {
      technique: "estatistica",
      text: `97% das pessoas erram em ${tema} — você é uma delas?`,
    },
  ];
}

function mockHashtags(tema: string): HashtagSet {
  const slug = tema
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  const safe = slug.slice(0, 24) || "marketing";
  return {
    big: ["#instagram", "#marketing", "#empreendedorismo", "#dicas", "#sucesso"],
    medium: [
      "#instagrammarketing",
      "#empreendedorismodigital",
      "#dicasdenegocios",
      "#produtividade",
      "#mindset",
      "#marketingdigital",
      "#vendas",
    ],
    small: [
      `#${safe}`,
      "#estrategiadigital",
      "#crescimentoorganico",
      "#carrosseldeposts",
      "#copywriting",
    ],
    niche: [`#${safe}br`, `#${safe}brasil`, `#${safe}dicas`],
  };
}

function mockFirstComment(tema: string, clientName?: string): string {
  const author = clientName ? `Oi, eu sou ${clientName}. ` : "";
  return `${author}Curtiu esse conteúdo sobre ${tema}? Comenta sua maior dúvida que respondo todas 👇`;
}

function mockNotes(tema: string): StrategicNotes {
  return {
    bestTime: "Terça/quinta entre 18h–20h (BR). Teste também sábado 10h.",
    engagementQuestion: `Qual seu maior desafio em ${tema} hoje?`,
    storyIdea: `Reposte a capa do carrossel + enquete: "Você concorda?" / "Sim · Não"`,
  };
}

function mockStories(opts: {
  nicho: string;
  type: "motivacional" | "engajamento";
  count?: number;
}): StoryItem[] {
  const count = opts.count ?? 3;
  const out: StoryItem[] = [];
  for (let i = 0; i < count; i++) {
    if (opts.type === "motivacional") {
      out.push({
        headline: motivational[i % motivational.length],
        body: `Aplique isso no seu ${opts.nicho} ainda hoje.`,
        emoji: "🔥",
      });
    } else {
      out.push({
        headline: engagement[i % engagement.length].replace(
          "{nicho}",
          opts.nicho
        ),
        body: "Responda nos comentários ou via DM.",
        emoji: "💬",
      });
    }
  }
  return out;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pickInsight(tema: string, i: number) {
  const tips = [
    `Comece pelo essencial em ${tema}`,
    `Erros comuns em ${tema}`,
    `O que ninguém te conta sobre ${tema}`,
    `Hábitos que mudam tudo em ${tema}`,
    `Como destravar ${tema} em 7 dias`,
    `Aprenda ${tema} com método`,
  ];
  return tips[i % tips.length];
}

const motivational = [
  "Pequenos passos, grandes saltos.",
  "Disciplina vence motivação.",
  "Comece hoje. Ajuste no caminho.",
  "Consistência é o atalho.",
  "Você está mais perto do que pensa.",
];

const engagement = [
  "Qual seu maior desafio em {nicho}?",
  "Comenta com 1 palavra: como está seu {nicho} hoje?",
  "Verdadeiro ou falso? '{nicho} é só sorte'",
  "O que você faria diferente em {nicho}?",
];

// ──────────────────────────────────────────────────────────────────────────
// Anthropic
// ──────────────────────────────────────────────────────────────────────────

const FRAMEWORK_BRIEFS: Record<TemplateFramework, string> = {
  vendas:
    "framework AIDA: slide 1 atenção (hook); 2 interesse (agita problema); 3 desejo (solução); 4 prova; 5 mecanismo; 6 objeções; último CTA.",
  educativo:
    "framework LISTICLE: slide 1 promessa numérica; 2 por que importa; 3..N-1 itens enumerados; penúltimo recap; último CTA salve/compartilhe.",
  storytelling:
    "framework BAB: slide 1 frase impactante; 2 antes; 3 virada; 4 depois; 5 aprendizado; 6 aplicação; último CTA.",
  autoridade:
    "framework HOOK-INSIGHT-PROOF-CTA: slide 1 afirmação contraintuitiva; 2 crença comum; 3 realidade; 4 explicação; 5 prova/dado; 6 aplicação; último CTA engajamento.",
  "mito-verdade":
    "framework MITO vs VERDADE: slide 1 'X é mentira'; 2 o mito; 3 a verdade; 4 por que persiste; 5 implicação; 6 o que fazer; último CTA compartilhe.",
};

const CAROUSEL_JSON_SCHEMA = `{
  "headlines": string[N],
  "caption": {
    "short": string ("≤125 chars"),
    "medium": string ("300-500 chars"),
    "long": string ("1000+ chars com quebras de linha"),
    "attention": string,
    "interest": string,
    "desire": string,
    "action": string
  },
  "hookAlternatives": [
    { "technique": "curiosidade"|"contradicao"|"pergunta"|"listicle"|"promessa"|"confissao"|"estatistica"|"desafio"|"antes-depois"|"tensao", "text": string ("≤8 palavras") }
  ] (exatamente 3 itens, técnicas distintas),
  "hashtags": {
    "big": string[5] (#tags 1M+ posts),
    "medium": string[7] (#tags 100k-1M posts),
    "small": string[5] (#tags <100k posts),
    "niche": string[3] (super específicas do nicho)
  },
  "firstComment": string (≤280 chars, para postar logo após),
  "strategicNotes": {
    "bestTime": string,
    "engagementQuestion": string,
    "storyIdea": string
  }
}`;

async function generateWithAnthropic(opts: {
  prompt: string;
  slideCount: number;
  template: TemplateFramework;
  clientName?: string;
  context?: string;
}): Promise<CarouselGeneration> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  if (!key) return mockCarousel(opts);

  const sys =
    "Você é um designer-copywriter de carrosséis para Instagram com expertise em copywriting persuasivo. Responda APENAS com JSON válido. Cada headline tem no máximo 12 palavras. Hooks têm no máximo 8 palavras, são específicos e nunca usam clichês.";

  const user = `Crie um carrossel de ${opts.slideCount} slides sobre: "${opts.prompt}".
${opts.clientName ? `Canal: ${opts.clientName}.\n` : ""}${opts.context ? `Contexto: ${opts.context}.\n` : ""}
Use ${FRAMEWORK_BRIEFS[opts.template]}

Retorne JSON com este formato exato:
${CAROUSEL_JSON_SCHEMA}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 3500,
        system: sys,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text ?? "";
    return safeParseCarousel(text, opts);
  } catch (err) {
    console.warn("Anthropic LLM falhou, usando mock:", err);
    return mockCarousel(opts);
  }
}

async function hooksWithAnthropic(opts: {
  prompt: string;
  context?: string;
}): Promise<HookAlternative[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  if (!key) return mockHooks(opts.prompt);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: `Gere 3 hooks alternativos para um carrossel sobre "${opts.prompt}".
${opts.context ? `Contexto: ${opts.context}.\n` : ""}Cada hook tem máximo 8 palavras, é específico, sem clichês.
Use três técnicas DISTINTAS dentre: curiosidade, contradicao, pergunta, listicle, promessa, confissao, estatistica, desafio, antes-depois, tensao.
Retorne JSON: {"alternatives": [{"technique": string, "text": string}, ...]}`,
          },
        ],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text ?? "";
    return safeParseHooks(text, opts.prompt);
  } catch (err) {
    console.warn("Anthropic hooks falhou, usando mock:", err);
    return mockHooks(opts.prompt);
  }
}

async function generateStoriesWithAnthropic(opts: {
  nicho: string;
  type: "motivacional" | "engajamento";
  count?: number;
}): Promise<StoryItem[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  if (!key) return mockStories(opts);
  const count = opts.count ?? 3;
  const user = `Gere ${count} stories ${opts.type} para o nicho "${opts.nicho}".
Responda APENAS com JSON: {"stories":[{"headline":string,"body":string,"emoji":string}]}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.content?.[0]?.text ?? "";
    return safeParseStories(text, opts);
  } catch (err) {
    console.warn("Anthropic stories falhou, usando mock:", err);
    return mockStories(opts);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// OpenAI
// ──────────────────────────────────────────────────────────────────────────

async function generateWithOpenAI(opts: {
  prompt: string;
  slideCount: number;
  template: TemplateFramework;
  clientName?: string;
  context?: string;
}): Promise<CarouselGeneration> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return mockCarousel(opts);

  const user = `Crie um carrossel de ${opts.slideCount} slides sobre "${opts.prompt}". ${opts.clientName ? `Canal: ${opts.clientName}. ` : ""}${opts.context ? `Contexto: ${opts.context}. ` : ""}Use ${FRAMEWORK_BRIEFS[opts.template]} Retorne em JSON: ${CAROUSEL_JSON_SCHEMA}`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content ?? "";
    return safeParseCarousel(text, opts);
  } catch (err) {
    console.warn("OpenAI LLM falhou, usando mock:", err);
    return mockCarousel(opts);
  }
}

async function hooksWithOpenAI(opts: {
  prompt: string;
  context?: string;
}): Promise<HookAlternative[]> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return mockHooks(opts.prompt);
  const user = `Gere 3 hooks alternativos para um carrossel sobre "${opts.prompt}". ${opts.context ? `Contexto: ${opts.context}. ` : ""}Cada hook tem máximo 8 palavras, específico, sem clichês. 3 técnicas distintas. JSON: {"alternatives": [{"technique": string, "text": string}, ...]}`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content ?? "";
    return safeParseHooks(text, opts.prompt);
  } catch (err) {
    console.warn("OpenAI hooks falhou, usando mock:", err);
    return mockHooks(opts.prompt);
  }
}

async function generateStoriesWithOpenAI(opts: {
  nicho: string;
  type: "motivacional" | "engajamento";
  count?: number;
}): Promise<StoryItem[]> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return mockStories(opts);
  const count = opts.count ?? 3;
  const user = `Gere ${count} stories ${opts.type} para o nicho "${opts.nicho}" em JSON: {"stories":[{"headline":string,"body":string,"emoji":string}]}.`;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content ?? "";
    return safeParseStories(text, opts);
  } catch (err) {
    console.warn("OpenAI stories falhou, usando mock:", err);
    return mockStories(opts);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Parsing seguro
// ──────────────────────────────────────────────────────────────────────────

function safeParseCarousel(
  text: string,
  opts: {
    prompt: string;
    slideCount: number;
    template: TemplateFramework;
    clientName?: string;
  }
): CarouselGeneration {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.headlines)) throw new Error();
    const fallback = mockCarousel(opts);
    return {
      headlines: parsed.headlines.length
        ? parsed.headlines
        : fallback.headlines,
      caption: { ...fallback.caption, ...(parsed.caption ?? {}) },
      hookAlternatives:
        Array.isArray(parsed.hookAlternatives) && parsed.hookAlternatives.length
          ? parsed.hookAlternatives.slice(0, 3)
          : fallback.hookAlternatives,
      hashtags: { ...fallback.hashtags, ...(parsed.hashtags ?? {}) },
      firstComment: parsed.firstComment ?? fallback.firstComment,
      strategicNotes: {
        ...fallback.strategicNotes,
        ...(parsed.strategicNotes ?? {}),
      },
    };
  } catch {
    return mockCarousel(opts);
  }
}

function safeParseHooks(text: string, prompt: string): HookAlternative[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error();
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed.alternatives ?? parsed.hookAlternatives);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error();
    return arr.slice(0, 3) as HookAlternative[];
  } catch {
    return mockHooks(prompt);
  }
}

function safeParseStories(
  text: string,
  opts: { nicho: string; type: "motivacional" | "engajamento"; count?: number }
): StoryItem[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed) ? parsed : parsed.stories;
    if (!Array.isArray(arr)) throw new Error();
    return arr as StoryItem[];
  } catch {
    return mockStories(opts);
  }
}
