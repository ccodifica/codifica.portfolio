import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  EMPTY_QUESTIONNAIRE,
  Meeting,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  Project,
  ProjectStatus,
  User,
} from "@/types/client-area";
import { STATUS_PROGRESS_MAP, createProject, updateProject } from "@/lib/client-area-store";
import { BriefingDisplay, buildWhatsappLink, formatDataBR } from "./_shared";
import { DocumentacaoEtapasAdmin, DownloadDocPdfButton } from "./_documentacao";
import { AgendarReuniao, ReuniaoTab } from "./_reunioes-admin";

const COR_STATUS: Record<ProjectStatus, string> = {
  aguardando_analise: "bg-muted text-muted-foreground",
  briefing: "bg-primary/15 text-primary",
  design: "bg-accent/15 text-accent",
  desenvolvimento: "bg-accent/15 text-accent",
  revisao: "bg-yellow-500/15 text-yellow-300",
  entrega: "bg-success/15 text-success",
  concluido: "bg-success/25 text-success",
};

const Pilula = ({ status }: { status: ProjectStatus }) => (
  <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${COR_STATUS[status]}`}>
    {PROJECT_STATUS_LABEL[status]}
  </span>
);

const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const tempo = (d: number) => (d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`);
const hoje = () => new Date().toISOString().slice(0, 10);

const proximaReuniao = (meetings: Meeting[], projectId: string) =>
  meetings
    .filter((m) => m.projectId === projectId && ["agendada", "confirmada", "remarcada"].includes(m.status) && m.data >= hoje())
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))[0];

const proximaEtapa = (s: ProjectStatus): ProjectStatus | null => {
  const i = PROJECT_STATUS_ORDER.indexOf(s);
  return i >= 0 && i < PROJECT_STATUS_ORDER.length - 1 ? PROJECT_STATUS_ORDER[i + 1] : null;
};

const temBriefingAntigo = (p: Project) => Boolean(p.briefing?.objetivoFrase || p.briefing?.entregas?.length);

const Bloco = ({ titulo, children, icone: Icone, acao }: { titulo: string; children: ReactNode; icone?: typeof FileText; acao?: ReactNode }) => (
  <section className="rounded-xl border border-border p-4">
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {Icone && <Icone className="w-4 h-4 text-muted-foreground" aria-hidden />}
        {titulo}
      </h3>
      {acao}
    </div>
    {children}
  </section>
);

