/**
 * Templates narrativos do carrossel.
 * Cada template define o framework, a etiqueta (tag) e o modo de fundo
 * (light / dark / gradient) slide a slide.
 *
 * Convenção: slide 1 SEMPRE em light, último slide SEMPRE em gradient.
 */

export type BgMode = "light" | "dark" | "gradient";

export interface TemplateSlideDef {
  /** Etiqueta uppercase exibida acima do título (slides 2..N-1) */
  tag: string;
  /** Função semântica do slide (referência interna) */
  role: string;
  /** Modo de fundo do slide */
  bgMode: BgMode;
}

export interface CarouselTemplate {
  id: TemplateId;
  label: string;
  framework: string;
  /** Descrição curta da estratégia */
  description: string;
  slides: TemplateSlideDef[];
}

export type TemplateId =
  | "vendas"
  | "educativo"
  | "storytelling"
  | "autoridade"
  | "mito-verdade";

export const TEMPLATES: Record<TemplateId, CarouselTemplate> = {
  vendas: {
    id: "vendas",
    label: "Vendas (AIDA)",
    framework: "AIDA",
    description:
      "Atenção → Interesse → Desejo → Prova → Mecanismo → Objeções → CTA",
    slides: [
      { tag: "ATENÇÃO", role: "hero", bgMode: "light" },
      { tag: "INTERESSE", role: "agita", bgMode: "dark" },
      { tag: "DESEJO", role: "solucao", bgMode: "gradient" },
      { tag: "PROVA", role: "prova", bgMode: "light" },
      { tag: "COMO FUNCIONA", role: "mecanismo", bgMode: "dark" },
      { tag: "OBJEÇÕES", role: "objecoes", bgMode: "light" },
      { tag: "PRÓXIMO PASSO", role: "cta", bgMode: "gradient" },
    ],
  },
  educativo: {
    id: "educativo",
    label: "Educativo (Listicle)",
    framework: "LISTICLE",
    description: "Promessa → contexto → itens enumerados → recap → CTA",
    slides: [
      { tag: "PROMESSA", role: "hero", bgMode: "light" },
      { tag: "POR QUE IMPORTA", role: "contexto", bgMode: "dark" },
      { tag: "ITEM 01", role: "item-1", bgMode: "light" },
      { tag: "ITEM 02", role: "item-2", bgMode: "dark" },
      { tag: "ITEM 03", role: "item-3", bgMode: "light" },
      { tag: "RECAP", role: "recap", bgMode: "dark" },
      { tag: "COMPARTILHE", role: "cta", bgMode: "gradient" },
    ],
  },
  storytelling: {
    id: "storytelling",
    label: "Storytelling (BAB)",
    framework: "BAB",
    description: "Antes → virada → depois → aprendizado → aplicação → CTA",
    slides: [
      { tag: "A HISTÓRIA", role: "hero", bgMode: "light" },
      { tag: "ANTES", role: "antes", bgMode: "dark" },
      { tag: "A VIRADA", role: "virada", bgMode: "gradient" },
      { tag: "DEPOIS", role: "depois", bgMode: "light" },
      { tag: "APRENDIZADO", role: "aprendizado", bgMode: "dark" },
      { tag: "APLIQUE", role: "aplicacao", bgMode: "light" },
      { tag: "VEM COMIGO", role: "cta", bgMode: "gradient" },
    ],
  },
  autoridade: {
    id: "autoridade",
    label: "Autoridade (Hook-Insight-Proof-CTA)",
    framework: "HOOK-INSIGHT-PROOF-CTA",
    description:
      "Afirmação contraintuitiva → crença comum → realidade → explicação → prova → aplicação → CTA",
    slides: [
      { tag: "INSIGHT", role: "hero", bgMode: "light" },
      { tag: "TODO MUNDO PENSA", role: "crenca", bgMode: "dark" },
      { tag: "NA REALIDADE", role: "realidade", bgMode: "gradient" },
      { tag: "POR QUÊ", role: "explicacao", bgMode: "light" },
      { tag: "PROVA", role: "prova", bgMode: "dark" },
      { tag: "APLIQUE", role: "aplicacao", bgMode: "light" },
      { tag: "ENGAJAMENTO", role: "cta", bgMode: "gradient" },
    ],
  },
  "mito-verdade": {
    id: "mito-verdade",
    label: "Mito vs Verdade",
    framework: "MITO-VERDADE",
    description: "Crença errada → realidade → por que persiste → implicação → o que fazer → CTA",
    slides: [
      { tag: "É MENTIRA", role: "hero", bgMode: "light" },
      { tag: "O MITO", role: "mito", bgMode: "dark" },
      { tag: "A VERDADE", role: "verdade", bgMode: "gradient" },
      { tag: "POR QUE PERSISTE", role: "porque", bgMode: "light" },
      { tag: "IMPLICAÇÃO", role: "implicacao", bgMode: "dark" },
      { tag: "O QUE FAZER", role: "acao", bgMode: "light" },
      { tag: "COMPARTILHE", role: "cta", bgMode: "gradient" },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

/**
 * Retorna o array de slides do template, ajustado para o número desejado.
 * - Se total <= slides do template: corta no fim, mas mantém slide 1 (hero)
 *   e força o último a ser CTA (gradient).
 * - Se total > slides do template: repete slides intermediários antes do CTA.
 */
export function buildTemplateSlides(
  templateId: TemplateId,
  total: number
): TemplateSlideDef[] {
  const tpl = TEMPLATES[templateId] || TEMPLATES.vendas;
  const all = tpl.slides;
  const safeTotal = Math.max(1, Math.min(10, total));

  if (safeTotal === 1) {
    return [all[0]];
  }

  if (safeTotal <= all.length) {
    // pega primeiros (safeTotal-1) e força CTA no fim
    const head = all.slice(0, safeTotal - 1);
    return [...head, all[all.length - 1]];
  }

  // expande: repete slides do meio (excluindo hero e CTA) até atingir o total
  const head = all[0];
  const tail = all[all.length - 1];
  const middle = all.slice(1, -1);
  const expandedMiddle: TemplateSlideDef[] = [];
  let i = 0;
  while (expandedMiddle.length < safeTotal - 2) {
    expandedMiddle.push(middle[i % middle.length]);
    i++;
  }
  return [head, ...expandedMiddle, tail];
}
