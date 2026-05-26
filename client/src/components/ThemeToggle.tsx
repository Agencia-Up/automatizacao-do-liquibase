import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Modo claro" : "Modo escuro";

  return (
    <Button
      variant="secondary"
      size={showLabel ? "sm" : "icon"}
      onClick={toggle}
      className={cn(className)}
      title={label}
      aria-label={label}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">{label}</span>}
    </Button>
  );
}
