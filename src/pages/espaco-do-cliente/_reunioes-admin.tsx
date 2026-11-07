import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CalendarClock, CalendarDays, Clock, ExternalLink, History, MessageSquare, Save, Video } from "lucide-react";
import { MEETING_STATUS_LABEL, Meeting, MeetingStatus, Project, User } from "@/types/client-area";
import { MEETING_STATUS_BADGES, createMeeting, listMeetingsByProject, updateMeeting } from "@/lib/client-area-store";
import { toast } from "@/components/ui/sonner";
import { buildWhatsappLink, formatDataBR } from "./_shared";
import { emailService } from "@/services/emailService";

/**
 * Reuniões de um projeto de sistema (admin). Extraído do painel antigo
 * (Admin.tsx, guardado na tag espaco-do-cliente-v1) para a aba Sistemas.
 */

const MEETING_STATUS_VALUES: MeetingStatus[] = ["agendada", "confirmada", "realizada", "cancelada", "remarcada"];

/** Admin marca uma reunião (cria a sala no Google Meet quando a integração responde). */
export const AgendarReuniao = ({
  project,
  cliente,
  onAgendada,
}: {
  project: Project;
  cliente?: User;
  onAgendada: () => void;
}) => {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [topico, setTopico] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!cliente) return null;

  const agendar = async () => {
    if (!data || !horario) {
      toast.error("Escolha data e horário.");
      return;
    }
    setSalvando(true);
    try {
      await createMeeting({
        projectId: project.id,
        clienteId: cliente.id,
        data,
        horario,
        topico: topico.trim(),
        notificarEmail: true,
        notificarWhatsapp: true,
        participantesExtras: [],
        clienteEmail: cliente.email,
        clienteNome: cliente.nome,
        projectName: project.nome,
      });
      toast.success("Reunião agendada. Ela aparece no painel do cliente.");
      setAberto(false);
      setData("");
      setHorario("");
      setTopico("");
      onAgendada();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar.");
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) {
    return (
      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setAberto(true)}>
        <CalendarDays className="w-4 h-4 mr-1.5" /> Agendar reunião
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Horário</Label>
          <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="mt-1 h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Pauta</Label>
        <Input
          value={topico}
          onChange={(e) => setTopico(e.target.value)}
          placeholder="Ex.: entender o fluxo de agendamento"
          className="mt-1 h-9"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={salvando} onClick={agendar} className="rounded-lg">
          {salvando ? "Agendando..." : "Agendar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};
export const ReuniaoTab = ({
  project,
  cliente,
  onAfterChange,
}: {
  project: Project;
  cliente?: User;
  onAfterChange: () => void;
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ms = await listMeetingsByProject(project.id);
        if (!cancelled) setMeetings(ms);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Erro ao carregar reuniões.";
          toast.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const recarregar = async () => {
    try {
      const ms = await listMeetingsByProject(project.id);
      setMeetings(ms);
      onAfterChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao recarregar.";
      toast.error(msg);
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-border/60 bg-card/50 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2">
          Nenhuma reunião agendada para este projeto
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Use "Agendar reunião" acima para marcar a próxima conversa.
        </p>
      </div>
    );
  }

  // Próximas: tudo que não foi cancelada nem realizada (admin precisa agir nelas).
  const proximas = meetings
    .filter((m) => m.status !== "cancelada" && m.status !== "realizada")
    .sort((a, b) =>
      a.data === b.data
        ? a.horario.localeCompare(b.horario)
        : a.data.localeCompare(b.data)
    );

  // Arquivadas: canceladas e realizadas (referência / edição pós-reunião).
  const arquivadas = meetings
    .filter((m) => m.status === "cancelada" || m.status === "realizada")
    .sort((a, b) =>
      a.data === b.data
        ? b.horario.localeCompare(a.horario)
        : b.data.localeCompare(a.data)
    );

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/40">
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <CalendarClock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">
              Ativas e próximas
            </h3>
            <p className="text-xs text-muted-foreground">
              {proximas.length === 0
                ? "Sem reuniões aguardando ação no momento."
                : `${proximas.length} reuni${proximas.length === 1 ? "ão" : "ões"} a acompanhar (agendada/confirmada/remarcada).`}
            </p>
          </div>
        </div>

        {proximas.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border/50 bg-card/30 text-center text-sm text-muted-foreground">
            Nenhuma reunião aguardando ação.
          </div>
        ) : (
          <div className="grid gap-4">
            {proximas.map((m) => (
              <MeetingAdminCard
                key={m.id}
                meeting={m}
                cliente={cliente}
                projectName={project.nome}
                onSaved={recarregar}
              />
            ))}
          </div>
        )}
      </section>

      {arquivadas.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/40">
            <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center">
              <History className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                Histórico: canceladas e realizadas
              </h3>
              <p className="text-xs text-muted-foreground">
                {arquivadas.length} reuni{arquivadas.length === 1 ? "ão" : "ões"}{" "}
                arquivada{arquivadas.length === 1 ? "" : "s"}. Ainda dá pra editar status, anexar gravação ou ajustar observações.
              </p>
            </div>
          </div>

          <Accordion type="single" collapsible className="space-y-2">
            {arquivadas.map((m) => (
              <AccordionItem
                key={m.id}
                value={m.id}
                className="border border-border/40 rounded-xl bg-card/40 px-4 data-[state=open]:bg-card/60 data-[state=open]:border-border/60 transition-colors"
              >
                <AccordionTrigger className="hover:no-underline py-3 [&[data-state=open]>div>span.chevron-hint]:hidden">
                  <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-sm font-semibold whitespace-nowrap">
                        {formatDataBR(m.data)}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {m.horario}
                        </span>
                      </div>
                      {m.topico && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          · {m.topico}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${MEETING_STATUS_BADGES[m.status]}`}
                    >
                      {MEETING_STATUS_LABEL[m.status]}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <MeetingAdminCard
                    meeting={m}
                    cliente={cliente}
                    projectName={project.nome}
                    onSaved={recarregar}
                    embedded
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
};

export const MeetingAdminCard = ({
  meeting,
  cliente,
  projectName,
  onSaved,
  embedded = false,
}: {
  meeting: Meeting;
  cliente?: User;
  projectName: string;
  onSaved: () => void;
  embedded?: boolean;
}) => {
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [meetLink, setMeetLink] = useState(meeting.meetLink ?? "");
  const [observacoes, setObservacoes] = useState(meeting.observacoes ?? "");
  const [data, setData] = useState(meeting.data);
  const [horario, setHorario] = useState(meeting.horario);

  const salvar = async () => {
    try {
      const novoMeetLink = meetLink.trim();
      const antigoMeetLink = (meeting.meetLink ?? "").trim();
      const meetLinkMudou =
        novoMeetLink !== "" && novoMeetLink !== antigoMeetLink;

      await updateMeeting(meeting.id, {
        status,
        meetLink: novoMeetLink || undefined,
        observacoes: observacoes.trim() || undefined,
        data,
        horario,
      });
      toast.success("Reunião atualizada.");
      onSaved();

      if (meetLinkMudou && cliente && meeting.notificarEmail) {
        emailService
          .sendMeetingLinkReady({
            toEmail: cliente.email,
            toName: cliente.nome,
            meetingDate: formatDataBR(data),
            meetingTime: horario,
            meetLink: novoMeetLink,
            projectName,
          })
          .then(() => toast.success("Link enviado ao cliente por e-mail."))
          .catch((err) => {
            console.warn("Falha ao enviar e-mail do link:", err);
            toast.error("Reunião salva, mas falhou ao enviar o e-mail do link.");
          });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(msg);
    }
  };

  const whatsappMsg = cliente
    ? `Olá, ${cliente.nome.split(" ")[0]}! Confirmando nossa reunião dia ${formatDataBR(
        data
      )} às ${horario}.${meetLink ? ` Link do Meet: ${meetLink}` : ""}`
    : "";

  return (
    <div
      className={
        embedded
          ? "p-0"
          : "p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50"
      }
    >
      {!embedded && (
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Reunião com {cliente?.nome ?? "cliente"}
            </div>
            <h3 className="text-xl font-bold">{formatDataBR(data)}</h3>
            <div className="text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-4 h-4" />
              <span>{horario}</span>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${MEETING_STATUS_BADGES[status]}`}
          >
            {MEETING_STATUS_LABEL[status]}
          </span>
        </div>
      )}

      {meeting.topico && (
        <div className="mb-5 p-3 rounded-lg bg-muted/40 border border-border/40">
          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
            Pauta do cliente
          </div>
          <div className="text-sm whitespace-pre-wrap">{meeting.topico}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-xs">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as MeetingStatus)}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEETING_STATUS_VALUES.map((s) => (
                <SelectItem key={s} value={s}>
                  {MEETING_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Data</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Horário</Label>
          <Input
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs flex items-center gap-1">
          <Video className="w-3.5 h-3.5" /> Link do Google Meet
        </Label>
        <Input
          value={meetLink}
          onChange={(e) => setMeetLink(e.target.value)}
          placeholder="https://meet.google.com/..."
          className="mt-1 h-9 text-sm"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Cole aqui o link do Meet. O cliente vai ver no painel dele.
        </p>
      </div>

      <div className="mb-4">
        <Label className="text-xs">Observações internas</Label>
        <Textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          className="mt-1 resize-none text-sm"
          placeholder="Anotações da reunião (não aparecem para o cliente)"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={salvar}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar
        </Button>
        {meeting.notificarWhatsapp && cliente?.celular && (
          <a
            href={buildWhatsappLink(cliente.celular, whatsappMsg)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/60 text-sm hover:bg-muted/30"
          >
            <MessageSquare className="w-4 h-4" />
            Confirmar via WhatsApp
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
