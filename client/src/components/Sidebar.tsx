import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Images,
  Sparkles,
  Users,
  History,
  LogOut,
  Coins,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/carrosseis", icon: Images, label: "Carrosséis" },
  { to: "/stories", icon: Sparkles, label: "Stories" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/historico", icon: History, label: "Histórico" },
];

export function Sidebar() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();
  const logout = trpc.auth.logout.useMutation({
    onSuccess() {
      refetch();
      navigate("/login");
      toast.success("Sessão encerrada");
    },
  });

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-card">
      <div className="p-6">
        <Logo variant="full" size={36} />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand-orange/15 text-brand-orange"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Coins className="h-3.5 w-3.5" />
            Créditos
          </div>
          <p className="text-2xl font-display font-bold brand-gradient-text">
            {user?.credits ?? 0}
          </p>
        </div>

        <div className="px-1">
          <p className="text-xs text-muted-foreground">Olá,</p>
          <p className="font-semibold truncate">{user?.name}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => logout.mutate()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