// ---------------------------------------------------------------------------
// Novo projeto de sistema
// ---------------------------------------------------------------------------
const NovoProjeto = ({
  aberto,
  onAberto,
  clientes,
  onCriado,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  clientes: User[];
  onCriado: () => void;
}) => {
  const [clienteId, setClienteId] = useState("");
  const [busca, setBusca] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const filtrados = clientes.filter((c) =>
    [c.nome, c.email, c.empresa || ""].some((v) => v.toLowerCase().includes(busca.trim().toLowerCase()))
  );
  const cliente = clientes.find((c) => c.id === clienteId);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!cliente) {
      toast.error("Escolha o cliente.");
      return;
    }
    setSalvando(true);
    try {
      const p = await createProject({
        clienteId: cliente.id,
        briefing: {
          ...EMPTY_QUESTIONNAIRE,
          nome: cliente.nome,
          email: cliente.email,
          celular: cliente.celular,
          empresa: cliente.empresa,
          tipo: "sistema",
          objetivoFrase: descricao.trim(),
        },
      });
      await updateProject(p.id, { nome: nome.trim() || `Sistema · ${cliente.empresa || cliente.nome}`, status: "briefing", progresso: STATUS_PROGRESS_MAP.briefing });
      toast.success("Projeto criado. Ele já aparece na área do cliente.");
      onCriado();
      onAberto(false);
      setClienteId("");
      setNome("");
      setDescricao("");
      setBusca("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar o projeto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo projeto de sistema</DialogTitle>
          <DialogDescription>Depois da conversa com o cliente, crie o projeto para acompanhar etapas, reuniões e documentos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filtrados.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setClienteId(c.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 ${clienteId === c.id ? "bg-primary/15" : ""}`}
                >
                  <span className="font-medium text-foreground">{c.nome}</span>
                  <span className="text-muted-foreground"> · {c.email}</span>
                </button>
              ))}
              {filtrados.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Ninguém encontrado.</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              O cliente não aparece? Peça para ele entrar uma vez em <strong>ccodifica.com.br/entrar</strong> com o e-mail dele. O acesso é
              criado na hora e ele passa a aparecer aqui.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-nome">Nome do projeto</Label>
            <Input id="np-nome" placeholder="Ex.: Agenda online da Clínica Sorriso" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="np-desc">O que foi combinado</Label>
            <Textarea id="np-desc" rows={3} placeholder="Resumo do escopo combinado na conversa" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !cliente} className="rounded-xl">
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar projeto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Painel lateral do projeto
// ---------------------------------------------------------------------------
const PainelProjeto = ({
  projeto,
  cliente,
  onFechar,
  onRecarregar,
}: {
  projeto: Project | null;
  cliente?: User;
  onFechar: () => void;
  onRecarregar: () => void;
}) => {
  const [status, setStatus] = useState<ProjectStatus>("aguardando_analise");
  const [nome, setNome] = useState("");
  const [notas, setNotas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [versaoReunioes, setVersaoReunioes] = useState(0);

  useEffect(() => {
    if (!projeto) return;
    setStatus(projeto.status);
    setNome(projeto.nome);
    setNotas(projeto.notasAdmin ?? "");
  }, [projeto?.id, projeto?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projeto) return null;
  const p = projeto;
  const seguinte = proximaEtapa(p.status);

  const salvar = async (patch: Parameters<typeof updateProject>[1], aviso: string) => {
    setSalvando(true);
    try {
      await updateProject(p.id, patch);
      toast.success(aviso);
      onRecarregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Sheet open={!!projeto} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0" data-clarity-mask="True">
        <div className="p-6 border-b border-border bg-card/50">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Pilula status={p.status} />
              <span className="text-xs text-muted-foreground">criado {tempo(diasDesde(p.createdAt))}</span>
            </div>
            <SheetTitle className="text-2xl">{p.nome}</SheetTitle>
            <SheetDescription>{cliente ? `${cliente.nome} · ${cliente.email}` : "Cliente removido"}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Progresso</span>
              <span>{p.progresso}%</span>
            </div>
            <Progress value={p.progresso} className="h-2" />
          </div>
          {cliente && (
            <div className="flex flex-wrap gap-2 mt-4">
              {cliente.celular && (
                <Button size="sm" asChild className="rounded-lg">
                  <a
                    href={buildWhatsappLink(cliente.celular, `Oi, ${cliente.nome.split(" ")[0]}! Aqui é da Codifica, sobre o projeto ${p.nome}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                  </a>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild className="rounded-lg">
                <a href={`mailto:${cliente.email}`}>
                  <Mail className="w-4 h-4 mr-1.5" /> E-mail
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Etapa */}
          <section className="rounded-xl p-4 border border-primary/50 bg-primary/5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Etapa atual</p>
            <p className="font-semibold text-foreground mb-3">{PROJECT_STATUS_LABEL[p.status]}</p>
            {seguinte ? (
              <Button
                className="w-full rounded-xl mb-3"
                disabled={salvando}
                onClick={() => salvar({ status: seguinte, progresso: STATUS_PROGRESS_MAP[seguinte] }, `Projeto avançou para ${PROJECT_STATUS_LABEL[seguinte]}.`)}
              >
                Avançar para {PROJECT_STATUS_LABEL[seguinte]} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="mb-3 space-y-2">
                <p className="text-sm text-success flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Projeto concluído
                </p>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                  <span>
                    Manutenção:{" "}
                    {p.manutencaoAtiva ? (
                      <span className="text-success font-medium">ativa (aparece em "No ar")</span>
                    ) : (
                      <span className="text-muted-foreground">sem manutenção</span>
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={salvando}
                    onClick={() =>
                      salvar(
                        { manutencaoAtiva: !p.manutencaoAtiva },
                        p.manutencaoAtiva ? "Manutenção encerrada." : "Manutenção ativada."
                      )
                    }
                  >
                    {p.manutencaoAtiva ? "Encerrar" : "Ativar manutenção"}
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="h-9">
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
              <Button
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                disabled={salvando || status === p.status}
                onClick={() => salvar({ status, progresso: STATUS_PROGRESS_MAP[status] }, "Etapa alterada.")}
              >
                Mudar etapa
              </Button>
            </div>
          </section>

          <Bloco titulo="Reuniões" icone={CalendarDays} acao={<AgendarReuniao project={p} cliente={cliente} onAgendada={() => { setVersaoReunioes((v) => v + 1); onRecarregar(); }} />}>
            <ReuniaoTab key={versaoReunioes} project={p} cliente={cliente} onAfterChange={onRecarregar} />
          </Bloco>

          <Bloco
            titulo="Documentação das etapas (o cliente vê)"
            icone={FileText}
            acao={<DownloadDocPdfButton project={p} clienteNome={cliente?.nome} mode="completo" />}
          >
            <DocumentacaoEtapasAdmin project={p} onSaved={onRecarregar} />
          </Bloco>

          {temBriefingAntigo(p) && (
            <Accordion type="single" collapsible>
              <AccordionItem value="briefing" className="border rounded-xl px-4">
                <AccordionTrigger className="text-sm">Briefing do cliente</AccordionTrigger>
                <AccordionContent>
                  <BriefingDisplay briefing={p.briefing} avatarUrl={cliente?.avatarUrl} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <Bloco titulo="Dados internos" icone={FileText}>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${p.id}-nome`} className="text-xs text-muted-foreground">
                  Nome do projeto
                </Label>
                <Input id={`${p.id}-nome`} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${p.id}-notas`} className="text-xs text-muted-foreground">
                  Notas internas (o cliente não vê)
                </Label>
                <Textarea id={`${p.id}-notas`} rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" className="rounded-lg" disabled={salvando} onClick={() => salvar({ nome: nome.trim() || p.nome, notasAdmin: notas }, "Salvo.")}>
                Salvar
              </Button>
            </div>
          </Bloco>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// Aba "Sistemas"
// ---------------------------------------------------------------------------
/**
 * Mesma lógica dos sites: projeto de sistema só é criado depois de fechado,
 * então "Em andamento" = ainda não entregue; "Concluídos" = todos os entregues;
 * "No ar" = entregues que seguem com a manutenção da Codifica.
 */
const FILTROS = [
  { id: "andamento", rotulo: "Em andamento", teste: (p: Project) => p.status !== "concluido" },
  { id: "concluido", rotulo: "Concluídos", teste: (p: Project) => p.status === "concluido" },
  { id: "no_ar", rotulo: "No ar", teste: (p: Project) => p.status === "concluido" && p.manutencaoAtiva },
  { id: "todos", rotulo: "Todos", teste: () => true },
];

const AbaSistemas = ({
  projetos,
  usuarios,
  meetings,
  onRecarregar,
}: {
  projetos: Project[];
  usuarios: User[];
  meetings: Meeting[];
  onRecarregar: () => void;
}) => {
  const [filtro, setFiltro] = useState("andamento");
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const clienteDe = (p: Project) => usuarios.find((u) => u.id === p.clienteId);

  const visiveis = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    const termo = busca.trim().toLowerCase();
    return projetos
      .filter(f.teste)
      .filter((p) => {
        const c = clienteDe(p);
        return !termo || [p.nome, c?.nome || "", c?.email || ""].some((v) => v.toLowerCase().includes(termo));
      })
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }, [projetos, filtro, busca, usuarios]); // eslint-disable-line react-hooks/exhaustive-deps

  const conta = (id: string) => projetos.filter(FILTROS.find((f) => f.id === id)!.teste).length;
  const cartoes = [
    { id: "andamento", icone: Sparkles, rotulo: "Em andamento", valor: conta("andamento"), dica: "fechados, ainda não entregues" },
    { id: "concluido", icone: CheckCircle2, rotulo: "Concluídos", valor: conta("concluido"), dica: "todos os sistemas entregues" },
    { id: "no_ar", icone: CalendarDays, rotulo: "No ar", valor: conta("no_ar"), dica: "entregues e com manutenção" },
  ];

  const selecionado = projetos.find((p) => p.id === selecionadoId) || null;
  const clientes = usuarios.filter((u) => u.role === "cliente");

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {cartoes.map(({ id, icone: Icone, rotulo, valor, dica }) => {
          const ativo = filtro === id;
          return (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              aria-pressed={ativo}
              className={`text-left rounded-2xl border p-4 transition-colors ${
                ativo ? "border-primary bg-primary/10" : "border-border bg-card/70 hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{rotulo}</span>
                <Icone className={`w-4 h-4 ${ativo ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
              </div>
              <p className="text-3xl font-bold text-foreground leading-none mb-1">{valor}</p>
              <p className="text-xs text-muted-foreground">{dica}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filtro === f.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.rotulo}
              <span className="text-xs rounded-full bg-background/60 px-1.5">{projetos.filter(f.teste).length}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input className="pl-9" placeholder="Buscar projeto ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar projetos" />
          </div>
          <Button className="rounded-xl shrink-0" onClick={() => setNovoAberto(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo projeto
          </Button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground mb-1">{projetos.length === 0 ? "Nenhum projeto de sistema ainda" : "Nada por aqui com esse filtro"}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {projetos.length === 0
              ? "Quando um cliente de sistema fechar depois da conversa, crie o projeto aqui."
              : "Tente outro filtro ou limpe a busca."}
          </p>
          {projetos.length === 0 && (
            <Button variant="outline" className="rounded-xl" onClick={() => setNovoAberto(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Novo projeto
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((p) => {
            const c = clienteDe(p);
            const reuniao = proximaReuniao(meetings, p.id);
            return (
              <li key={p.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelecionadoId(p.id)}
                  onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && setSelecionadoId(p.id)}
                  className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1.1fr)_auto] items-center gap-3 md:gap-5 rounded-2xl border border-border bg-card/70 px-4 py-4 md:px-5 hover:border-primary/50 hover:bg-card transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{p.nome}</p>
                    <p className="text-sm text-muted-foreground truncate">{c ? `${c.nome} · ${c.email}` : "Cliente removido"}</p>
                  </div>
                  <Pilula status={p.status} />
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={p.progresso} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-9 text-right">{p.progresso}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      {reuniao ? (
                        <>
                          <CalendarDays className="w-3 h-3" aria-hidden /> reunião {formatDataBR(reuniao.data)} às {reuniao.horario}
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" aria-hidden /> atualizado {tempo(diasDesde(p.updatedAt))}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 justify-end" onClick={(ev) => ev.stopPropagation()}>
                    {c?.celular && (
                      <Button size="icon" variant="ghost" asChild title="WhatsApp">
                        <a href={buildWhatsappLink(c.celular, `Oi, ${c.nome.split(" ")[0]}! Aqui é da Codifica.`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-1 hidden md:block" aria-hidden />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NovoProjeto aberto={novoAberto} onAberto={setNovoAberto} clientes={clientes} onCriado={onRecarregar} />
      <PainelProjeto projeto={selecionado} cliente={selecionado ? clienteDe(selecionado) : undefined} onFechar={() => setSelecionadoId(null)} onRecarregar={onRecarregar} />
    </>
  );
};

export default AbaSistemas;
