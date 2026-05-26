import { Link } from "react-router-dom";
import {
  Images,
  Sparkles,
  Users,
  History as HistoryIcon,
  ArrowRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/utils/trpc";
import { formatDateTime } from "@/lib/utils";

export function Dashboard() {
  const { user } = useAuth();
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: carousels } = trpc.carousels.list.useQuery();
  const { data: stories } = trpc.stories.list.useQuery();

  const stats = [
    { label: "Créditos", value: user?.credits ?? 0, icon: Sparkles },
    { label: "Clientes", value: clients?.length ?? 0, icon: Users },
    { label: "Carrosséis", value: carousels?.length ?? 0, icon: Images },
    { label: "Stories", value: stories?.length ?? 0, icon: HistoryIcon },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold">
          Olá, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          Continue de onde parou — escolha uma ação abaixo.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-brand-orange" />
            </div>
            <p className="mt-2 text-3xl font-display font-bold">{s.value}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-display font-bold text-xl">
              Gerar carrossel
            </h3>
            <p className="text-sm text-muted-foreground">
              4 a 10 slides com headlines + legenda AIDA.
            </p>
          </div>
          <Button asChild variant="gradient" className="self-start">
            <Link to="/carrosseis">
              Criar carrossel <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
        <Card className="p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-display font-bold text-xl">Gerar stories</h3>
            <p className="text-sm text-muted-foreground">
              Motivacional ou engajamento, prontos para postar.
            </p>
          </div>
          <Button asChild variant="gradient" className="self-start">
            <Link to="/stories">
              Criar stories <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Carrosséis recentes</CardTitle>
            <Link
              to="/historico"
              className="text-xs text-brand-orange hover:underline"
            >
              Ver tudo
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {carousels?.length ? (
              carousels.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                >
                  <span className="truncate mr-2">{c.prompt}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum carrossel ainda.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Stories recentes</CardTitle>
            <Link
              to="/historico"
              className="text-xs text-brand-orange hover:underline"
            >
              Ver tudo
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {stories?.length ? (
              stories.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                >
                  <span className="truncate mr-2">
                    {s.nicho}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({s.type})
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(s.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma story ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
