import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  LogOut,
  MessageSquare,
  CalendarDays,
  FileText,
  Activity,
  Video,
  Mail,
  Clock,
  ExternalLink,
  RotateCcw,
  Ban,
  Bell,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MEETING_STATUS_LABEL,
  Meeting,
  PROJECT_TYPE_LABEL,
  Project,
  ProjectEvent,
  PROJECT_STATUS_LABEL,
} from "@/types/client-area";
import {
  MEETING_STATUS_BADGES,
  createMeeting,
  listEventsByProject,
  listMeetingsByProject,
  listProjectsByCliente,
  updateMeeting,
} from "@/lib/client-area-store";
import {
  BriefingDisplay,
  ChatPanel,
  MeetingScheduler,
  StatusBadge,
  TimelineEtapas,
  buildWhatsappLink,
  formatDataBR,
} from "./_shared";
import { toast } from "@/components/ui/sonner";
import { emailService } from "@/services/emailService";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const meus = await listProjectsByCliente(user.id);
        if (cancelled) return;
        setProjects(meus);
        if (meus.length === 1) setSelectedId(meus[0].id);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Erro ao carregar projetos.";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/espaco-do-cliente", { replace: true });
  };

  const selecionado = projects.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-manrope">
                  Olá, {user?.nome.split(" ")[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                  Bem-vindo ao seu Espaço do Cliente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/espaco-do-cliente/questionario">
                  <Button
                    variant="outline"
                    className="border-primary/40 text-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo projeto
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-muted-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>

            {selecionado ? (
              <ProjectDetail
                project={selecionado}
                userId={user!.id}
                userName={user!.nome}
                userEmail={user!.email}
                userCelular={user!.celular}
                onBack={
                  projects.length > 1 ? () => setSelectedId(null) : undefined
                }
              />
            ) : projects.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-4">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={() => setSelectedId(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const EmptyState = () => (
  <div className="text-center py-16 px-6 bg-card/40 border border-border/60 rounded-2xl">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
      <MessageSquare className="w-7 h-7 text-primary" />
    </div>
    <h2 className="text-xl font-bold mb-2">Você ainda não tem projetos</h2>
    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
      Comece preenchendo o briefing para que possamos analisar e te apresentar
      uma proposta personalizada.
    </p>
    <Link to="/espaco-do-cliente/questionario">
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Plus className="w-4 h-4 mr-2" />
        Iniciar briefing
      </Button>
    </Link>
  </div>
);

const ProjectCard = ({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left p-6 rounded-2xl border border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 transition-all duration-200 hover:-translate-y-0.5"
  >
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">
          {PROJECT_TYPE_LABEL[project.tipo]}
        </div>
        <h3 className="text-lg font-bold truncate">{project.nome}</h3>
      </div>
      <StatusBadge status={project.status} />
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progresso</span>
        <span>{project.progresso}%</span>
      </div>
      <Progress value={project.progresso} className="h-2" />
    </div>
  </button>
);

const ProjectDetail = ({
  project,
  userId,
  userName,
  userEmail,
  userCelular,
  onBack,
}: {
  project: Project;
  userId: string;
  userName: string;
  userEmail: string;
  userCelular: string;
  onBack?: () => void;
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ms, es] = await Promise.all([
          listMeetingsByProject(project.id),
          listEventsByProject(project.id),
        ]);
        if (cancelled) return;
        setMeetings(ms);
        setEvents(es);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Erro ao carregar projeto.";
          toast.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const reloadMeetings = async () => {
    try {
      const ms = await listMeetingsByProject(project.id);
      setMeetings(ms);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao recarregar.";
      toast.error(msg);
    }
  };

  const proximaReuniao = encontrarProximaReuniao(meetings);

  return (
    <div className="space-y-6">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para a lista
        </Button>
      )}

      <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {PROJECT_TYPE_LABEL[project.tipo]}
            </div>
            <h2 className="text-2xl font-bold">{project.nome}</h2>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso do projeto</span>
            <span>{project.progresso}%</span>
          </div>
          <Progress value={project.progresso} className="h-2.5" />
        </div>
      </div>

      <Tabs defaultValue="andamento" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto">
          <TabsTrigger value="andamento" className="gap-2 py-2">
            <Activity className="w-4 h-4" /> Andamento
          </TabsTrigger>
          <TabsTrigger value="briefing" className="gap-2 py-2">
            <FileText className="w-4 h-4" /> Briefing
          </TabsTrigger>
          <TabsTrigger value="reuniao" className="gap-2 py-2">
            <CalendarDays className="w-4 h-4" /> Reunião
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="gap-2 py-2">
            <MessageSquare className="w-4 h-4" /> Mensagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="andamento" className="mt-6 space-y-6">
          {proximaReuniao && (
            <ProximaReuniaoAviso meeting={proximaReuniao} />
          )}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-border/60 bg-card/50">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Etapas do projeto
              </h3>
              <TimelineEtapas statusAtual={project.status} />
            </div>
            <div className="p-6 rounded-2xl border border-border/60 bg-card/50">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
                Histórico
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  A equipe vai registrar aqui os marcos do seu projeto (briefing
                  aprovado, design entregue, etc.).
                </p>
              ) : (
                <ul className="space-y-4">
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="border-l-2 border-primary/40 pl-4 pb-1"
                    >
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {PROJECT_STATUS_LABEL[e.fase]} ·{" "}
                        {new Date(e.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="font-semibold text-sm">{e.titulo}</div>
                      {e.descricao && (
                        <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {e.descricao}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="briefing" className="mt-6">
          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <BriefingDisplay briefing={project.briefing} />
          </div>
        </TabsContent>

        <TabsContent value="reuniao" className="mt-6">
          <ReuniaoCliente
            projectId={project.id}
            projectName={project.nome}
            clienteId={userId}
            meetings={meetings}
            userCelular={userCelular}
            userName={userName}
            userEmail={userEmail}
            onChanged={reloadMeetings}
          />
        </TabsContent>

        <TabsContent value="mensagens" className="mt-6">
          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <div className="mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Conversa com a equipe
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você pode anexar imagens, PDF, Word e outros arquivos (máx. 1 MB
                por arquivo nesta versão).
              </p>
            </div>
            <ChatPanel
              projectId={project.id}
              userId={userId}
              userName={userName}
              userRole="cliente"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function encontrarProximaReuniao(meetings: Meeting[]): Meeting | undefined {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const futuras = meetings
    .filter(
      (m) =>
        m.status !== "cancelada" &&
        m.status !== "realizada" &&
        (() => {
          const [y, mo, d] = m.data.split("-").map(Number);
          if (!y || !mo || !d) return false;
          return new Date(y, mo - 1, d) >= hoje;
        })()
    )
    .sort((a, b) =>
      a.data === b.data ? a.horario.localeCompare(b.horario) : a.data.localeCompare(b.data)
    );
  return futuras[0];
}

const ProximaReuniaoAviso = ({ meeting }: { meeting: Meeting }) => (
  <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
      <Bell className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
        Próxima reunião
      </div>
      <div className="font-bold">
        {formatDataBR(meeting.data)} às {meeting.horario}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {meeting.meetLink
          ? "O link do Google Meet já está disponível na aba Reunião."
          : "O link do Google Meet será enviado por e-mail antes do horário."}
      </div>
    </div>
  </div>
);

type ScheduleMode = { kind: "novo" } | { kind: "reagendar"; meetingId: string };

const ReuniaoCliente = ({
  projectId,
  projectName,
  clienteId,
  meetings,
  userCelular,
  userName,
  userEmail,
  onChanged,
}: {
  projectId: string;
  projectName: string;
  clienteId: string;
  meetings: Meeting[];
  userCelular: string;
  userName: string;
  userEmail: string;
  onChanged: () => void;
}) => {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode | null>(null);
  const [saving, setSaving] = useState(false);

  const ativas = meetings.filter((m) => m.status !== "cancelada");
  const reagendando = scheduleMode?.kind === "reagendar"
    ? meetings.find((m) => m.id === scheduleMode.meetingId)
    : undefined;

  const handleSubmit = async (values: {
    data: string;
    horario: string;
    topico: string;
    notificarEmail: boolean;
    notificarWhatsapp: boolean;
  }) => {
    setSaving(true);
    try {
      if (reagendando) {
        await updateMeeting(reagendando.id, {
          data: values.data,
          horario: values.horario,
          topico: values.topico,
          status: "remarcada",
        });
        toast.success("Reunião reagendada.");
        if (reagendando.notificarEmail) {
          emailService
            .sendMeetingScheduled({
              toEmail: userEmail,
              toName: userName,
              meetingDate: formatDataBR(values.data),
              meetingTime: values.horario,
              meetingTopic: values.topico,
              projectName,
            })
            .catch((err) =>
              console.warn("Falha ao enviar e-mail de reagendamento:", err)
            );
        }
      } else {
        await createMeeting({
          projectId,
          clienteId,
          data: values.data,
          horario: values.horario,
          topico: values.topico,
          notificarEmail: values.notificarEmail,
          notificarWhatsapp: values.notificarWhatsapp,
        });
        toast.success("Reunião agendada! Você vai receber a confirmação.");
        if (values.notificarEmail) {
          emailService
            .sendMeetingScheduled({
              toEmail: userEmail,
              toName: userName,
              meetingDate: formatDataBR(values.data),
              meetingTime: values.horario,
              meetingTopic: values.topico,
              projectName,
            })
            .catch((err) =>
              console.warn("Falha ao enviar e-mail de agendamento:", err)
            );
        }
      }
      setScheduleMode(null);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = async (m: Meeting) => {
    if (!window.confirm(`Tem certeza que deseja cancelar a reunião do dia ${formatDataBR(m.data)} às ${m.horario}?`)) {
      return;
    }
    try {
      await updateMeeting(m.id, { status: "cancelada" });
      toast.success("Reunião cancelada.");
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar.";
      toast.error(msg);
    }
  };

  if (scheduleMode) {
    return (
      <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
        <div className="mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            {reagendando ? "Reagendar reunião" : "Agendar nova reunião"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {reagendando
              ? "Escolha um novo horário. O status muda para Remarcada."
              : "A reunião acontece pelo Google Meet. Em 30 minutos a gente alinha o projeto."}
          </p>
        </div>
        <MeetingScheduler
          initial={{
            data: reagendando?.data,
            horario: reagendando?.horario,
            topico: reagendando?.topico ?? "",
            notificarEmail: reagendando?.notificarEmail ?? true,
            notificarWhatsapp: reagendando?.notificarWhatsapp ?? false,
          }}
          onSubmit={handleSubmit}
          onCancel={() => setScheduleMode(null)}
          submitLabel={reagendando ? "Salvar novo horário" : "Confirmar agendamento"}
          saving={saving}
        />
      </div>
    );
  }

  if (ativas.length === 0) {
    return (
      <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2">
          Nenhuma reunião agendada ainda
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-5">
          Recomendamos marcar uma conversa de até 30 minutos pelo Google Meet
          para alinharmos o projeto. Você pode marcar agora mesmo.
        </p>
        <Button
          onClick={() => setScheduleMode({ kind: "novo" })}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Agendar reunião
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {ativas.length} reunião(ões) ativa(s) neste projeto.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setScheduleMode({ kind: "novo" })}
          className="border-primary/40 hover:bg-primary/10 hover:text-primary"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Nova reunião
        </Button>
      </div>
      {meetings.map((m) => (
        <ReuniaoCard
          key={m.id}
          meeting={m}
          userCelular={userCelular}
          userName={userName}
          onReagendar={() =>
            setScheduleMode({ kind: "reagendar", meetingId: m.id })
          }
          onCancelar={() => handleCancelar(m)}
        />
      ))}
    </div>
  );
};

const ReuniaoCard = ({
  meeting,
  userCelular,
  userName,
  onReagendar,
  onCancelar,
}: {
  meeting: Meeting;
  userCelular: string;
  userName: string;
  onReagendar: () => void;
  onCancelar: () => void;
}) => {
  const whatsappMsg = `Olá! Aqui é ${userName}, gostaria de confirmar a reunião do dia ${formatDataBR(
    meeting.data
  )} às ${meeting.horario}.`;

  const cancelada = meeting.status === "cancelada";
  const realizada = meeting.status === "realizada";
  const podeEditar = !cancelada && !realizada;

  return (
    <div
      className={`p-6 md:p-8 rounded-2xl border bg-card/50 ${
        cancelada
          ? "border-border/40 opacity-70"
          : "border-border/60"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Reunião pelo Google Meet
          </div>
          <h3 className={`text-xl font-bold ${cancelada ? "line-through" : ""}`}>
            {formatDataBR(meeting.data)}
          </h3>
          <div className="text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-4 h-4" />
            <span>{meeting.horario}</span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full border whitespace-nowrap ${MEETING_STATUS_BADGES[meeting.status]}`}
        >
          {MEETING_STATUS_LABEL[meeting.status]}
        </span>
      </div>

      {meeting.topico && (
        <div className="mb-5 p-3 rounded-lg bg-muted/40 border border-border/40">
          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
            Pauta
          </div>
          <div className="text-sm whitespace-pre-wrap">{meeting.topico}</div>
        </div>
      )}

      {!cancelada && (
        <>
          {meeting.meetLink ? (
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              <Video className="w-4 h-4" />
              Entrar na reunião
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/40 border border-border/40 text-sm text-muted-foreground">
              <Video className="w-4 h-4" />
              O link do Google Meet será enviado em breve por e-mail.
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-border/40 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Confirmações
            </div>
            {meeting.notificarEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Confirmação por e-mail</span>
              </div>
            )}
            {meeting.notificarWhatsapp && userCelular && (
              <a
                href={buildWhatsappLink(userCelular, whatsappMsg)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <MessageSquare className="w-4 h-4" />
                Confirmar pelo WhatsApp
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </>
      )}

      {podeEditar && (
        <div className="mt-5 pt-5 border-t border-border/40 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReagendar}
            className="border-border/60 hover:bg-muted/40"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reagendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelar}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Ban className="w-3.5 h-3.5 mr-2" />
            Cancelar reunião
          </Button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
