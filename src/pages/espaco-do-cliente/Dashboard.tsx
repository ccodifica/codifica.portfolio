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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  History,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MEETING_STATUS_LABEL,
  Meeting,
  PROJECT_TYPE_LABEL,
  Project,
} from "@/types/client-area";
import {
  MEETING_STATUS_BADGES,
  createMeeting,
  listMeetingsByProject,
  listProjectsByCliente,
  updateMeeting,
} from "@/lib/client-area-store";
import {
  BriefingDisplay,
  ChatPanel,
  MeetingFormValues,
  MeetingScheduler,
  StatusBadge,
  buildWhatsappLink,
  formatDataBR,
} from "./_shared";
import {
  DocumentacaoEtapasCliente,
  DownloadDocPdfButton,
} from "./_documentacao";
import { ProjectEtapasHero } from "./_etapas-hero";
import { UserAvatarEditable } from "./_user-avatar";
import { usePresence } from "@/contexts/PresenceContext";
import { toast } from "@/components/ui/sonner";
import { emailService } from "@/services/emailService";
import { ADMIN_EMAIL } from "@/config/emailConfig";

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
              <div className="flex items-center gap-4">
                <UserAvatarEditable size="lg" />
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold font-manrope">
                    Olá, {user?.nome.split(" ")[0]} 👋
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Bem-vindo ao seu Espaço do Cliente.
                  </p>
                </div>
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
                userAvatarUrl={user!.avatarUrl}
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

// Paleta de acento por tipo de projeto — usada no dot pulsante e no gradient
// da última palavra do título. Sem ícones decorativos: o protagonismo é da
// tipografia editorial (referências: Linear, Vercel, Stripe 2024-2025).
const TIPO_ACENTO: Record<
  string,
  { label: string; dotColor: string; gradient: string }
> = {
  sistema: {
    label: "Sistema web",
    dotColor: "bg-primary",
    gradient: "from-primary via-primary to-accent",
  },
  site: {
    label: "Site / Landing",
    dotColor: "bg-sky-400",
    gradient: "from-sky-400 via-cyan-300 to-blue-400",
  },
  ecommerce: {
    label: "E-commerce",
    dotColor: "bg-amber-400",
    gradient: "from-amber-300 via-orange-300 to-rose-300",
  },
  app: {
    label: "Aplicativo mobile",
    dotColor: "bg-emerald-400",
    gradient: "from-emerald-300 via-teal-300 to-green-300",
  },
  indeciso: {
    label: "Ideia em definição",
    dotColor: "bg-accent",
    gradient: "from-primary via-accent to-primary",
  },
};

// Quebra o nome do projeto em "prefixo + última palavra" pra colorir só a
// última (técnica de headline Vercel/Stripe). Reconhece "—" e " - " também.
function splitNomeParaTitulo(nome: string): { prefix: string; ultima: string } {
  const trimmed = nome.trim();
  // Tenta separar pela última ocorrência de "—" ou " - "
  const dashMatch = trimmed.match(/^(.*[\s—-]+)([^\s—-]+)$/);
  if (dashMatch) {
    return { prefix: dashMatch[1], ultima: dashMatch[2] };
  }
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return {
      prefix: trimmed.slice(0, lastSpace + 1),
      ultima: trimmed.slice(lastSpace + 1),
    };
  }
  // Palavra única — toda em gradient
  return { prefix: "", ultima: trimmed };
}

