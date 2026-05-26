import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  Pencil,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { trpc } from "@/utils/trpc";

type ClientRecord = {
  id: number;
  name: string;
  instagram: string;
  avatarUrl: string | null;
};

export function Clients() {
  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ClientRecord | null>(
    null
  );

  const createMutation = trpc.clients.create.useMutation({
    onSuccess() {
      utils.clients.list.invalidate();
      setIsOpen(false);
      toast.success("Cliente criado");
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess() {
      utils.clients.list.invalidate();
      setIsOpen(false);
      setEditing(null);
      toast.success("Cliente atualizado");
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess() {
      utils.clients.list.invalidate();
      setConfirmDelete(null);
      toast.success("Cliente removido");
    },
  });

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.instagram.toLowerCase().includes(q)
    );
  }, [clients, query]);

  const openCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };
  const openEdit = (c: ClientRecord) => {
    setEditing(c);
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os perfis de cliente para personalizar carrosséis.
          </p>
        </div>
        <Button variant="gradient" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo cliente
        </Button>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou @"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-10 w-10 text-brand-orange mx-auto mb-3" />
          <p className="font-display font-bold text-lg">Nenhum cliente</p>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione seu primeiro cliente para começar.
          </p>
          <Button variant="gradient" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar cliente
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5 flex gap-3">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-brand-orange/40 shrink-0">
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-white font-display font-bold">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.instagram}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(c as ClientRecord)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(c as ClientRecord)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientForm
        open={isOpen}
        onOpenChange={(v) => {
          setIsOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, ...values });
          } else {
            createMutation.mutate(values);
          }
        }}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover cliente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <strong>{confirmDelete?.name}</strong>? Esta ação não pode ser
            desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDelete && deleteMutation.mutate(confirmDelete.id)
              }
              disabled={deleteMutation.isPending}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientForm({
  open,
  onOpenChange,
  editing,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ClientRecord | null;
  isSaving: boolean;
  onSubmit: (values: {
    name: string;
    instagram: string;
    avatarUrl?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setInstagram(editing?.instagram ?? "");
      setAvatarUrl(editing?.avatarUrl ?? "");
    }
  }, [open, editing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Nome muito curto");
      return;
    }
    if (!/^@?[a-zA-Z0-9._]{2,30}$/.test(instagram.trim())) {
      toast.error("Instagram inválido (use @usuario)");
      return;
    }
    onSubmit({
      name: name.trim(),
      instagram: instagram.trim(),
      avatarUrl: avatarUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ig">Instagram</Label>
            <Input
              id="ig"
              placeholder="@usuario"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Avatar (opcional)</Label>
            <ImageUpload
              onUploadComplete={setAvatarUrl}
              initialUrl={avatarUrl || undefined}
              maxSize={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="gradient" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
