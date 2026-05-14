import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  LogOut,
  MessageSquare,
  Shield,
  Users,
  Briefcase,
  ClipboardList,
  Save,
  Activity,
  FileText,
  CalendarDays,
  Video,
  Clock,
  ExternalLink,
  History,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MEETING_STATUS_LABEL,
  Meeting,
  MeetingStatus,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  PROJECT_TYPE_LABEL,
  Project,
  ProjectStatus,
  User,
} from "@/types/client-area";
import {
  MEETING_STATUS_BADGES,
  STATUS_PROGRESS_MAP,
  listMeetings,
  listMeetingsByProject,
  listProjects,
  listUsers,
  updateMeeting,
  updateProject,
} from "@/lib/client-area-store";
import { toast } from "@/components/ui/sonner";
import {
  BriefingDisplay,
  ChatPanel,
  StatusBadge,
  TimelineEtapas,
  buildWhatsappLink,
  formatDataBR,
} from "./_shared";
import {
  DocumentacaoEtapasAdmin,
  DownloadDocPdfButton,
} from "./_documentacao";
import { usePresence } from "@/contexts/PresenceContext";
import { emailService } from "@/services/emailService";

type ListaTab = "andamento" | "concluido";
type StatusFiltro = "todos" | ProjectStatus;

const MEETING_STATUS_VALUES: MeetingStatus[] = [
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "remarcada",
];

