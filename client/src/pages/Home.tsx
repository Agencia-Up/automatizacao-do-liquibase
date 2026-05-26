import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Images, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

export function Home() {
  return (
    <div className="min-h-full">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Logo variant="full" size={36} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild variant="gradient">
              <Link to="/login">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
          <Wand2 className="h-3 w-3 text-brand-orange" />
          Carrosséis e Stories para Instagram com IA
        </p>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-tight">
          Conteúdo <span className="brand-gradient-text">profissional</span>
          <br />
          em minutos, não em horas.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          A Logos IA gera carrosséis (1080×1350) e stories (1080×1920)
          prontos para baixar, usando inteligência artificial e frameworks de
          copywriting — com tudo organizado por cliente.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" variant="gradient">
            <Link to="/login">
              Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 grid sm:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="p-6">
            <f.icon className="h-6 w-6 text-brand-orange mb-3" />
            <h3 className="font-display font-bold text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Logos IA · feito com IA e Canvas
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Images,
    title: "Carrosséis 1080×1080",
    body: "Capa, slides intermediários e CTA com tipografia bem cuidada e cores da sua marca.",
  },
  {
    icon: Sparkles,
    title: "Stories 1080×1920",
    body: "Motivacionais ou de engajamento, prontos para postar — com paleta personalizável.",
  },
  {
    icon: Wand2,
    title: "Copywriting AIDA",
    body: "Atenção, Interesse, Desejo e Ação geradas automaticamente para cada carrossel.",
  },
];
