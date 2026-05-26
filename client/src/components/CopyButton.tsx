import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "secondary" | "ghost" | "outline" | "gradient";
  className?: string;
  iconOnly?: boolean;
}

export function CopyButton({
  text,
  label = "Copiar",
  size = "sm",
  variant = "secondary",
  className,
  iconOnly,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : size}
      onClick={handleClick}
      className={cn(className)}
      aria-label={label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {!iconOnly && <span className="ml-2">{copied ? "Copiado" : label}</span>}
    </Button>
  );
}
