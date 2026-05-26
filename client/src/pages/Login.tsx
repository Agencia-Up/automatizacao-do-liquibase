import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/hooks/useAuth";

export function Login() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess() {
      refetch();
      toast.success("Bem-vindo!");
      navigate("/dashboard");
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast.error("Preencha email e nome");
      return;
    }
    login.mutate({ email, name });
  };

  return (
    <div className="min-h-full grid place-items-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center items-center gap-3">
          <Logo variant="mark" size={56} />
          <CardTitle>Entrar na Logos IA</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use seu nome e email. Você ganha 10 créditos para começar.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              variant="gradient"
              className="w-full"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar / Criar conta"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Em produção, troque por Manus OAuth (variáveis no .env).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
