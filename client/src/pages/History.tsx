import { useState } from "react";
import { Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CarouselPreview } from "@/components/CarouselPreview";
import { StoryPreview } from "@/components/StoryPreview";
import type { CarouselSlide, StorySlide } from "@/utils/canvasRenderer";
import { buildTemplateSlides, type TemplateId } from "@/utils/templates";
import {
  FONT_PAIRS,
  ensureFontPairLoaded,
  type FontPairId,
} from "@/utils/fontPairs";
import { trpc } from "@/utils/trpc";
import { formatDateTime } from "@/lib/utils";
import { useEffect } from "react";

export function History() {
  const utils = trpc.useUtils();
  const { data: carousels, isLoading: l1 } = trpc.carousels.list.useQuery();
  const { data: stories, isLoading: l2 } = trpc.stories.list.useQuery();

  const [viewCarousel, setViewCarousel] = useState<number | null>(null);
  const [viewStory, setViewStory] = useState<number | null>(null);
  const [toDeleteCar, setToDeleteCar] = useState<number | null>(null);
  const [toDeleteStory, setToDeleteStory] = useState<number | null>(null);

  const deleteCarousel = trpc.carousels.delete.useMutation({
    onSuccess() {
      utils.carousels.list.invalidate();
      setToDeleteCar(null);
      toast.success("Carrossel removido");
    },
  });
  const deleteStory = trpc.stories.delete.useMutation({
    onSuccess() {
      utils.stories.list.invalidate();
      setToDeleteStory(null);
      toast.success("Story removida");
    },
  });

  const carouselDetail = trpc.carousels.get.useQuery(viewCarousel ?? -1, {
    enabled: viewCarousel !== null,
  });
  const storyDetail = trpc.stories.get.useQuery(viewStory ?? -1, {
    enabled: viewStory !== null,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold">Histórico</h1>
        <p className="text-muted-foreground">
          Reveja, baixe novamente ou exclua produções anteriores.
        </p>
      </header>

      <Tabs defaultValue="carrosseis">
        <TabsList>
          <TabsTrigger value="carrosseis">
            Carrosséis ({carousels?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="stories">
            Stories ({stories?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carrosseis">
          {l1 ? (
            <Card className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </Card>
          ) : carousels && carousels.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {carousels.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-5">
                    <p className="text-xs text-brand-orange uppercase">
                      {c.slideCount} slides · fundo{" "}
                      {c.bgColor === "white" ? "claro" : "escuro"}
                    </p>
                    <p className="mt-2 font-semibold line-clamp-2">{c.prompt}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(c.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewCarousel(c.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDeleteCar(c.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Nenhum carrossel ainda.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stories">
          {l2 ? (
            <Card className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </Card>
          ) : stories && stories.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stories.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-5">
                    <p className="text-xs text-brand-orange uppercase">
                      {s.type} · fundo {s.bgColor}
                    </p>
                    <p className="mt-2 font-semibold line-clamp-2">{s.nicho}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(s.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewStory(s.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDeleteStory(s.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              Nenhuma story ainda.
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* View Carousel */}
      <Dialog
        open={viewCarousel !== null}
        onOpenChange={(v) => !v && setViewCarousel(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Carrossel</DialogTitle>
          </DialogHeader>
          {carouselDetail.data ? (
            <CarouselPreviewFromRecord record={carouselDetail.data} />
          ) : (
            <div className="grid place-items-center p-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Story */}
      <Dialog
        open={viewStory !== null}
        onOpenChange={(v) => !v && setViewStory(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stories</DialogTitle>
          </DialogHeader>
          {storyDetail.data ? (
            <StoryPreview
              stories={storyDetail.data.content as StorySlide[]}
              bgColor={storyDetail.data.bgColor}
              accentColor={storyDetail.data.color}
              filenamePrefix={`story-${storyDetail.data.id}`}
            />
          ) : (
            <div className="grid place-items-center p-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <ConfirmDelete
        open={toDeleteCar !== null}
        onCancel={() => setToDeleteCar(null)}
        onConfirm={() =>
          toDeleteCar !== null && deleteCarousel.mutate(toDeleteCar)
        }
        pending={deleteCarousel.isPending}
        label="carrossel"
      />
      <ConfirmDelete
        open={toDeleteStory !== null}
        onCancel={() => setToDeleteStory(null)}
        onConfirm={() =>
          toDeleteStory !== null && deleteStory.mutate(toDeleteStory)
        }
        pending={deleteStory.isPending}
        label="story"
      />
    </div>
  );
}

function CarouselPreviewFromRecord({ record }: { record: any }) {
  const headlines = record.headlines as string[];
  const caption = record.caption as {
    attention: string;
    interest: string;
    desire: string;
    action: string;
    medium?: string;
  };
  const total = headlines.length;
  const tplId = (record.template as TemplateId) || "vendas";
  const fontPairId = (record.fontPair as FontPairId) || "moderno";
  const tplSlides = buildTemplateSlides(tplId, total);
  const pair = FONT_PAIRS[fontPairId];

  useEffect(() => {
    ensureFontPairLoaded(fontPairId);
  }, [fontPairId]);

  const slides: CarouselSlide[] = headlines.map((headline, i) => {
    const isFirst = i === 0;
    const isLast = total > 1 && i === total - 1;
    const def = tplSlides[i] ?? tplSlides[tplSlides.length - 1];
    let body: string | undefined;
    if (isFirst) body = caption.attention;
    else if (!isLast) {
      const bodies = [caption.interest, caption.desire];
      body = bodies[(i - 1) % bodies.length];
    }
    return {
      type: isFirst ? "cover" : isLast ? "cta" : "middle",
      bgMode: def.bgMode,
      tag: def.tag,
      headline,
      body,
      coverUrl: isFirst ? record.coverUrl ?? undefined : undefined,
      profileUrl: record.profileUrl ?? undefined,
      channelName: record.channelName ?? undefined,
      channelHandle: record.channelHandle ?? undefined,
      ctaText: isLast ? record.ctaText ?? undefined : undefined,
      accent: record.accent ?? undefined,
      accent2: record.accent2 ?? undefined,
      displayFont: pair.display,
      bodyFont: pair.body,
    };
  });
  return (
    <CarouselPreview
      slides={slides}
      captionMedium={caption.medium}
      accent={record.accent}
      filenamePrefix={`carrossel-${record.id}`}
    />
  );
}

function ConfirmDelete({
  open,
  onCancel,
  onConfirm,
  pending,
  label,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover {label}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tem certeza? Esta ação é permanente.
        </p>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              "Remover"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
