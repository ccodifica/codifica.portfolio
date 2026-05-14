import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  CheckCircle2,
  Clock,
  Circle,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Download,
  Mail,
  MessageCircle,
  Save,
  Users,
  Plus,
  Smile,
} from "lucide-react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChatMessage,
  MessageAttachment,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  PresenceStatus,
  ProjectStatus,
  UserRole,
} from "@/types/client-area";
import {
  MAX_ATTACHMENT_BYTES,
  createMessage,
  getUsersByIds,
  listMessagesByProject,
  toggleMessageReaction,
} from "@/lib/client-area-store";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import { UserAvatar } from "./_user-avatar";
import { AttachmentViewer } from "./_attachment-viewer";

export const HORARIOS_DISPONIVEIS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date | undefined {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const tone =
    status === "concluido"
      ? "bg-success/15 text-success border-success/30"
      : status === "aguardando_analise"
      ? "bg-muted text-muted-foreground border-border"
      : "bg-primary/15 text-primary border-primary/30";
  return (
    <span
      className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${tone}`}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

export function TimelineEtapas({
  statusAtual,
}: {
  statusAtual: ProjectStatus;
}) {
  const idxAtual = PROJECT_STATUS_ORDER.indexOf(statusAtual);
  return (
    <ol className="space-y-3">
      {PROJECT_STATUS_ORDER.map((s, i) => {
        const concluida = i < idxAtual || statusAtual === "concluido";
        const atual = i === idxAtual && statusAtual !== "concluido";
        const Icon = concluida ? CheckCircle2 : atual ? Clock : Circle;
        return (
          <li key={s} className="flex items-center gap-3">
            <Icon
              className={`w-5 h-5 flex-shrink-0 ${
                concluida
                  ? "text-success"
                  : atual
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground/40"
              }`}
            />
            <span
              className={`text-sm ${
                atual
                  ? "font-semibold text-foreground"
                  : concluida
                  ? "text-foreground/80"
                  : "text-muted-foreground"
              }`}
            >
              {PROJECT_STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Reações rápidas no popover do botão
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🙏", "🔥"] as const;

export function MessageBubble({
  message,
  mineId,
  mineAvatarUrl,
  mineName,
  minePresence,
  autorAvatarUrl,
  autorPresence,
  isPrimeiraDoGrupo = true,
  isUltimaDoGrupo = true,
  onReact,
  onAttachmentOpen,
}: {
  message: ChatMessage;
  mineId: string;
  mineAvatarUrl?: string;
  mineName?: string;
  minePresence?: PresenceStatus;
  autorAvatarUrl?: string;
  autorPresence?: PresenceStatus;
  isPrimeiraDoGrupo?: boolean;
  isUltimaDoGrupo?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onAttachmentOpen?: (attachment: MessageAttachment) => void;
}) {
  const isMine = message.autorId === mineId;
  const isAdmin = message.autorRole === "admin";

  const formatHora = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Agrupa reações por emoji pra mostrar "👍 2 · ❤️ 1"
  const reacoesAgrupadas = (() => {
    const out: Record<
      string,
      { count: number; userIds: string[]; mineSelected: boolean }
    > = {};
    for (const r of message.reactions ?? []) {
      if (!out[r.emoji]) {
        out[r.emoji] = { count: 0, userIds: [], mineSelected: false };
      }
      out[r.emoji].count++;
      out[r.emoji].userIds.push(r.userId);
      if (r.userId === mineId) out[r.emoji].mineSelected = true;
    }
    return out;
  })();
  const temReacoes = Object.keys(reacoesAgrupadas).length > 0;

  // Avatar — quem aparece ao lado do bubble
  const avatarParaMostrar = isMine ? mineAvatarUrl : autorAvatarUrl;
  const nomeParaAvatar = isMine ? mineName ?? "Você" : message.autorNome;
  const presenceParaMostrar = isMine ? minePresence : autorPresence;

  return (
    <div
      className={`group flex items-end gap-2 ${
        isMine ? "flex-row-reverse" : ""
      } ${isPrimeiraDoGrupo ? "mt-4" : "mt-0.5"}`}
    >
      {/* Avatar: aparece só na última msg do grupo, slot reservado no resto */}
      <div className="w-9 h-9 flex-shrink-0">
        {isUltimaDoGrupo && (
          <UserAvatar
            nome={nomeParaAvatar}
            avatarUrl={avatarParaMostrar}
            presenceStatus={presenceParaMostrar}
            size="sm"
          />
        )}
      </div>

      <div
        className={`flex flex-col max-w-[78%] ${
          isMine ? "items-end" : "items-start"
        }`}
      >
        {/* Linha bubble + botão de reagir */}
        <div
          className={`flex items-center gap-1.5 ${
            isMine ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`px-4 py-2.5 rounded-2xl ${
              isMine
                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md shadow-sm shadow-primary/10"
                : isAdmin
                ? "bg-accent/10 border border-accent/25 text-foreground rounded-tl-md"
                : "bg-muted/70 border border-border/40 text-foreground rounded-tl-md"
            }`}
          >
            {!isMine && isPrimeiraDoGrupo && (
              <div className="text-xs font-semibold mb-1 opacity-80">
                {message.autorNome}
                {isAdmin && " · Codifica"}
              </div>
            )}
            {message.texto && (
              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.texto}
              </div>
            )}
            {message.anexos && message.anexos.length > 0 && (
              <div className={`${message.texto ? "mt-2" : ""} space-y-2`}>
                {message.anexos.map((a) => (
                  <AttachmentChip
                    key={a.id}
                    attachment={a}
                    mine={isMine}
                    onOpen={onAttachmentOpen}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Botão "reagir" — só aparece no hover do grupo, click abre popover */}
          {onReact && (
            <ReactionButton
              isMine={isMine}
              onSelect={(emoji) => onReact(message.id, emoji)}
            />
          )}
        </div>

        {/* Chips de reações existentes */}
        {temReacoes && (
          <div
            className={`flex flex-wrap gap-1 mt-1.5 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {Object.entries(reacoesAgrupadas).map(([emoji, info]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message.id, emoji)}
                title={`${info.count} ${info.count === 1 ? "pessoa reagiu" : "pessoas reagiram"}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-all hover:scale-105 ${
                  info.mineSelected
                    ? "bg-primary/15 border-primary/40 text-foreground"
                    : "bg-muted/40 border-border/60 hover:bg-muted/60"
                }`}
              >
                <span className="text-[13px] leading-none">{emoji}</span>
                <span className="tabular-nums text-[11px] font-semibold">
                  {info.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {isUltimaDoGrupo && (
          <div className="text-[10px] text-muted-foreground mt-1 px-1 tabular-nums">
            {formatHora(message.createdAt)}
          </div>
        )}
      </div>
    </div>
  );
}

// Botão "reagir" — aparece no hover do grupo da mensagem.
// Click abre um Popover com 6 emojis quick + opção "Mais..." que troca pro
// EmojiPicker completo. Usar Popover (controlado) resolve o "hover gap" do
// padrão anterior: o picker fica aberto até o user clicar fora ou num emoji.
function ReactionButton({
  isMine,
  onSelect,
}: {
  isMine: boolean;
  onSelect: (emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mostrarPickerCompleto, setMostrarPickerCompleto] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setMostrarPickerCompleto(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setMostrarPickerCompleto(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Reagir à mensagem"
          className={`w-7 h-7 rounded-full bg-card border border-border/60 hover:bg-muted hover:border-border shadow-sm flex items-center justify-center transition-all ${
            open
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          <Smile className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={isMine ? "end" : "start"}
        side="top"
        sideOffset={6}
        className={
          mostrarPickerCompleto
            ? "p-0 w-auto border-border/60"
            : "p-1.5 w-auto border-border/60"
        }
      >
        {mostrarPickerCompleto ? (
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            skinTonesDisabled
            searchPlaceHolder="Buscar emoji..."
            previewConfig={{ showPreview: false }}
            onEmojiClick={(data) => handleSelect(data.emoji)}
            width={320}
            height={380}
          />
        ) : (
          <div className="flex items-center gap-0.5">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center text-base transition-transform hover:scale-125"
                aria-label={`Reagir com ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <button
              type="button"
              onClick={() => setMostrarPickerCompleto(true)}
              className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-colors"
              aria-label="Mais emojis"
              title="Mais emojis"
            >
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function AttachmentChip({
  attachment,
  mine,
  onOpen,
}: {
  attachment: MessageAttachment;
  mine: boolean;
  onOpen?: (attachment: MessageAttachment) => void;
}) {
  const isImage = attachment.fileType.startsWith("image/");
  const sizeKB = Math.max(1, Math.round(attachment.fileSize / 1024));

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen?.(attachment);
  };

  if (isImage) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="block rounded-lg overflow-hidden border border-border/30 max-w-xs group/img relative"
        title={`Abrir ${attachment.fileName}`}
      >
        <img
          src={attachment.data}
          alt={attachment.fileName}
          className="block max-h-48 w-auto transition-transform duration-300 group-hover/img:scale-[1.02]"
        />
        {/* Overlay sutil no hover */}
        <span
          aria-hidden
          className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"
        >
          <span className="opacity-0 group-hover/img:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
            Clique para abrir
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors text-left w-full ${
        mine
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15 text-primary-foreground"
          : "bg-background/50 hover:bg-background/80 text-foreground border border-border/40"
      }`}
      title={`Abrir ${attachment.fileName}`}
    >
      <FileText className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate font-medium">{attachment.fileName}</span>
      <span className="opacity-70 whitespace-nowrap">{sizeKB} KB</span>
    </button>
  );
}

export function ChatPanel({
  projectId,
  userId,
  userName,
  userRole,
  userAvatarUrl,
  userPresence,
  emptyHint,
}: {
  projectId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userAvatarUrl?: string;
  userPresence?: PresenceStatus;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string | undefined>>(
    {}
  );
  const [presenceMap, setPresenceMap] = useState<
    Record<string, PresenceStatus | undefined>
  >({});
  const [viewingAttachment, setViewingAttachment] =
    useState<MessageAttachment | null>(null);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const carregar = async () => {
      try {
        const msgs = await listMessagesByProject(projectId);
        if (!cancelled) {
          setMessages(msgs);
          setCarregando(false);
        }
      } catch (err) {
        if (!cancelled) {
          setCarregando(false);
          const msg =
            err instanceof Error ? err.message : "Falha ao carregar mensagens.";
          toast.error(msg);
        }
      }
    };
    carregar();

    const channel = supabase
      .channel(`messages-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          if (!cancelled) carregar();
        }
      )
      // Recarrega quando reações são inseridas/removidas em qualquer
      // mensagem (não dá pra filtrar por project_id direto aqui — a tabela
      // de reações não tem essa coluna, então pega tudo e o carregar() já
      // faz join com as msgs deste projeto)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          if (!cancelled) carregar();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Mantém cache local de avatares + status de presença dos autores. Recarrega
  // quando aparecem autorIds novos.
  useEffect(() => {
    const idsUnicos = Array.from(new Set(messages.map((m) => m.autorId)));
    if (idsUnicos.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const users = await getUsersByIds(idsUnicos);
        if (cancelled) return;
        setAvatarMap((prev) => {
          const next = { ...prev };
          users.forEach((u) => {
            next[u.id] = u.avatarUrl;
          });
          return next;
        });
        setPresenceMap((prev) => {
          const next = { ...prev };
          users.forEach((u) => {
            next[u.id] = u.presenceStatus;
          });
          return next;
        });
      } catch (err) {
        console.warn("[ChatPanel] falha ao carregar perfis:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [messages]);

  // Realtime: escuta mudanças nos profiles dos autores (avatar/presence) pra
  // refletir ao vivo. Quando alguém troca foto ou status, o outro lado vê.
  useEffect(() => {
    const idsUnicos = Array.from(new Set(messages.map((m) => m.autorId)));
    if (idsUnicos.length === 0) return;

    const channel = supabase
      .channel(`profiles-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const novo = payload.new as {
            id: string;
            avatar_url: string | null;
            presence_status: PresenceStatus | null;
          };
          if (!idsUnicos.includes(novo.id)) return;
          setAvatarMap((prev) => ({
            ...prev,
            [novo.id]: novo.avatar_url ?? undefined,
          }));
          setPresenceMap((prev) => ({
            ...prev,
            [novo.id]: novo.presence_status ?? "available",
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messages, projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const onFilesPicked = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validos: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error(
          `"${file.name}" excede o limite de ${Math.round(
            MAX_ATTACHMENT_BYTES / 1024 / 1024
          )} MB.`
        );
        continue;
      }
      validos.push(file);
    }
    if (validos.length) setAnexos((a) => [...a, ...validos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removerAnexo = (index: number) => {
    setAnexos((a) => a.filter((_, i) => i !== index));
  };

  const enviar = async () => {
    if (!texto.trim() && anexos.length === 0) return;
    setEnviando(true);
    try {
      const nova = await createMessage({
        projectId,
        autorId: userId,
        autorRole: userRole,
        autorNome: userName,
        texto: texto.trim(),
        anexos: anexos.length > 0 ? anexos : undefined,
      });
      setMessages((m) =>
        m.some((x) => x.id === nova.id) ? m : [...m, nova]
      );
      setTexto("");
      setAnexos([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar.";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  // Toggle de reação — atualiza otimisticamente e o Realtime confirma depois
  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const novasReactions = await toggleMessageReaction(
        messageId,
        userId,
        emoji
      );
      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions:
                  novasReactions.length > 0 ? novasReactions : undefined,
              }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao reagir.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col h-[520px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pr-2 pb-2"
      >
        {carregando ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {emptyHint ?? "Nenhuma mensagem ainda. Mande a primeira!"}
          </div>
        ) : (
          messages.map((m, i) => {
            const anterior = messages[i - 1];
            const proxima = messages[i + 1];
            const MAX_GAP_MS = 5 * 60 * 1000;
            const tsAtual = new Date(m.createdAt).getTime();

            const isPrimeiraDoGrupo =
              !anterior ||
              anterior.autorId !== m.autorId ||
              tsAtual - new Date(anterior.createdAt).getTime() > MAX_GAP_MS;

            const isUltimaDoGrupo =
              !proxima ||
              proxima.autorId !== m.autorId ||
              new Date(proxima.createdAt).getTime() - tsAtual > MAX_GAP_MS;

            return (
              <MessageBubble
                key={m.id}
                message={m}
                mineId={userId}
                mineName={userName}
                mineAvatarUrl={userAvatarUrl}
                minePresence={userPresence}
                autorAvatarUrl={avatarMap[m.autorId]}
                autorPresence={presenceMap[m.autorId]}
                isPrimeiraDoGrupo={isPrimeiraDoGrupo}
                isUltimaDoGrupo={isUltimaDoGrupo}
                onReact={handleReact}
                onAttachmentOpen={setViewingAttachment}
              />
            );
          })
        )}
      </div>

      {anexos.length > 0 && (
        <div className="mt-3 mb-2 flex flex-wrap gap-2">
          {anexos.map((a, idx) => (
            <div
              key={`${a.name}-${idx}`}
              className="inline-flex items-center gap-2 bg-muted/50 border border-border/40 rounded-full pl-3 pr-1 py-1 text-xs"
            >
              {a.type.startsWith("image/") ? (
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className="max-w-[200px] truncate font-medium">
                {a.name}
              </span>
              <button
                type="button"
                onClick={() => removerAnexo(idx)}
                className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Remover anexo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          multiple
          className="hidden"
          onChange={(e) => onFilesPicked(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          title="Anexar arquivo"
          className="flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Inserir emoji"
              className="flex-shrink-0"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 border-border/60 w-auto"
            align="end"
            side="top"
            sideOffset={8}
          >
            <EmojiPicker
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              skinTonesDisabled
              searchPlaceHolder="Buscar emoji..."
              previewConfig={{ showPreview: false }}
              onEmojiClick={(data) => setTexto((t) => t + data.emoji)}
              width={320}
              height={380}
            />
          </PopoverContent>
        </Popover>

        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Escreva uma mensagem..."
        />
        <Button
          onClick={enviar}
          disabled={enviando || (!texto.trim() && anexos.length === 0)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Modal de visualização de anexos (imagem/PDF/outros) */}
      <AttachmentViewer
        attachment={viewingAttachment}
        open={viewingAttachment !== null}
        onOpenChange={(o) => {
          if (!o) setViewingAttachment(null);
        }}
      />
    </div>
  );
}

// Re-export do BriefingDisplay novo (implementação moderna em _briefing-display.tsx)
export { BriefingDisplayV2 as BriefingDisplay } from "./_briefing-display";

export interface MeetingFormValues {
  data: string;
  horario: string;
  topico: string;
  notificarEmail: boolean;
  notificarWhatsapp: boolean;
  participantesExtras: string[];
}

export function MeetingScheduler({
  mode = "client",
  codificaEmail,
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Confirmar agendamento",
  saving = false,
}: {
  mode?: "client" | "admin";
  codificaEmail: string;
  initial?: Partial<MeetingFormValues>;
  onSubmit: (v: MeetingFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  saving?: boolean;
}) {
  const [data, setData] = useState(initial?.data ?? "");
  const [horario, setHorario] = useState(initial?.horario ?? "");
  const [topico, setTopico] = useState(initial?.topico ?? "");
  const [notificarEmail, setNotificarEmail] = useState(
    initial?.notificarEmail ?? true
  );
  const [notificarWhatsapp, setNotificarWhatsapp] = useState(
    initial?.notificarWhatsapp ?? false
  );
  const [participantesExtras, setParticipantesExtras] = useState<string[]>(
    initial?.participantesExtras ?? []
  );
  const [novoEmail, setNovoEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const isValidEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const adicionarEmail = () => {
    const e = novoEmail.trim().toLowerCase();
    if (!e) return;
    if (!isValidEmail(e)) {
      setEmailError("Email inválido.");
      return;
    }
    if (e === codificaEmail.toLowerCase()) {
      setEmailError("A Codifica já está incluída.");
      return;
    }
    if (participantesExtras.includes(e)) {
      setEmailError("Esse email já foi adicionado.");
      return;
    }
    setParticipantesExtras([...participantesExtras, e]);
    setNovoEmail("");
    setEmailError(null);
  };

  const removerEmail = (e: string) => {
    setParticipantesExtras(participantesExtras.filter((x) => x !== e));
  };

  const { hoje, limite } = useMemo(() => {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    const l = new Date(h);
    l.setDate(l.getDate() + 60);
    return { hoje: h, limite: l };
  }, []);

  const dataSelecionada = data ? parseLocalDate(data) : undefined;

  const handleSubmit = () => {
    if (!data) {
      toast.error("Escolha a data da reunião.");
      return;
    }
    if (!horario) {
      toast.error("Escolha o horário da reunião.");
      return;
    }

    // Se ficou email digitado no campo mas o usuário não clicou em "Adicionar",
    // tenta incluir agora antes de submeter (evita descartar silenciosamente).
    let finalExtras = participantesExtras;
    const pendente = novoEmail.trim().toLowerCase();
    if (pendente) {
      if (!isValidEmail(pendente)) {
        setEmailError("Email inválido. Corrija ou remova antes de continuar.");
        return;
      }
      if (pendente === codificaEmail.toLowerCase()) {
        setEmailError("A Codifica já está incluída. Remova do campo antes de continuar.");
        return;
      }
      if (!participantesExtras.includes(pendente)) {
        finalExtras = [...participantesExtras, pendente];
        setParticipantesExtras(finalExtras);
      }
      setNovoEmail("");
      setEmailError(null);
    }

    onSubmit({
      data,
      horario,
      topico,
      notificarEmail,
      notificarWhatsapp,
      participantesExtras: finalExtras,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label className="mb-2 block">Escolha uma data</Label>
          <div className="rounded-xl border border-border/60 bg-card/50 p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={dataSelecionada}
              onSelect={(d) => setData(d ? toLocalDateString(d) : "")}
              disabled={(d) => {
                const dia = d.getDay();
                return d < hoje || d > limite || dia === 0 || dia === 6;
              }}
              weekStartsOn={1}
              className="rounded-md"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Atendemos de segunda a sexta. Janelas até 60 dias à frente.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Horário disponível</Label>
            <div className="grid grid-cols-3 gap-2">
              {HORARIOS_DISPONIVEIS.map((h) => {
                const selecionado = horario === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorario(h)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selecionado
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card/30 hover:border-primary/40"
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="topico-agenda">
              O que você gostaria de conversar? (opcional)
            </Label>
            <Textarea
              id="topico-agenda"
              value={topico}
              onChange={(e) => setTopico(e.target.value)}
              placeholder="Ex.: quero entender melhor o processo, mostrar referências, tirar dúvidas técnicas..."
              rows={4}
              className="mt-2 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 pt-5">
        <Label className="mb-3 block flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Participantes da reunião
        </Label>

        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-card/30 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">C</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Codifica</div>
            <div className="text-xs text-muted-foreground truncate">
              {codificaEmail}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            Incluída
          </span>
        </div>

        {participantesExtras.map((email) => (
          <div
            key={email}
            className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-card/30 mb-2"
          >
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{email}</div>
            </div>
            <button
              type="button"
              onClick={() => removerEmail(email)}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              aria-label={`Remover ${email}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex gap-2 mt-3">
          <Input
            type="email"
            placeholder="Adicionar outro participante (email)"
            value={novoEmail}
            onChange={(e) => {
              setNovoEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarEmail();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={adicionarEmail}
            disabled={!novoEmail.trim()}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>
        {emailError && (
          <p className="text-xs text-destructive mt-2">{emailError}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Você e a Codifica são incluídos automaticamente. Cada participante
          recebe o convite com o link do Google Meet por email.
        </p>
      </div>

      {mode === "admin" && (
        <div className="border-t border-border/40 pt-5">
          <Label className="mb-3 block">
            Controle interno — confirmações (admin)
          </Label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
              <Checkbox
                checked={notificarEmail}
                onCheckedChange={(v) => setNotificarEmail(v === true)}
              />
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Marcar para acompanhar confirmação por <strong>email</strong>.
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
              <Checkbox
                checked={notificarWhatsapp}
                onCheckedChange={(v) => setNotificarWhatsapp(v === true)}
              />
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                Marcar para acompanhar confirmação por <strong>WhatsApp</strong>.
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Save className="w-4 h-4 mr-2" />
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

export function formatDataBR(s?: string): string {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return s;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function buildWhatsappLink(
  numero: string,
  mensagem: string
): string {
  const limpo = numero.replace(/\D/g, "");
  return `https://wa.me/${limpo}?text=${encodeURIComponent(mensagem)}`;
}
