import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { TemplateId } from "@/utils/templates";

type Objective =
  | "educar"
  | "vender"
  | "leads"
  | "engajar"
  | "prova"
  | "storytelling";

const OBJECTIVE_OPTIONS: Array<{
  value: Objective;
  label: string;
  template: TemplateId;
}> = [
  { value: "educar", label: "Educar / autoridade", template: "autoridade" },
  { value: "vender", label: "Vender produto/serviço", template: "vendas" },
  { value: "leads", label: "Captar leads", template: "vendas" },
  { value: "engajar", label: "Engajar / comentários", template: "educativo" },
  { value: "prova", label: "Provar resultados", template: "storytelling" },
  {
    value: "storytelling",
    label: "Storytelling / conexão",
    template: "storytelling",
  },
];

export interface BriefingResult {
  /** Texto consolidado para o campo "Contexto extra" */
  contextExtra: string;
  /** Sugestão de template baseada no objetivo */
  suggestedTemplate: TemplateId;
  /** CTA inferido da ação desejada */
  suggestedCta: string;
}

interface BriefingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (result: BriefingResult) => void;
}

export function BriefingWizard({
  open,
  onOpenChange,
  onFinish,
}: BriefingWizardProps) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState<Objective>("educar");
  const [audience, setAudience] = useState("");
  const [pain, setPain] = useState("");
  const [objection, setObjection] = useState("");
  const [action, setAction] = useState("");

  const steps = [
    {
      title: "Qual o objetivo?",
      description: "O foco define o framework narrativo.",
      content: (
        <div className="space-y-2">
          <Label htmlFor="obj">Objetivo principal</Label>
          <Select
            id="obj"
            value={objective}
            onChange={(e) => setObjective(e.target.value as Objective)}
          >
            {OBJECTIVE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ),
    },
    {
      title: "Quem é o público?",
      description: "Quanto mais específico, melhor a copy.",
      content: (
        <div className="space-y-2">
          <Label htmlFor="aud">Público específico</Label>
          <Textarea
            id="aud"
            placeholder="Ex.: empreendedoras solo no Instagram com até 1k seguidores"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            rows={3}
          />
        </div>
      ),
    },
    {
      title: "Qual a dor atual?",
      description: "O problema concreto que esse público enfrenta.",
      content: (
        <div className="space-y-2">
          <Label htmlFor="pain">Dor ou desejo</Label>
          <Textarea
            id="pain"
            placeholder="Ex.: posta mas não cresce, sente que ninguém vê o conteúdo"
            value={pain}
            onChange={(e) => setPain(e.target.value)}
            rows={3}
          />
        </div>
      ),
    },
    {
      title: "Que objeção precisa quebrar?",
      description: "O que impede esse público de agir hoje?",
      content: (
        <div className="space-y-2">
          <Label htmlFor="obj2">Objeção principal (opcional)</Label>
          <Textarea
            id="obj2"
            placeholder="Ex.: 'não tenho tempo', 'já tentei tudo', 'meu nicho é diferente'"
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
            rows={2}
          />
        </div>
      ),
    },
    {
      title: "Qual a ação desejada?",
      description: "O que quer que o leitor faça no fim do carrossel?",
      content: (
        <div className="space-y-2">
          <Label htmlFor="act">Ação ao final</Label>
          <Input
            id="act"
            placeholder="Ex.: salvar, comentar 'EU', clicar link bio, mandar DM"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleFinish = () => {
    const suggested =
      OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.template ?? "vendas";
    const parts: string[] = [];
    if (audience.trim()) parts.push(`Público: ${audience.trim()}`);
    if (pain.trim()) parts.push(`Dor: ${pain.trim()}`);
    if (objection.trim()) parts.push(`Quebrar a objeção: ${objection.trim()}`);
    if (action.trim()) parts.push(`Ação desejada: ${action.trim()}`);
    onFinish({
      contextExtra: parts.join(" · "),
      suggestedTemplate: suggested,
      suggestedCta: inferCta(action),
    });
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-orange" />
            Briefing rápido — passo {step + 1} de {steps.length}
          </DialogTitle>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="font-display font-bold text-lg">{current.title}</h3>
          {current.content}

          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-orange transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setStep(0);
            }}
          >
            Pular
          </Button>
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Voltar
            </Button>
          )}
          {isLast ? (
            <Button type="button" variant="gradient" onClick={handleFinish}>
              <Sparkles className="h-4 w-4 mr-2" />
              Aplicar briefing
            </Button>
          ) : (
            <Button
              type="button"
              variant="gradient"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function inferCta(action: string): string {
  const a = action.toLowerCase().trim();
  if (!a) return "";
  if (a.includes("salv")) return "Salve este post para depois!";
  if (a.includes("coment")) return "Comenta sua opinião abaixo 👇";
  if (a.includes("dm")) return "Manda DM 'EU' que eu te chamo.";
  if (a.includes("link") || a.includes("bio")) return "Link na bio 👀";
  if (a.includes("compart")) return "Compartilha com quem precisa ver isso.";
  if (a.includes("segu")) return "Segue lá para mais conteúdos como este!";
  return action;
}
