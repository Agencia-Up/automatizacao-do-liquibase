import { useState, type FormEvent } from "react";
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
import { Select } from "@/components/ui/select";
import { StoryPreview } from "@/components/StoryPreview";
import type { StorySlide } from "@/utils/canvasRenderer";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/useAuth";

export function Stories() {
  const { refetch: refetchAuth } = useAuth();
  const utils = trpc.useUtils();

  const [nicho, setNicho] = useState("");
  const [type, setType] = useState<"motivacional" | "engajamento">(
    "motivacional"
  );
  const [bgColor, setBgColor] = useState<"branco" | "preto">("branco");
  const [color, setColor] = useState("#F59E0B");
  const [count, setCount] = useState(3);
  const [generated, setGenerated] = useState<StorySlide[] | null>(null);

  const generate = trpc.stories.generate.useMutation({
    onSuccess(data) {
      setGenerated(data.stories as StorySlide[]);
      refetchAuth();
      utils.stories.list.invalidate();
      toast.success(`Stories geradas! ${data.credits} créditos restantes.`);
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nicho.trim().length < 2) {
      toast.error("Informe o nicho");
      return;
    }
    generate.mutate({ nicho, type, bgColor, color, count });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold">Gerar stories</h1>
        <p className="text-muted-foreground">
          Stories prontas no formato 9:16. 1 crédito por geração.
        </p>
      </header>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Parâmetros</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nicho">Nicho</Label>
                <Input
                  id="nicho"
                  placeholder="Ex.: nutrição esportiva, advocacia trabalhista, design"
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  id="type"
                  value={type}
                  onChange={(e) =>
                    setType(
                      e.target.value as "motivacional" | "engajamento"
                    )
                  }
                >
                  <option value="motivacional">Motivacional</option>
                  <option value="engajamento">Engajamento</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bg">Fundo</Label>
                  <Select
                    id="bg"
                    value={bgColor}
                    onChange={(e) =>
                      setBgColor(e.target.value as "branco" | "preto")
                    }
                  >
                    <option value="branco">Claro</option>
                    <option value="preto">Escuro</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="count">Quantidade</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Cor de destaque</Label>
                <div className="flex gap-2 items-center">
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-14 rounded-md bg-transparent border border-border cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>

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
                    Gerar stories
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          {generated && generated.length > 0 ? (
            <StoryPreview
              stories={generated}
              bgColor={bgColor}
              accentColor={color}
            />
          ) : (
            <Card className="p-12 text-center">
              <Sparkles className="h-10 w-10 text-brand-orange mx-auto mb-3" />
              <p className="font-display font-bold text-lg">
                Pronto para gerar
              </p>
              <p className="text-sm text-muted-foreground">
                Suas stories aparecem aqui após a geração.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