const Admin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [listaTab, setListaTab] = useState<ListaTab>("andamento");
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("todos");
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [pr, us, mt] = await Promise.all([
        listProjects(),
        listUsers(),
        listMeetings(),
      ]);
      setProjects(pr);
      setUsuarios(us);
      setMeetings(mt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/espaco-do-cliente", { replace: true });
  };

  const projetosEmAndamento = useMemo(
    () => projects.filter((p) => p.status !== "concluido"),
    [projects]
  );
  const projetosConcluidos = useMemo(
    () => projects.filter((p) => p.status === "concluido"),
    [projects]
  );

  const filtrados = useMemo(() => {
    const base =
      listaTab === "andamento" ? projetosEmAndamento : projetosConcluidos;
    const termo = busca.trim().toLowerCase();
    return base.filter((p) => {
      if (
        listaTab === "andamento" &&
        filtroStatus !== "todos" &&
        p.status !== filtroStatus
      )
        return false;
      if (!termo) return true;
      const dono = usuarios.find((u) => u.id === p.clienteId);
      const blob = `${p.nome} ${dono?.nome ?? ""} ${dono?.email ?? ""} ${
        p.briefing.empresa ?? ""
      }`.toLowerCase();
      return blob.includes(termo);
    });
  }, [
    projetosEmAndamento,
    projetosConcluidos,
    listaTab,
    filtroStatus,
    busca,
    usuarios,
  ]);

  const stats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const proximas = meetings.filter((m) => {
      if (m.status === "cancelada" || m.status === "realizada") return false;
      const [y, mo, d] = m.data.split("-").map(Number);
      const dt = new Date(y, mo - 1, d);
      return dt >= hoje;
    }).length;
    return {
      leads: projects.filter((p) => p.status === "aguardando_analise").length,
      ativos: projetosEmAndamento.length,
      reunioes: proximas,
      clientes: usuarios.filter((u) => u.role === "cliente").length,
    };
  }, [projects, projetosEmAndamento, meetings, usuarios]);

  const selecionado = projects.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-2">
                  <Shield className="w-3 h-3" />
                  Modo Admin
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-manrope">
                  Painel Codifica
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie leads, projetos, reuniões e mensagens dos clientes.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-muted-foreground self-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            {selecionado ? (
              <AdminProjectDetail
                project={selecionado}
                cliente={usuarios.find((u) => u.id === selecionado.clienteId)}
                adminId={user!.id}
                adminName={user!.nome}
                adminAvatarUrl={user!.avatarUrl}
                onBack={() => {
                  setSelectedId(null);
                  reload();
                }}
                onAfterChange={reload}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  <StatCard
                    icon={ClipboardList}
                    label="Leads aguardando"
                    value={stats.leads}
                    tone="primary"
                  />
                  <StatCard
                    icon={Briefcase}
                    label="Projetos ativos"
                    value={stats.ativos}
                    tone="accent"
                  />
                  <StatCard
                    icon={CalendarDays}
                    label="Reuniões próximas"
                    value={stats.reunioes}
                    tone="success"
                  />
                  <StatCard
                    icon={Users}
                    label="Clientes cadastrados"
                    value={stats.clientes}
                    tone="primary"
                  />
                </div>

                <Tabs
                  value={listaTab}
                  onValueChange={(v) => setListaTab(v as ListaTab)}
                  className="mb-5"
                >
                  <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="andamento" className="gap-2">
                      <Activity className="w-4 h-4" />
                      Em andamento
                      <span className="ml-1 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full">
                        {projetosEmAndamento.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="concluido" className="gap-2">
                      <Briefcase className="w-4 h-4" />
                      Concluídos
                      <span className="ml-1 text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full">
                        {projetosConcluidos.length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por cliente, empresa ou projeto..."
                    className="flex-1"
                  />
                  {listaTab === "andamento" && (
                    <Select
                      value={filtroStatus}
                      onValueChange={(v) =>
                        setFiltroStatus(v as StatusFiltro)
                      }
                    >
                      <SelectTrigger className="sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os status</SelectItem>
                        {PROJECT_STATUS_ORDER.filter((s) => s !== "concluido").map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {PROJECT_STATUS_LABEL[s]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {filtrados.length === 0 ? (
                  <div className="text-center py-16 bg-card/40 border border-border/60 rounded-2xl text-muted-foreground">
                    {listaTab === "andamento"
                      ? "Nenhum projeto em andamento com esses filtros."
                      : "Nenhum projeto concluído ainda."}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filtrados.map((p) => {
                      const cli = usuarios.find((u) => u.id === p.clienteId);
                      const meetingsDoProjeto = meetings.filter(
                        (m) => m.projectId === p.id
                      );
                      return (
                        <AdminProjectRow
                          key={p.id}
                          project={p}
                          cliente={cli}
                          meetingsCount={meetingsDoProjeto.length}
                          onClick={() => setSelectedId(p.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "primary" | "accent" | "success";
}) => {
  const colorMap = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
  };
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/50">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[tone]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
};

const AdminProjectRow = ({
  project,
  cliente,
  meetingsCount,
  onClick,
}: {
  project: Project;
  cliente?: User;
  meetingsCount: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left p-5 rounded-2xl border border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card/80 transition-all duration-200"
  >
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-2">
          <span>{PROJECT_TYPE_LABEL[project.tipo]}</span>
          <span>·</span>
          <span>
            {new Date(project.createdAt).toLocaleDateString("pt-BR")}
          </span>
          {meetingsCount > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {meetingsCount} reunião(ões)
              </span>
            </>
          )}
        </div>
        <h3 className="font-bold truncate">{project.nome}</h3>
        <div className="text-sm text-muted-foreground truncate">
          {cliente ? `${cliente.nome} · ${cliente.email}` : "Cliente removido"}
        </div>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-28">
          <Progress value={project.progresso} className="h-2" />
          <div className="text-[10px] text-muted-foreground text-right mt-1">
            {project.progresso}%
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>
    </div>
  </button>
);

const AdminProjectDetail = ({
  project,
  cliente,
  adminId,
  adminName,
  adminAvatarUrl,
  onBack,
  onAfterChange,
}: {
  project: Project;
  cliente?: User;
  adminId: string;
  adminName: string;
  adminAvatarUrl?: string;
  onBack: () => void;
  onAfterChange: () => void;
}) => {
  const { effectiveStatus: minhaPresenca } = usePresence();
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para a lista
      </Button>

      <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {PROJECT_TYPE_LABEL[project.tipo]} ·{" "}
              {new Date(project.createdAt).toLocaleDateString("pt-BR")}
            </div>
            <h2 className="text-2xl font-bold">{project.nome}</h2>
            <div className="text-sm text-muted-foreground mt-1">
              {cliente
                ? `${cliente.nome} · ${cliente.email}${
                    cliente.celular ? ` · ${cliente.celular}` : ""
                  }`
                : "Cliente removido"}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progresso</span>
            <span>{project.progresso}%</span>
          </div>
          <Progress value={project.progresso} className="h-2" />
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

        <TabsContent value="andamento" className="mt-6">
          <AndamentoTab
            project={project}
            cliente={cliente}
            adminId={adminId}
            adminName={adminName}
            onAfterChange={onAfterChange}
          />
        </TabsContent>

        <TabsContent value="briefing" className="mt-6">
          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <BriefingDisplay
              briefing={project.briefing}
              avatarUrl={cliente?.avatarUrl}
            />
          </div>
        </TabsContent>

        <TabsContent value="reuniao" className="mt-6">
          <ReuniaoTab
            project={project}
            cliente={cliente}
            onAfterChange={onAfterChange}
          />
        </TabsContent>

        <TabsContent value="mensagens" className="mt-6">
          <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
            <div className="mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Conversa com {cliente?.nome ?? "cliente"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Anexos suportados: imagens, PDF, Word, Excel, PowerPoint e ZIP
                (máx. 1 MB por arquivo nesta versão).
              </p>
            </div>
            <ChatPanel
              projectId={project.id}
              userId={adminId}
              userName={adminName}
              userRole="admin"
              userAvatarUrl={adminAvatarUrl}
              userPresence={minhaPresenca}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AndamentoTab = ({
  project,
  cliente,
  adminId,
  adminName,
  onAfterChange,
}: {
  project: Project;
  cliente?: User;
  adminId: string;
  adminName: string;
  onAfterChange: () => void;
}) => {
  const [nome, setNome] = useState(project.nome);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [progresso, setProgresso] = useState<number>(project.progresso);
  const [notas, setNotas] = useState(project.notasAdmin ?? "");

  const handleStatusChange = (s: ProjectStatus) => {
    setStatus(s);
    setProgresso(STATUS_PROGRESS_MAP[s]);
  };

  const salvar = async () => {
    try {
      await updateProject(project.id, {
        nome,
        status,
        progresso,
        notasAdmin: notas,
      });
      toast.success("Projeto atualizado.");
      onAfterChange();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(msg);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
          <h3 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-wide">
            Status e progresso
          </h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nomeProj">Nome do projeto</Label>
              <Input
                id="nomeProj"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Status atual do projeto</Label>
              <Select
                value={status}
                onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Avançar o status atualiza a barrinha automaticamente ({progresso}%).
              </p>
            </div>

            <Progress value={progresso} className="h-2" />

            <div>
              <Label htmlFor="notas">
                Notas internas (não visíveis ao cliente)
              </Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Anotações sobre o projeto, próximos passos, observações..."
                rows={4}
                className="mt-2 resize-none"
              />
            </div>

            <Button
              onClick={salvar}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar alterações
            </Button>
          </div>
        </div>

        <div className="p-6 md:p-8 rounded-2xl border border-border/60 bg-card/50">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Documentação das etapas (visíveis ao cliente)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha conforme avança no projeto. O cliente vê uma versão
                somente leitura no painel dele, e pode baixar o PDF.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DownloadDocPdfButton
                project={project}
                clienteNome={cliente?.nome}
                mode="template"
                variant="ghost"
              />
              <DownloadDocPdfButton
                project={project}
                clienteNome={cliente?.nome}
                mode="completo"
              />
            </div>
          </div>
          <DocumentacaoEtapasAdmin project={project} onSaved={onAfterChange} />
        </div>
      </div>

      <aside className="space-y-4">
        <div className="p-5 rounded-2xl border border-border/60 bg-card/50">
          <h4 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            Etapas do projeto
          </h4>
          <TimelineEtapas statusAtual={status} />
        </div>
      </aside>
    </div>
  );
};

const ReuniaoTab = ({
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
          O cliente optou por conversar mais tarde, ou ainda não respondeu a
          essa etapa do briefing.
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
            Nada por aqui — o cliente ainda não agendou uma reunião nova.
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
                Histórico — canceladas e realizadas
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
                          — {m.topico}
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

const MeetingAdminCard = ({
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

export default Admin;
