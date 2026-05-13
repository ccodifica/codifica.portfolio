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
} from "lucide-react";
import {
  ChatMessage,
  MessageAttachment,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  ProjectStatus,
  QuestionnaireData,
  UserRole,
} from "@/types/client-area";
import {
  MAX_ATTACHMENT_BYTES,
  createMessage,
  listMessagesByProject,
} from "@/lib/client-area-store";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

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

export function MessageBubble({
  message,
  mineId,
}: {
  message: ChatMessage;
  mineId: string;
}) {
  const isMine = message.autorId === mineId;
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? "bg-primary text-primary-foreground"
            : message.autorRole === "admin"
            ? "bg-accent/15 text-foreground border border-accent/30"
            : "bg-muted text-foreground"
        }`}
      >
        {!isMine && (
          <div className="text-xs font-semibold mb-1 opacity-80">
            {message.autorNome}
            {message.autorRole === "admin" && " · Codifica"}
          </div>
        )}
        {message.texto && (
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.texto}
          </div>
        )}
        {message.anexos && message.anexos.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.anexos.map((a) => (
              <AttachmentChip key={a.id} attachment={a} mine={isMine} />
            ))}
          </div>
        )}
        <div
          className={`text-[10px] mt-1 ${
            isMine ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {new Date(message.createdAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({
  attachment,
  mine,
}: {
  attachment: MessageAttachment;
  mine: boolean;
}) {
  const isImage = attachment.fileType.startsWith("image/");
  const sizeKB = Math.max(1, Math.round(attachment.fileSize / 1024));

  if (isImage) {
    return (
      <a
        href={attachment.data}
        download={attachment.fileName}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg overflow-hidden border border-border/30 max-w-xs"
        title={attachment.fileName}
      >
        <img
          src={attachment.data}
          alt={attachment.fileName}
          className="block max-h-48 w-auto"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.data}
      download={attachment.fileName}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
        mine
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/15 text-primary-foreground"
          : "bg-background/50 hover:bg-background/80 text-foreground border border-border/40"
      }`}
    >
      <FileText className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate font-medium">{attachment.fileName}</span>
      <span className="opacity-70 whitespace-nowrap">{sizeKB} KB</span>
      <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
    </a>
  );
}

export function ChatPanel({
  projectId,
  userId,
  userName,
  userRole,
  emptyHint,
}: {
  projectId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [projectId]);

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

  return (
    <div className="flex flex-col h-[520px]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 space-y-3"
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
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} mineId={userId} />
          ))
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
    </div>
  );
}

export function BriefingDisplay({ briefing }: { briefing: QuestionnaireData }) {
  return (
    <div className="space-y-5">
      <Section title="Cliente">
        <Item label="Nome" value={briefing.nome} />
        <Item label="E-mail" value={briefing.email} />
        <Item label="Telefone" value={briefing.celular} />
        {briefing.empresa && <Item label="Empresa" value={briefing.empresa} />}
        {briefing.cargo && <Item label="Cargo" value={briefing.cargo} />}
        {briefing.ramo && <Item label="Ramo" value={briefing.ramo} />}
      </Section>

      <Section title="Projeto">
        <Item label="Objetivo" value={briefing.objetivoFrase} />
        {briefing.entregas.length > 0 && (
          <Item label="Entregas" value={briefing.entregas.join(", ")} />
        )}
        {briefing.publicoAlvo && (
          <Item label="Público-alvo" value={briefing.publicoAlvo} />
        )}
      </Section>

      {Object.keys(briefing.detalhesTecnicos).length > 0 && (
        <Section title="Detalhes técnicos">
          {Object.entries(briefing.detalhesTecnicos).map(([k, v]) => (
            <Item
              key={k}
              label={k}
              value={
                Array.isArray(v)
                  ? v.join(", ")
                  : typeof v === "boolean"
                  ? v
                    ? "Sim"
                    : "Não"
                  : String(v)
              }
            />
          ))}
        </Section>
      )}

      <Section title="Identidade & referências">
        {briefing.temIdentidade && (
          <Item label="Identidade" value={briefing.temIdentidade} />
        )}
        {briefing.temDominio && (
          <Item label="Domínio" value={briefing.temDominio} />
        )}
        {briefing.referencias && (
          <Item label="Referências" value={briefing.referencias} />
        )}
        {briefing.estiloDesejado && (
          <Item label="Estilo" value={briefing.estiloDesejado} />
        )}
      </Section>

      <Section title="Prazo & investimento">
        {briefing.prazo && <Item label="Prazo" value={briefing.prazo} />}
        {briefing.orcamento && (
          <Item label="Orçamento" value={briefing.orcamento} />
        )}
        {briefing.comoConheceu && (
          <Item label="Como conheceu" value={briefing.comoConheceu} />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        {title}
      </h4>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-muted-foreground sm:w-36 sm:flex-shrink-0">
        {label}
      </dt>
      <dd className="text-foreground/90 break-words flex-1">{value || "—"}</dd>
    </div>
  );
}

export interface MeetingFormValues {
  data: string;
  horario: string;
  topico: string;
  notificarEmail: boolean;
  notificarWhatsapp: boolean;
}

export function MeetingScheduler({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Confirmar agendamento",
  saving = false,
}: {
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
    onSubmit({ data, horario, topico, notificarEmail, notificarWhatsapp });
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
        <Label className="mb-3 block">Como receber a confirmação?</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
            <Checkbox
              checked={notificarEmail}
              onCheckedChange={(v) => setNotificarEmail(v === true)}
            />
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Por <strong>e-mail</strong> — com o link do Google Meet.
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
            <Checkbox
              checked={notificarWhatsapp}
              onCheckedChange={(v) => setNotificarWhatsapp(v === true)}
            />
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Também por <strong>WhatsApp</strong> — no número cadastrado.
            </span>
          </label>
        </div>
      </div>

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
