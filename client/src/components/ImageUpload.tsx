import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  maxSize?: number; // MB
  accept?: string[];
  initialUrl?: string;
}

export function ImageUpload({
  onUploadComplete,
  maxSize = 5,
  accept = ["image/jpeg", "image/png", "image/webp"],
  initialUrl,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!accept.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado");
      return;
    }
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Arquivo muito grande (máximo ${maxSize}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Upload falhou");
      }
      const data = (await response.json()) as { url: string };
      onUploadComplete(data.url);
      setPreview(data.url);
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Erro no upload");
      setPreview(initialUrl ?? null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onUploadComplete("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card
      className={cn(
        "border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
        isDragging
          ? "border-brand-orange bg-orange-500/5"
          : "border-border hover:border-brand-orange/50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
      {preview ? (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="max-h-56 mx-auto rounded-lg object-cover"
          />
          {isUploading ? (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClear}
              type="button"
            >
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 py-4">
          <Upload className="h-10 w-10 text-brand-orange mx-auto" />
          <p className="font-semibold">Arraste a imagem ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground">
            Máx. {maxSize}MB · PNG, JPG ou WebP
          </p>
        </div>
      )}
    </Card>
  );
}