const ProjectHeader = ({ project }: { project: Project }) => {
  const acento = TIPO_ACENTO[project.tipo] ?? {
    label: PROJECT_TYPE_LABEL[project.tipo],
    dotColor: "bg-muted-foreground",
    gradient: "from-foreground to-foreground/60",
  };

  const { prefix, ultima } = splitNomeParaTitulo(project.nome);

  const criadoEm = new Date(project.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // ID curto do projeto pra dar identidade técnica (estilo Linear/Stripe)
  const idCurto = project.id.replace(/-/g, "").slice(0, 6).toUpperCase();

  return (
    <section className="relative">
      {/* Eyebrow: tipo + ID em microcaps espaçadas */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-3">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${acento.dotColor} animate-pulse`}
          />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {acento.label}
          </span>
        </span>
        <span className="text-muted-foreground/30 select-none">·</span>
        <span className="text-[10.5px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
          CDF-{idCurto}
        </span>
      </div>

      {/* Título editorial — última palavra em gradient temático */}
      <h2 className="font-bold leading-[0.95] tracking-tight text-3xl md:text-[2.75rem] lg:text-5xl">
        {prefix && (
          <span className="text-foreground/95">{prefix}</span>
        )}
        <span
          className={`bg-gradient-to-br ${acento.gradient} bg-clip-text text-transparent`}
        >
          {ultima}
        </span>
      </h2>

      {/* Metadados em linha, separadores discretos */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>
            Iniciado em <strong className="text-foreground/80">{criadoEm}</strong>
          </span>
        </span>
      </div>

      {/* Divisor sutil que segue o final do bloco */}
      <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-border/60 via-border/20 to-transparent" />
    </section>
  );
};

const ProjectDetail = ({
  project,
  userId,
  userName,
  userEmail,
  userCelular,
  userAvatarUrl,
  onBack,
}: {
  project: Project;
  userId: string;
  userName: string;
  userEmail: string;
  userCelular: string;
  userAvatarUrl?: string;
  onBack?: () => void;
}) => {
  const { effectiveStatus: minhaPresenca } = usePresence();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ms = await listMeetingsByProject(project.id);
        if (cancelled) return;
        setMeetings(ms);
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

      {/* Header trabalhado do projeto */}
      <ProjectHeader project={project} />

      {/* Stepper "hero" — etapa atual + progresso + sequência de fases */}
      <ProjectEtapasHero
        statusAtual={project.status}
        progresso={project.progresso}
      />

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

          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold">
                  Documentação do projeto
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Acompanhe o que está sendo feito em cada etapa. O conteúdo é
                  preenchido pela equipe da Codifica conforme o projeto avança.
                </p>
              </div>
              <DownloadDocPdfButton
                project={project}
                clienteNome={userName}
                mode="cliente"
              />
            </div>
            <DocumentacaoEtapasCliente project={project} />
          </div>
        </TabsContent>

        <TabsContent value="briefing" className="mt-6">
          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <BriefingDisplay
              briefing={project.briefing}
              avatarUrl={userAvatarUrl}
            />
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
              userAvatarUrl={userAvatarUrl}
              userPresence={minhaPresenca}
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
  const [showScheduler, setShowScheduler] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meetingToCancel, setMeetingToCancel] = useState<Meeting | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoTab, setHistoricoTab] = useState<
    "todas" | "realizadas" | "canceladas"
  >("todas");

  // Reuniões "vivas": qualquer status que não seja cancelada nem realizada.
  // Mostradas em destaque, ordenadas pela mais próxima primeiro.
  const proximas = meetings
    .filter((m) => m.status !== "cancelada" && m.status !== "realizada")
    .sort((a, b) =>
      a.data === b.data
        ? a.horario.localeCompare(b.horario)
        : a.data.localeCompare(b.data)
    );

  // Histórico: tudo que já passou ou foi cancelado. Ordem reversa (recente primeiro).
  const historico = meetings
    .filter((m) => m.status === "cancelada" || m.status === "realizada")
    .sort((a, b) =>
      a.data === b.data
        ? b.horario.localeCompare(a.horario)
        : b.data.localeCompare(a.data)
    );

  const handleSubmit = async (values: MeetingFormValues) => {
    setSaving(true);
    try {
      const meeting = await createMeeting({
        projectId,
        clienteId,
        data: values.data,
        horario: values.horario,
        topico: values.topico,
        // Controle interno do admin — cliente não decide isso. Default false;
        // admin marca depois pelo painel se quiser acompanhar confirmação.
        notificarEmail: false,
        notificarWhatsapp: false,
        participantesExtras: values.participantesExtras,
        clienteEmail: userEmail,
        clienteNome: userName,
        projectName,
      });

      const meetingDate = formatDataBR(values.data);

      // Google Calendar em contas Gmail comuns não dispara emails de convite
      // automaticamente via API (limitação conhecida — só Workspace faz). Então
      // mandamos nós mesmos via EmailJS pra cada participante.
      if (meeting.meetLink) {
        toast.success(
          "Reunião agendada! O convite com o link do Google Meet foi enviado por email para todos os participantes."
        );

        const destinatarios = [
          { email: userEmail, nome: userName },
          ...values.participantesExtras.map((email) => ({
            email,
            nome: email.split("@")[0],
          })),
        ];

        destinatarios.forEach(({ email, nome }) => {
          emailService
            .sendMeetingLinkReady({
              toEmail: email,
              toName: nome,
              meetingDate,
              meetingTime: values.horario,
              meetLink: meeting.meetLink!,
              projectName,
            })
            .catch((err) =>
              console.warn(`Falha ao enviar convite para ${email}:`, err)
            );
        });
      } else {
        // Google falhou — reunião está no banco, mas sem link. Admin vai criar
        // depois. Manda só o email "marcado" sem link pro cliente.
        toast.success(
          "Reunião agendada! Em breve enviamos o link do Google Meet por email."
        );
        emailService
          .sendMeetingScheduled({
            toEmail: userEmail,
            toName: userName,
            meetingDate,
            meetingTime: values.horario,
            meetingTopic: values.topico,
            projectName,
          })
          .catch((err) =>
            console.warn("Falha ao enviar e-mail de agendamento:", err)
          );
      }

      setShowScheduler(false);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao agendar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmarCancelamento = async () => {
    if (!meetingToCancel) return;
    setCancelling(true);
    try {
      await updateMeeting(meetingToCancel.id, { status: "cancelada" });
      toast.success("Reunião cancelada. Os participantes receberão a notificação por email.");
      setMeetingToCancel(null);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar.";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (showScheduler) {
    return (
      <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
        <div className="mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Agendar nova reunião
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            A reunião acontece pelo Google Meet. Em 30 minutos a gente alinha o
            projeto. O link chega no email de todos os participantes assim que
            você confirmar.
          </p>
        </div>
        <MeetingScheduler
          mode="client"
          codificaEmail={ADMIN_EMAIL}
          onSubmit={handleSubmit}
          onCancel={() => setShowScheduler(false)}
          submitLabel="Confirmar agendamento"
          saving={saving}
        />
      </div>
    );
  }

  if (proximas.length === 0 && historico.length === 0) {
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
          onClick={() => setShowScheduler(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <CalendarDays className="w-4 h-4 mr-2" />
          Agendar reunião
        </Button>
      </div>
    );
  }

  const realizadas = historico.filter((m) => m.status === "realizada");
  const canceladas = historico.filter((m) => m.status === "cancelada");
  const historicoView =
    historicoTab === "realizadas"
      ? realizadas
      : historicoTab === "canceladas"
      ? canceladas
      : historico;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {proximas.length > 0
            ? `${proximas.length} próxima${proximas.length === 1 ? "" : "s"} neste projeto.`
            : "Sem reuniões marcadas no momento."}
        </p>
        <div className="flex items-center gap-2">
          {historico.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoricoOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/40 gap-2"
            >
              <History className="w-4 h-4" />
              Histórico
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-muted/60 text-[11px] font-semibold tabular-nums">
                {historico.length}
              </span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScheduler(true)}
            className="border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Nova reunião
          </Button>
        </div>
      </div>

      {proximas.length > 0 ? (
        <div className="space-y-3">
          {proximas.map((m) => (
            <ReuniaoCard
              key={m.id}
              meeting={m}
              userCelular={userCelular}
              userName={userName}
              onCancelar={() => setMeetingToCancel(m)}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-dashed border-border/60 bg-card/30 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Você não tem reuniões marcadas agora. Clique em{" "}
            <strong className="text-foreground">Nova reunião</strong> para agendar.
          </p>
        </div>
      )}

      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-border/60 bg-card">
          {/* Header com glow + metadados */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary/10 via-card to-accent/5 border-b border-border/40 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/[0.12] blur-3xl pointer-events-none"
            />
            <DialogHeader className="text-left space-y-1 relative">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                {/* Stat à direita — mr-8 dá folga visual pro botão X do Dialog */}
                <div className="text-right mr-8">
                  <div className="text-2xl font-bold tabular-nums leading-none">
                    {historico.length}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-bold text-muted-foreground mt-0.5">
                    {historico.length === 1 ? "Reunião" : "Reuniões"}
                  </div>
                </div>
              </div>
              <DialogTitle className="text-xl font-bold leading-tight">
                Histórico de reuniões
              </DialogTitle>
              <DialogDescription className="text-sm">
                Linha do tempo das reuniões realizadas e canceladas.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Segmented control de filtro */}
          <div className="px-6 pt-4">
            <div className="inline-flex gap-0.5 p-1 bg-muted/40 rounded-xl">
              {(
                [
                  { value: "todas", label: "Todas", count: historico.length },
                  {
                    value: "realizadas",
                    label: "Realizadas",
                    count: realizadas.length,
                  },
                  {
                    value: "canceladas",
                    label: "Canceladas",
                    count: canceladas.length,
                  },
                ] as const
              ).map((t) => {
                const active = historicoTab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setHistoricoTab(t.value)}
                    className={`relative px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {t.label}
                      <span
                        className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
                          active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/60 text-muted-foreground/80"
                        }`}
                      >
                        {t.count}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <ScrollArea className="max-h-[58vh] px-6 py-5">
            {historicoView.length === 0 ? (
              <HistoricoEmptyState tab={historicoTab} />
            ) : (
              <HistoricoTimeline meetings={historicoView} />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={meetingToCancel !== null}
        onOpenChange={(open) => {
          if (!open && !cancelling) setMeetingToCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              {meetingToCancel && (
                <>
                  Você vai cancelar a reunião do dia{" "}
                  <strong className="text-foreground">
                    {formatDataBR(meetingToCancel.data)}
                  </strong>{" "}
                  às{" "}
                  <strong className="text-foreground">
                    {meetingToCancel.horario}
                  </strong>
                  . Todos os participantes serão notificados por email pelo
                  Google. Essa ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              Manter reunião
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmarCancelamento();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? "Cancelando..." : "Sim, cancelar reunião"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============================================================================
// Timeline do histórico — agrupa por mês/ano e mostra cada item ancorado em
// uma linha vertical com dot colorido por status.
// Inspirado em Linear Activity, GitHub Timeline, Stripe Events.
// ============================================================================

const MESES_LONGO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MESES_CURTO = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

interface MeetingGroup {
  key: string; // "2026-05"
  label: string; // "Maio · 2026"
  meetings: Meeting[];
}

function agruparPorMes(meetings: Meeting[]): MeetingGroup[] {
  const grupos = new Map<string, MeetingGroup>();
  for (const m of meetings) {
    const [yStr, mStr] = m.data.split("-");
    const y = Number(yStr);
    const mo = Number(mStr);
    const key = `${y}-${mStr}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        key,
        label: `${MESES_LONGO[mo - 1]} · ${y}`,
        meetings: [],
      });
    }
    grupos.get(key)!.meetings.push(m);
  }
  return Array.from(grupos.values());
}

const HistoricoTimeline = ({ meetings }: { meetings: Meeting[] }) => {
  const grupos = agruparPorMes(meetings);
  return (
    <div className="relative">
      {/* Linha conectora vertical contínua ao longo de toda a timeline */}
      <div
        aria-hidden
        className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-border/40 via-border/60 to-border/20"
      />

      <div className="space-y-7">
        {grupos.map((grupo) => (
          <section key={grupo.key} className="relative">
            {/* Header do mês — chip que "fura" a linha */}
            <header className="relative pl-10 mb-3">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-px bg-border/60" />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {grupo.label}
              </span>
            </header>

            <div className="space-y-2.5">
              {grupo.meetings.map((m, i) => (
                <HistoricoItem
                  key={m.id}
                  meeting={m}
                  stagger={i}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const HistoricoEmptyState = ({
  tab,
}: {
  tab: "todas" | "realizadas" | "canceladas";
}) => {
  const mensagem = {
    todas: "Nada por aqui ainda — sem reuniões no histórico.",
    realizadas: "Nenhuma reunião foi marcada como realizada ainda.",
    canceladas: "Boa notícia: nenhuma reunião cancelada.",
  }[tab];

  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto mb-3">
        <History className="w-5 h-5 text-muted-foreground/60" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        {mensagem}
      </p>
    </div>
  );
};

const HistoricoItem = ({
  meeting,
  stagger = 0,
}: {
  meeting: Meeting;
  stagger?: number;
}) => {
  const realizada = meeting.status === "realizada";
  const cancelada = meeting.status === "cancelada";

  // Cores temáticas por status
  const acento = realizada
    ? {
        dot: "bg-success",
        glow: "shadow-[0_0_0_4px_rgba(34,197,94,0.12)]",
        badgeBg: "bg-success/10 text-success border-success/30",
      }
    : cancelada
    ? {
        dot: "bg-destructive",
        glow: "shadow-[0_0_0_4px_rgba(239,68,68,0.12)]",
        badgeBg: "bg-destructive/10 text-destructive border-destructive/30",
      }
    : {
        dot: "bg-muted-foreground",
        glow: "shadow-[0_0_0_4px_rgba(148,163,184,0.12)]",
        badgeBg: "bg-muted/40 text-muted-foreground border-border/60",
      };

  const [yStr, mStr, dStr] = meeting.data.split("-");
  const dia = Number(dStr);
  const mes = MESES_CURTO[Number(mStr) - 1];

  const temGravacao = Boolean(meeting.gravacaoUrl);
  const mostrarBotaoGravacao = realizada;

  return (
    <article
      className={`relative pl-10 group transition-all ${
        cancelada ? "opacity-75 hover:opacity-100" : ""
      }`}
      style={{
        animation: `fadeInTimelineItem 0.4s ease-out ${stagger * 50}ms both`,
      }}
    >
      {/* Dot node ancorado na linha vertical (left=15px) */}
      <span
        className={`absolute left-[7px] top-3 w-[18px] h-[18px] rounded-full border-2 border-card ring-1 ring-border/40 ${acento.dot} ${acento.glow} group-hover:scale-110 transition-transform`}
      />

      {/* Card de conteúdo */}
      <div className="rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 hover:border-border/60 transition-all p-3.5 group-hover:translate-x-0.5">
        <div className="flex items-start gap-3">
          {/* Coluna esquerda: data dia/mês em tipografia split */}
          <div className="flex-shrink-0 text-center">
            <div className="text-2xl font-bold leading-none tabular-nums">
              {String(dia).padStart(2, "0")}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-1">
              {mes}
            </div>
          </div>

          {/* Divisor vertical sutil */}
          <div className="self-stretch w-px bg-border/40" />

          {/* Conteúdo: horário + assunto + ações */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="font-semibold tabular-nums">
                  {meeting.horario}
                </span>
              </div>
              <span
                className={`text-[9.5px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full border ${acento.badgeBg}`}
              >
                {MEETING_STATUS_LABEL[meeting.status]}
              </span>
            </div>

            {meeting.topico ? (
              <p
                className={`text-sm text-foreground/90 leading-snug line-clamp-2 ${
                  cancelada ? "line-through decoration-destructive/40" : ""
                }`}
              >
                {meeting.topico}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">
                Sem pauta registrada
              </p>
            )}

            {mostrarBotaoGravacao && (
              <div className="mt-2.5 pt-2.5 border-t border-border/30">
                {temGravacao ? (
                  <a
                    href={meeting.gravacaoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-[11px] font-semibold"
                  >
                    <Download className="w-3 h-3" />
                    Baixar gravação
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </a>
                ) : (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/40 text-muted-foreground/60 text-[11px] font-semibold cursor-not-allowed select-none"
                          aria-disabled
                        >
                          <Download className="w-3 h-3" />
                          Gravação indisponível
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        Esta reunião não foi gravada ou a gravação ainda não foi
                        disponibilizada pela equipe da Codifica.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
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
  onReagendar?: () => void;
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
          {onReagendar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReagendar}
              className="border-border/60 hover:bg-muted/40"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2" />
              Reagendar
            </Button>
          )}
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
