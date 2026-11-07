import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileBarChart,
  Filter,
  Gauge,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  GoogleListas,
  GoogleStatus,
  MonitorChecagem,
  MonitorDia,
  MonitorEvento,
  MonitorExterno,
  MonitorRelatorio,
  MonitorSite,
  acaoMonitor,
  atualizarDominios,
  atualizarSiteMonitorado,
  conectarGoogle,
  criarSiteMonitorado,
  desconectarGoogle,
  listarGoogle,
  statusGoogle,
  listarChecagens,
  listarDias,
  listarEventos,
  listarExterno,
  listarRelatorios,
  listarSitesMonitorados,
  nomeOrigem,
  removerSiteMonitorado,
  salvarPerfilManual,
  snippetRastreador,
} from "@/lib/monitor";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const diaSP = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const diasAtras = (n: number) => diaSP(new Date(Date.now() - n * 86400000));
const inicioHojeISO = () => new Date(`${diaSP()}T00:00:00-03:00`).toISOString();
const num = (n: number) => n.toLocaleString("pt-BR");
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const mesAtual = () => diaSP().slice(0, 7);
const mesPassado = () => {
  const [a, m] = diaSP().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const nomeMes = (mes: string) => new Date(`${mes.slice(0, 7)}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

type Totais = { visitas: number; paginas: number; whatsapp: number; telefone: number; rota: number; formularios: number; erros: number; celular: number; checagens: number; falhas: number; origens: Record<string, number>; paginasTop: Record<string, number> };
const vazio = (): Totais => ({ visitas: 0, paginas: 0, whatsapp: 0, telefone: 0, rota: 0, formularios: 0, erros: 0, celular: 0, checagens: 0, falhas: 0, origens: {}, paginasTop: {} });
const contatos = (t: Totais) => t.whatsapp + t.telefone + t.rota + t.formularios;

function somar(dias: MonitorDia[], hoje: (MonitorEvento & { site_id: string })[] = []): Totais {
  const t = vazio();
  for (const d of dias) {
    t.visitas += d.visitas;
    t.paginas += d.paginas_vistas;
    t.whatsapp += d.whatsapp;
    t.telefone += d.telefone;
    t.rota += d.rota;
    t.formularios += d.formularios;
    t.erros += d.erros;
    t.celular += d.celular;
    t.checagens += d.checagens;
    t.falhas += d.falhas;
    for (const [o, n] of Object.entries(d.origens || {})) t.origens[o] = (t.origens[o] || 0) + Number(n);
    for (const [p, n] of Object.entries(d.paginas || {})) t.paginasTop[p] = (t.paginasTop[p] || 0) + Number(n);
  }
  // hoje ainda não foi resumido: soma direto dos eventos
  const sessoes = new Set<string>();
  const sessoesCel = new Set<string>();
  const origemSessao = new Map<string, string>();
  for (const e of hoje) {
    if (e.tipo === "pagina") {
      t.paginas++;
      sessoes.add(e.sessao);
      if (e.dispositivo === "celular") sessoesCel.add(e.sessao);
      if (!origemSessao.has(e.sessao)) origemSessao.set(e.sessao, e.origem || "direto");
      const p = e.pagina || "/";
      t.paginasTop[p] = (t.paginasTop[p] || 0) + 1;
    }
    if (e.tipo === "whatsapp") t.whatsapp++;
    if (e.tipo === "telefone") t.telefone++;
    if (e.tipo === "rota") t.rota++;
    if (e.tipo === "formulario") t.formularios++;
    if (e.tipo === "erro") t.erros++;
  }
  t.visitas += sessoes.size;
  t.celular += sessoesCel.size;
  for (const o of origemSessao.values()) t.origens[o] = (t.origens[o] || 0) + 1;
  return t;
}

const variacao = (agora: number, antes: number) => {
  if (!antes) return null;
  return Math.round(((agora - antes) / antes) * 100);
};

const Variacao = ({ agora, antes }: { agora: number; antes: number }) => {
  const v = variacao(agora, antes);
  if (v === null) return null;
  return <span className={`text-xs font-semibold ${v >= 0 ? "text-success" : "text-destructive"}`}>{v >= 0 ? "▲" : "▼"} {Math.abs(v)}%</span>;
};

const Bolinha = ({ site }: { site: MonitorSite }) => {
  const sem = !site.estado?.ultima_checagem;
  const ok = site.estado?.no_ar !== false;
  return (
    <span className="relative flex w-2.5 h-2.5" title={sem ? "Ainda não checado" : ok ? "No ar" : "Fora do ar"}>
      {!sem && !ok && <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-ping" />}
      <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${sem ? "bg-muted-foreground/50" : ok ? "bg-success" : "bg-destructive"}`} />
    </span>
  );
};

const Caixa = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-border bg-card/70 p-5 ${className}`}>{children}</section>
);

const Numero = ({ rotulo, valor, icone: Icone, extra }: { rotulo: string; valor: string; icone?: typeof Globe; extra?: React.ReactNode }) => (
  <div className="rounded-xl border border-border p-4">
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
      {Icone && <Icone className="w-3.5 h-3.5" aria-hidden />} {rotulo}
    </p>
    <p className="text-2xl font-bold text-foreground leading-tight">{valor}</p>
    {extra && <div className="mt-0.5">{extra}</div>}
  </div>
);

const Barras = ({ itens, total }: { itens: [string, number][]; total: number }) => (
  <ul className="space-y-2">
    {itens.map(([nome, n]) => (
      <li key={nome}>
        <div className="flex justify-between text-sm mb-1">
          <span className="truncate pr-2 text-foreground/90">{nome}</span>
          <span className="text-muted-foreground tabular-nums">{num(n)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${total ? Math.max(3, (n / total) * 100) : 0}%` }} />
        </div>
      </li>
    ))}
    {!itens.length && <li className="text-sm text-muted-foreground">Sem dados no período.</li>}
  </ul>
);

// ---------------------------------------------------------------------------
// Aba
// ---------------------------------------------------------------------------
const AbaMetricas = ({ funilCodifica }: { funilCodifica?: React.ReactNode }) => {
  const [sites, setSites] = useState<MonitorSite[] | null>(null);
  const [dias, setDias] = useState<MonitorDia[]>([]);
  const [hoje, setHoje] = useState<(MonitorEvento & { site_id: string })[]>([]);
  const [externo, setExterno] = useState<MonitorExterno[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [s, d, h, e] = await Promise.all([
        listarSitesMonitorados(),
        listarDias(diasAtras(60)),
        listarEventos(null, inicioHojeISO()),
        listarExterno(),
      ]);
      setSites(s);
      setDias(d);
      setHoje(h);
      setExterno(e);
      // vencimento dos domínios pelo navegador (o servidor é bloqueado pelo Registro.br)
      atualizarDominios(s).then(() => listarSitesMonitorados().then(setSites)).catch(() => undefined);
    } catch (err) {
      setErro((err as Error).message);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  // volta da tela de autorização do Google (função google-conectar)
  useEffect(() => {
    const url = new URL(window.location.href);
    const r = url.searchParams.get("google");
    if (!r) return;
    const msg: Record<string, [string, "success" | "error"]> = {
      ok: ["Google conectado. Escolha a propriedade de cada site na seção Google.", "success"],
      cancelado: ["A autorização do Google foi cancelada.", "error"],
      expirou: ["O link de autorização expirou. Clique em Conectar Google de novo.", "error"],
      erro: ["O Google não devolveu a autorização. Tente de novo.", "error"],
    };
    const [texto, tipo] = msg[r] || msg.erro;
    toast[tipo](texto);
    url.searchParams.delete("google");
    window.history.replaceState(null, "", url.toString());
  }, []);

  if (erro) return <p className="text-destructive">{erro}</p>;
  if (!sites) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const site = sites.find((s) => s.id === aberto);
  if (site) {
    return (
      <DetalheSite
        site={site}
        dias={dias.filter((d) => d.site_id === site.id)}
        hoje={hoje.filter((e) => e.site_id === site.id)}
        externo={externo.filter((e) => e.site_id === site.id)}
        onVoltar={() => setAberto(null)}
        onAtualizar={carregar}
        funilCodifica={site.tipo === "codifica" ? funilCodifica : undefined}
      />
    );
  }

  const ate30 = diasAtras(30);
  const ate60 = diasAtras(60);
  const resumo = (id: string) => {
    const doSite = dias.filter((d) => d.site_id === id);
    const atual = somar(doSite.filter((d) => d.dia > ate30), hoje.filter((e) => e.site_id === id));
    const antes = somar(doSite.filter((d) => d.dia > ate60 && d.dia <= ate30));
    return { atual, antes };
  };
  const todos = sites.map((s) => ({ s, ...resumo(s.id) }));
  const noAr = sites.filter((s) => s.ativo && s.estado?.no_ar !== false).length;
  const ativos = sites.filter((s) => s.ativo).length;
  const totalVisitas = todos.reduce((a, x) => a + x.atual.visitas, 0);
  const totalContatos = todos.reduce((a, x) => a + contatos(x.atual), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero rotulo="Sites monitorados" valor={String(ativos)} icone={Globe} />
        <Numero rotulo="No ar agora" valor={`${noAr}/${ativos}`} icone={Activity} />
        <Numero rotulo="Visitas (30 dias)" valor={num(totalVisitas)} icone={Search} />
        <Numero rotulo="Contatos gerados (30 dias)" valor={num(totalContatos)} icone={MessageCircle} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Sites vendidos entram aqui sozinhos quando o pedido vai ao ar.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => setNovo(true)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar site
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {todos.map(({ s, atual, antes }) => {
          const ps = externo.find((e) => e.site_id === s.id && e.fonte === "pagespeed")?.dados as { desempenho?: number } | undefined;
          const disponibilidade = atual.checagens ? (1 - atual.falhas / atual.checagens) * 100 : null;
          const venceEm = s.estado?.dominio_expira ? Math.round((new Date(s.estado.dominio_expira).getTime() - Date.now()) / 86400000) : null;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setAberto(s.id)}
              className={`text-left rounded-2xl border bg-card/70 p-5 hover:border-primary/60 transition-colors ${s.ativo ? "border-border" : "border-dashed border-border opacity-60"}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Bolinha site={s} />
                <p className="font-semibold text-foreground truncate">{s.nome}</p>
                {s.tipo === "codifica" && <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5">Nosso</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-4 truncate">{host(s.url)}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{num(atual.visitas)}</p>
                  <p className="text-[11px] text-muted-foreground">visitas</p>
                  <Variacao agora={atual.visitas} antes={antes.visitas} />
                </div>
                <div>
                  <p className="text-lg font-bold">{num(contatos(atual))}</p>
                  <p className="text-[11px] text-muted-foreground">contatos</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{disponibilidade === null ? "–" : `${disponibilidade.toFixed(1).replace(".", ",")}%`}</p>
                  <p className="text-[11px] text-muted-foreground">no ar</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {!s.rastreador_desde && <span className="text-[11px] rounded-full bg-amber-400/15 text-amber-300 px-2 py-0.5">Rastreador não instalado</span>}
                {ps?.desempenho != null && <span className="text-[11px] rounded-full bg-muted px-2 py-0.5">Velocidade {ps.desempenho}</span>}
                {venceEm !== null && venceEm <= 60 && <span className="text-[11px] rounded-full bg-destructive/15 text-destructive px-2 py-0.5">Domínio vence em {venceEm} dias</span>}
                {s.relatorio_ativo && <span className="text-[11px] rounded-full bg-success/15 text-success px-2 py-0.5">Relatório mensal</span>}
              </div>
            </button>
          );
        })}
      </div>

      <NovoSite aberto={novo} onFechar={() => setNovo(false)} onCriado={carregar} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Novo site
// ---------------------------------------------------------------------------
const NovoSite = ({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: () => void }) => {
  const [campos, setCampos] = useState({ nome: "", url: "", cliente: "", email: "" });
  const [salvando, setSalvando] = useState(false);
  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    let url = campos.url.trim();
    if (!/^https?:\/\//.test(url)) url = `https://${url}`;
    setSalvando(true);
    try {
      await criarSiteMonitorado({ nome: campos.nome.trim(), url: url.replace(/\/$/, ""), tipo: "site", cliente: campos.cliente.trim() || null, relatorio_email: campos.email.trim() || null });
      toast.success("Site adicionado. A primeira checagem acontece em até 5 minutos.");
      setCampos({ nome: "", url: "", cliente: "", email: "" });
      onFechar();
      onCriado();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar site</DialogTitle>
          <DialogDescription>Para sites vendidos fora do fluxo do site. Os do fluxo entram sozinhos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-3">
          {(
            [
              ["nome", "Nome", "Clínica da Dra. Helena"],
              ["url", "Endereço", "drahelenaprado.com.br"],
              ["cliente", "Cliente (opcional)", "Helena Prado"],
              ["email", "E-mail para o relatório (opcional)", "cliente@email.com"],
            ] as const
          ).map(([k, rotulo, dica]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`novo-${k}`}>{rotulo}</Label>
              <Input id={`novo-${k}`} placeholder={dica} value={campos[k]} required={k === "nome" || k === "url"} onChange={(e) => setCampos((c) => ({ ...c, [k]: e.target.value }))} />
            </div>
          ))}
          <Button type="submit" className="w-full rounded-xl" disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Detalhe de um site
// ---------------------------------------------------------------------------
type Secao = "geral" | "google" | "desempenho" | "disponibilidade" | "seguranca" | "funil" | "relatorios" | "instalacao";
const SECOES: { id: Secao; rotulo: string; icone: typeof Globe }[] = [
  { id: "geral", rotulo: "Visão geral", icone: Activity },
  { id: "google", rotulo: "Google", icone: Search },
  { id: "desempenho", rotulo: "Velocidade", icone: Gauge },
  { id: "disponibilidade", rotulo: "Disponibilidade", icone: Globe },
  { id: "seguranca", rotulo: "Erros e segurança", icone: ShieldCheck },
  { id: "funil", rotulo: "Funil", icone: Filter },
  { id: "relatorios", rotulo: "Relatórios", icone: FileBarChart },
  { id: "instalacao", rotulo: "Instalação", icone: Copy },
];

const DetalheSite = ({
  site,
  dias,
  hoje,
  externo,
  onVoltar,
  onAtualizar,
  funilCodifica,
}: {
  site: MonitorSite;
  dias: MonitorDia[];
  hoje: (MonitorEvento & { site_id: string })[];
  externo: MonitorExterno[];
  onVoltar: () => void;
  onAtualizar: () => void;
  /** No site da Codifica, o funil é o de vendas (visita → pedido → pagamento). */
  funilCodifica?: React.ReactNode;
}) => {
  const [secao, setSecao] = useState<Secao>("geral");
  const [periodo, setPeriodo] = useState(30);
  const [coletando, setColetando] = useState(false);

  const coletarAgora = async () => {
    setColetando(true);
    try {
      await acaoMonitor({ modo: "coletar_agora", site_id: site.id });
      toast.success("Dados atualizados.");
      onAtualizar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setColetando(false);
    }
  };
  const alternarAtivo = async (ativo: boolean) => {
    await atualizarSiteMonitorado(site.id, { ativo }).catch((e) => toast.error((e as Error).message));
    onAtualizar();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" /> Todos os sites
          </button>
          <div className="flex items-center gap-2">
            <Bolinha site={site} />
            <h2 className="text-2xl font-bold">{site.nome}</h2>
          </div>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            {host(site.url)} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={site.ativo} onCheckedChange={alternarAtivo} /> Monitorando
          </label>
          <Button variant="outline" className="rounded-xl" onClick={coletarAgora} disabled={coletando}>
            {coletando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Coletar agora
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {SECOES.map(({ id, rotulo, icone: Icone }) => (
          <button
            key={id}
            role="tab"
            aria-selected={secao === id}
            onClick={() => setSecao(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${secao === id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            <Icone className="w-4 h-4" /> {rotulo}
          </button>
        ))}
      </div>

      {secao === "geral" && <VisaoGeral site={site} dias={dias} hoje={hoje} periodo={periodo} setPeriodo={setPeriodo} />}
      {secao === "google" && <SecaoGoogle site={site} externo={externo} onAtualizar={onAtualizar} />}
      {secao === "desempenho" && <SecaoDesempenho externo={externo.filter((e) => e.fonte === "pagespeed")} />}
      {secao === "disponibilidade" && <SecaoDisponibilidade site={site} dias={dias} />}
      {secao === "seguranca" && <SecaoSeguranca site={site} />}
      {secao === "funil" && (funilCodifica || <SecaoFunil dias={dias} hoje={hoje} />)}
      {secao === "relatorios" && <SecaoRelatorios site={site} onAtualizar={onAtualizar} />}
      {secao === "instalacao" && <SecaoInstalacao site={site} onAtualizar={onAtualizar} />}
    </div>
  );
};

const VisaoGeral = ({ site, dias, hoje, periodo, setPeriodo }: { site: MonitorSite; dias: MonitorDia[]; hoje: (MonitorEvento & { site_id: string })[]; periodo: number; setPeriodo: (n: number) => void }) => {
  const desde = diasAtras(periodo);
  const doPeriodo = dias.filter((d) => d.dia > desde);
  const t = somar(doPeriodo, hoje);
  const antes = somar(dias.filter((d) => d.dia > diasAtras(periodo * 2) && d.dia <= desde));
  const serie = useMemo(() => {
    const mapa = new Map(doPeriodo.map((d) => [d.dia, d]));
    const visitasHoje = new Set(hoje.filter((e) => e.tipo === "pagina").map((e) => e.sessao)).size;
    const contatosHoje = hoje.filter((e) => ["whatsapp", "telefone", "rota", "formulario"].includes(e.tipo)).length;
    return Array.from({ length: periodo }, (_, i) => {
      const dia = diasAtras(periodo - 1 - i);
      const d = mapa.get(dia);
      const ehHoje = dia === diaSP();
      return {
        dia: dia.slice(8, 10) + "/" + dia.slice(5, 7),
        visitas: ehHoje ? visitasHoje : d?.visitas || 0,
        contatos: ehHoje ? contatosHoje : (d?.whatsapp || 0) + (d?.telefone || 0) + (d?.rota || 0) + (d?.formularios || 0),
      };
    });
  }, [doPeriodo, hoje, periodo]);
  const origens = Object.entries(t.origens).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([o, n]) => [nomeOrigem(o), n] as [string, number]);
  const paginas = Object.entries(t.paginasTop).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-5">
      {!site.rastreador_desde && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
          Visitas e cliques aparecem depois que o rastreador é instalado no site. Veja a aba <strong>Instalação</strong>.
        </p>
      )}
      <div className="flex gap-2">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" onClick={() => setPeriodo(n)} className={`rounded-lg px-3 py-1 text-sm ${periodo === n ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
            {n} dias
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero rotulo="Visitas" valor={num(t.visitas)} icone={Search} extra={<Variacao agora={t.visitas} antes={antes.visitas} />} />
        <Numero rotulo="Cliques no WhatsApp" valor={num(t.whatsapp)} icone={MessageCircle} extra={<Variacao agora={t.whatsapp} antes={antes.whatsapp} />} />
        <Numero rotulo="Ligações e rotas" valor={num(t.telefone + t.rota)} icone={Phone} />
        <Numero rotulo="Pelo celular" valor={t.visitas ? `${Math.round((t.celular / t.visitas) * 100)}%` : "–"} icone={MapPin} />
      </div>
      <Caixa>
        <h3 className="font-semibold mb-3">Visitas e contatos por dia</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: -20, right: 8, top: 5 }}>
              <defs>
                <linearGradient id="gVisitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="visitas" name="Visitas" stroke="hsl(var(--primary))" fill="url(#gVisitas)" strokeWidth={2} />
              <Area type="monotone" dataKey="contatos" name="Contatos" stroke="#22c55e" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Caixa>
      <div className="grid md:grid-cols-2 gap-5">
        <Caixa>
          <h3 className="font-semibold mb-3">De onde vêm as visitas</h3>
          <Barras itens={origens} total={t.visitas} />
        </Caixa>
        <Caixa>
          <h3 className="font-semibold mb-3">Páginas mais vistas</h3>
          <Barras itens={paginas} total={t.paginas} />
        </Caixa>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Google: Search Console e Perfil da Empresa
// ---------------------------------------------------------------------------
const SecaoGoogle = ({ site, externo, onAtualizar }: { site: MonitorSite; externo: MonitorExterno[]; onAtualizar: () => void }) => {
  const gsc = externo.find((e) => e.fonte === "gsc" && e.periodo === mesAtual()) || externo.find((e) => e.fonte === "gsc");
  const gbp = externo.find((e) => e.fonte === "gbp" && e.periodo === mesAtual()) || externo.find((e) => e.fonte === "gbp");
  const g = gsc?.dados as { cliques: number; impressoes: number; ctr: number; posicao: number | null; buscas: { termo: string; cliques: number; impressoes: number; posicao: number }[]; de: string; ate: string } | undefined;
  const p = gbp?.dados as Record<string, number> | undefined;
  const [config, setConfig] = useState({ gsc: site.gsc_propriedade || "", gbp: site.gbp_local || "" });
  const [manual, setManual] = useState({ mes: mesPassado(), visualizacoes: "", ligacoes: "", rotas: "", cliques_site: "", conversas: "" });
  const [listas, setListas] = useState<GoogleListas | null>(null);

  const salvarConfig = async () => {
    await atualizarSiteMonitorado(site.id, { gsc_propriedade: config.gsc.trim() || null, gbp_local: config.gbp.trim() || null })
      .then(() => toast.success("Salvo. Os dados entram na próxima coleta (ou clique em Coletar agora)."))
      .catch((e) => toast.error((e as Error).message));
    onAtualizar();
  };
  const salvarManual = async (e: FormEvent) => {
    e.preventDefault();
    const dados = Object.fromEntries(["visualizacoes", "ligacoes", "rotas", "cliques_site", "conversas"].map((k) => [k, Number(manual[k as keyof typeof manual]) || 0]));
    await salvarPerfilManual(site.id, manual.mes, dados)
      .then(() => toast.success("Números do Perfil salvos."))
      .catch((err) => toast.error((err as Error).message));
    onAtualizar();
  };

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <Caixa>
          <h3 className="font-semibold mb-1">Buscas no Google (Search Console)</h3>
          {g ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                De {g.de.split("-").reverse().join("/")} a {g.ate.split("-").reverse().join("/")}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Numero rotulo="Aparições" valor={num(g.impressoes)} />
                <Numero rotulo="Cliques" valor={num(g.cliques)} />
                <Numero rotulo="Taxa de clique" valor={`${(g.ctr * 100).toFixed(1).replace(".", ",")}%`} />
                <Numero rotulo="Posição média" valor={g.posicao ? g.posicao.toFixed(1).replace(".", ",") : "–"} />
              </div>
              <p className="text-sm font-medium mb-2">O que as pessoas buscaram</p>
              <ul className="text-sm space-y-1">
                {g.buscas.map((b) => (
                  <li key={b.termo} className="flex justify-between gap-3">
                    <span className="truncate">{b.termo}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {b.cliques} cliques · pos. {String(b.posicao).replace(".", ",")}
                    </span>
                  </li>
                ))}
                {!g.buscas.length && <li className="text-muted-foreground">Ainda sem buscas registradas.</li>}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ainda sem dados. Informe a propriedade abaixo (e a autorização do Google precisa estar configurada).</p>
          )}
        </Caixa>
        <Caixa>
          <h3 className="font-semibold mb-1">Perfil da Empresa no Google</h3>
          {p ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {nomeMes(gbp!.periodo)} {gbp!.manual ? "· digitado à mão" : "· automático"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Numero rotulo="Vezes que apareceu" valor={num(p.visualizacoes || 0)} />
                <Numero rotulo="Ligações" valor={num(p.ligacoes || 0)} />
                <Numero rotulo="Pedidos de rota" valor={num(p.rotas || 0)} />
                <Numero rotulo="Cliques no site" valor={num(p.cliques_site || 0)} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ainda sem dados. Use a API (quando o Google liberar) ou digite os números do mês abaixo.</p>
          )}
        </Caixa>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Caixa>
          <h3 className="font-semibold mb-3">Conexão com o Google</h3>
          <ConexaoGoogle onListas={setListas} />
          <div className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="gsc">Propriedade do Search Console</Label>
              <Input id="gsc" list="lista-gsc" placeholder="sc-domain:negocio.com.br  ou  https://www.negocio.com.br/" value={config.gsc} onChange={(e) => setConfig((c) => ({ ...c, gsc: e.target.value }))} />
              <datalist id="lista-gsc">
                {Array.isArray(listas?.gsc) && listas.gsc.map((g) => <option key={g.propriedade} value={g.propriedade} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gbp">ID do local no Perfil da Empresa</Label>
              <Input id="gbp" list="lista-gbp" placeholder="locations/1234567890" value={config.gbp} onChange={(e) => setConfig((c) => ({ ...c, gbp: e.target.value }))} />
              <datalist id="lista-gbp">
                {Array.isArray(listas?.gbp) && listas.gbp.map((g) => <option key={g.local} value={g.local} label={g.nome} />)}
              </datalist>
              {listas && !Array.isArray(listas.gbp) && <p className="text-xs text-muted-foreground">A lista de locais aparece quando o Google liberar o acesso à API do Perfil. Até lá, use os números digitados à mão.</p>}
            </div>
            <Button variant="outline" className="rounded-xl" onClick={salvarConfig}>
              Salvar
            </Button>
          </div>
        </Caixa>
        <Caixa>
          <h3 className="font-semibold mb-1">Números do Perfil digitados à mão</h3>
          <p className="text-xs text-muted-foreground mb-3">Copie do painel do Perfil da Empresa (Desempenho) enquanto a API não está liberada.</p>
          <form onSubmit={salvarManual} className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="m-mes">Mês</Label>
              <Input id="m-mes" type="month" value={manual.mes} onChange={(e) => setManual((m) => ({ ...m, mes: e.target.value }))} />
            </div>
            {(
              [
                ["visualizacoes", "Vezes que apareceu"],
                ["ligacoes", "Ligações"],
                ["rotas", "Pedidos de rota"],
                ["cliques_site", "Cliques no site"],
              ] as const
            ).map(([k, r]) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`m-${k}`}>{r}</Label>
                <Input id={`m-${k}`} inputMode="numeric" value={manual[k]} onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value.replace(/\D/g, "") }))} />
              </div>
            ))}
            <Button type="submit" variant="outline" className="rounded-xl col-span-2">
              Salvar números
            </Button>
          </form>
        </Caixa>
      </div>
    </div>
  );
};

const ConexaoGoogle = ({ onListas }: { onListas: (l: GoogleListas) => void }) => {
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    statusGoogle()
      .then((s) => {
        setStatus(s);
        if (s.conectado) listarGoogle().then(onListas).catch(() => undefined);
      })
      .catch(() => setStatus({ conectado: false, email: null, em: null }));
  }, [onListas]);
  const conectar = async () => {
    setOcupado(true);
    try {
      await conectarGoogle();
    } catch (e) {
      toast.error((e as Error).message);
      setOcupado(false);
    }
  };
  const desconectar = async () => {
    if (!window.confirm("Desconectar a conta do Google? As buscas e o Perfil param de atualizar até conectar de novo.")) return;
    await desconectarGoogle().catch((e) => toast.error((e as Error).message));
    setStatus({ conectado: false, email: null, em: null });
  };
  if (!status) return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
  return status.conectado ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3">
      <p className="text-sm">
        <span className="text-success font-semibold">Conectado</span> com {status.email || "a conta do Google"}
        {status.em && <span className="text-muted-foreground"> desde {new Date(status.em).toLocaleDateString("pt-BR")}</span>}
      </p>
      <button type="button" onClick={desconectar} className="text-xs text-muted-foreground hover:text-destructive">
        Desconectar
      </button>
    </div>
  ) : (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm text-muted-foreground mb-3">Entre com a conta do Google da Codifica (a que tem acesso ao Search Console e ao Perfil dos clientes) e autorize a leitura.</p>
      <Button className="rounded-xl" onClick={conectar} disabled={ocupado}>
        {ocupado ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />} Conectar Google
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Velocidade (PageSpeed)
// ---------------------------------------------------------------------------
const corNota = (n: number | null | undefined) => (n == null ? "text-muted-foreground" : n >= 90 ? "text-success" : n >= 50 ? "text-amber-400" : "text-destructive");
const Anel = ({ nota, rotulo }: { nota: number | null | undefined; rotulo: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`relative w-20 h-20 ${corNota(nota)}`}>
      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${((nota || 0) / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-bold">{nota ?? "–"}</span>
    </div>
    <span className="text-xs text-muted-foreground text-center">{rotulo}</span>
  </div>
);

const SecaoDesempenho = ({ externo }: { externo: MonitorExterno[] }) => {
  const ult = externo[0]?.dados as Record<string, number | null> | undefined;
  if (!ult) return <Caixa>Ainda sem medição. A primeira acontece na próxima coleta (ou clique em Coletar agora).</Caixa>;
  return (
    <div className="space-y-5">
      <Caixa>
        <h3 className="font-semibold mb-1">Notas do Google (celular)</h3>
        <p className="text-xs text-muted-foreground mb-4">Medido em {externo[0].periodo.split("-").reverse().join("/")} pelo PageSpeed Insights. Acima de 90 é ótimo.</p>
        <div className="flex flex-wrap justify-around gap-4">
          <Anel nota={ult.desempenho} rotulo="Velocidade" />
          <Anel nota={ult.seo} rotulo="SEO" />
          <Anel nota={ult.acessibilidade} rotulo="Acessibilidade" />
          <Anel nota={ult.boas_praticas} rotulo="Boas práticas" />
        </div>
      </Caixa>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero rotulo="Maior conteúdo aparece em" valor={ult.lcp_ms ? `${(ult.lcp_ms / 1000).toFixed(1).replace(".", ",")} s` : "–"} />
        <Numero rotulo="Estabilidade (CLS)" valor={ult.cls != null ? String(Math.round(ult.cls * 1000) / 1000).replace(".", ",") : "–"} />
        <Numero rotulo="Bloqueio da tela" valor={ult.tbt_ms != null ? `${ult.tbt_ms} ms` : "–"} />
        <Numero rotulo="Resposta ao toque (real)" valor={ult.inp_campo_ms ? `${ult.inp_campo_ms} ms` : "sem dados"} />
      </div>
      {externo.length > 1 && (
        <Caixa>
          <h3 className="font-semibold mb-2">Histórico</h3>
          <ul className="text-sm space-y-1">
            {externo.slice(0, 12).map((e) => (
              <li key={e.periodo} className="flex justify-between">
                <span>{e.periodo.split("-").reverse().join("/")}</span>
                <span className={corNota((e.dados as { desempenho?: number }).desempenho)}>Velocidade {(e.dados as { desempenho?: number }).desempenho ?? "–"}</span>
              </li>
            ))}
          </ul>
        </Caixa>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Disponibilidade
// ---------------------------------------------------------------------------
const SecaoDisponibilidade = ({ site, dias }: { site: MonitorSite; dias: MonitorDia[] }) => {
  const [checagens, setChecagens] = useState<MonitorChecagem[] | null>(null);
  useEffect(() => {
    listarChecagens(site.id, new Date(Date.now() - 24 * 3600000).toISOString()).then(setChecagens).catch(() => setChecagens([]));
  }, [site.id]);
  const t30 = somar(dias.filter((d) => d.dia > diasAtras(30)));
  const pct = t30.checagens ? ((1 - t30.falhas / t30.checagens) * 100).toFixed(2).replace(".", ",") : null;
  const tempos = (checagens || []).filter((c) => c.ok && c.ms).map((c) => c.ms!);
  const media = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;
  const falhas = (checagens || []).filter((c) => !c.ok);
  const venceEm = site.estado?.dominio_expira ? Math.round((new Date(site.estado.dominio_expira).getTime() - Date.now()) / 86400000) : null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Numero rotulo="Agora" valor={!site.estado?.ultima_checagem ? "aguardando" : site.estado.no_ar ? "No ar" : "Fora do ar"} icone={Activity} />
        <Numero rotulo="No ar (30 dias)" valor={pct ? `${pct}%` : "–"} />
        <Numero rotulo="Tempo de resposta (24 h)" valor={media ? `${media} ms` : "–"} />
        <Numero rotulo="Domínio vence" valor={site.estado?.dominio_expira ? site.estado.dominio_expira.split("-").reverse().join("/") : "–"} extra={venceEm !== null ? <span className={`text-xs ${venceEm <= 30 ? "text-destructive" : "text-muted-foreground"}`}>em {venceEm} dias</span> : undefined} />
      </div>
      <Caixa>
        <h3 className="font-semibold mb-1">Últimas 24 horas</h3>
        <p className="text-xs text-muted-foreground mb-3">Uma checagem a cada 5 minutos. Verde respondeu, vermelho falhou. Se cair, vocês recebem aviso no Telegram.</p>
        {checagens === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <div className="flex gap-[2px] h-8 items-end">
            {checagens.slice(-288).map((c, i) => (
              <span key={i} title={`${new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${c.ok ? `${c.ms} ms` : c.erro || c.status}`} className={`flex-1 rounded-sm ${c.ok ? "bg-success/70 h-full" : "bg-destructive h-full"}`} />
            ))}
            {!checagens.length && <p className="text-sm text-muted-foreground">Primeira checagem em até 5 minutos.</p>}
          </div>
        )}
      </Caixa>
      {falhas.length > 0 && (
        <Caixa>
          <h3 className="font-semibold mb-2">Falhas recentes</h3>
          <ul className="text-sm space-y-1">
            {falhas.slice(-10).reverse().map((f) => (
              <li key={f.created_at} className="flex justify-between gap-3">
                <span>{new Date(f.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-destructive truncate">{f.status ? `Resposta ${f.status}` : f.erro}</span>
              </li>
            ))}
          </ul>
        </Caixa>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Erros e segurança
// ---------------------------------------------------------------------------
const SecaoSeguranca = ({ site }: { site: MonitorSite }) => {
  const [erros, setErros] = useState<MonitorEvento[] | null>(null);
  useEffect(() => {
    listarEventos(site.id, new Date(Date.now() - 30 * 86400000).toISOString(), "erro").then(setErros).catch(() => setErros([]));
  }, [site.id]);
  const https = site.url.startsWith("https://");
  const venceEm = site.estado?.dominio_expira ? Math.round((new Date(site.estado.dominio_expira).getTime() - Date.now()) / 86400000) : null;
  const itens = [
    { ok: https, texto: https ? "Site com HTTPS (cadeado no navegador)" : "Site sem HTTPS: o navegador mostra 'não seguro'" },
    { ok: venceEm === null || venceEm > 30, texto: venceEm === null ? "Validade do domínio ainda não verificada" : `Domínio válido por mais ${venceEm} dias` },
    { ok: site.estado?.no_ar !== false, texto: site.estado?.no_ar === false ? "Site fora do ar agora" : "Site respondendo normalmente" },
    { ok: (erros?.length || 0) === 0, texto: erros?.length ? `${erros.length} erro${erros.length > 1 ? "s" : ""} de JavaScript nos últimos 30 dias` : "Nenhum erro de JavaScript nos últimos 30 dias" },
  ];
  return (
    <div className="space-y-5">
      <Caixa>
        <h3 className="font-semibold mb-3">Verificações</h3>
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.texto} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full grid place-items-center text-white text-xs ${i.ok ? "bg-success" : "bg-destructive"}`}>{i.ok ? "✓" : "!"}</span>
              {i.texto}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-4">
          Tentativas de ataque, bloqueios e rate limit só existem em sistemas com servidor próprio. Para os sites de uma página, o que importa é o que está acima.
        </p>
      </Caixa>
      {erros && erros.length > 0 && (
        <Caixa>
          <h3 className="font-semibold mb-2">Erros de JavaScript (30 dias)</h3>
          <ul className="text-sm space-y-1">
            {erros.slice(0, 20).map((e, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{e.detalhe || "erro"}</span>
                <span className="text-muted-foreground shrink-0">
                  {e.pagina} · {new Date(e.created_at).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        </Caixa>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Funil (sites dos clientes): visitas → contatos
// ---------------------------------------------------------------------------
const SecaoFunil = ({ dias, hoje }: { dias: MonitorDia[]; hoje: (MonitorEvento & { site_id: string })[] }) => {
  const [periodo, setPeriodo] = useState(30);
  const t = somar(
    dias.filter((d) => d.dia > diasAtras(periodo)),
    hoje
  );
  const total = contatos(t);
  const canais: [string, number][] = [
    ["Cliques no WhatsApp", t.whatsapp],
    ["Ligações", t.telefone],
    ["Pedidos de rota", t.rota],
    ["Formulários enviados", t.formularios],
  ];
  const etapas: [string, number, string][] = [
    ["Visitas", t.visitas, ""],
    ["Contatos", total, t.visitas ? `${((total / t.visitas) * 100).toFixed(1).replace(".", ",")}% das visitas` : ""],
  ];
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" onClick={() => setPeriodo(n)} className={`rounded-lg px-3 py-1 text-sm ${periodo === n ? "bg-foreground text-background" : "border border-border text-muted-foreground"}`}>
            {n} dias
          </button>
        ))}
      </div>
      <Caixa>
        <h3 className="font-semibold mb-1">Da visita ao contato</h3>
        <p className="text-xs text-muted-foreground mb-4">Quantas pessoas que entraram no site falaram com o negócio.</p>
        <div className="space-y-4">
          {etapas.map(([rotulo, valor, extra]) => (
            <div key={rotulo}>
              <div className="flex justify-between text-sm mb-1">
                <span>{rotulo}</span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{num(valor)}</strong>
                  {extra && ` · ${extra}`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: t.visitas ? `${Math.max(2, (valor / t.visitas) * 100)}%` : 0 }} />
              </div>
            </div>
          ))}
        </div>
      </Caixa>
      <Caixa>
        <h3 className="font-semibold mb-3">Como entraram em contato</h3>
        <Barras itens={canais} total={total} />
      </Caixa>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
const SecaoRelatorios = ({ site, onAtualizar }: { site: MonitorSite; onAtualizar: () => void }) => {
  const [lista, setLista] = useState<MonitorRelatorio[] | null>(null);
  const [email, setEmail] = useState(site.relatorio_email || "");
  const [mes, setMes] = useState(mesPassado());
  const [ocupado, setOcupado] = useState<"" | "previa" | "enviar">("");
  const [previa, setPrevia] = useState<Record<string, unknown> | null>(null);

  const recarregar = useCallback(() => listarRelatorios(site.id).then(setLista).catch(() => setLista([])), [site.id]);
  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const salvar = async (campos: Partial<MonitorSite>) => {
    await atualizarSiteMonitorado(site.id, campos).catch((e) => toast.error((e as Error).message));
    onAtualizar();
  };
  const gerar = async (enviar: boolean) => {
    setOcupado(enviar ? "enviar" : "previa");
    try {
      const r = await acaoMonitor({ modo: "relatorio", site_id: site.id, mes, enviar });
      setPrevia(r.dados || null);
      if (enviar) toast[r.enviado ? "success" : "message"](r.enviado ? `Relatório enviado para ${site.relatorio_email}.` : "Esse mês já tinha sido enviado (ou falta o e-mail).");
      recarregar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado("");
    }
  };
  const a = (previa?.atual || null) as Record<string, number> | null;

  return (
    <div className="space-y-5">
      <Caixa>
        <h3 className="font-semibold mb-1">Relatório mensal automático</h3>
        <p className="text-sm text-muted-foreground mb-4">Todo dia 1º, às 9h, o cliente recebe por e-mail o resumo do mês anterior: visitas, contatos, Google e site no ar.</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={site.relatorio_ativo} onCheckedChange={(v) => salvar({ relatorio_ativo: v })} disabled={!site.relatorio_email} /> Enviar todo mês
          </label>
          <div className="space-y-1 grow max-w-sm">
            <Label htmlFor="rel-email">E-mail do cliente</Label>
            <div className="flex gap-2">
              <Input id="rel-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
              <Button variant="outline" className="rounded-xl" onClick={() => salvar({ relatorio_email: email.trim() || null })}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Caixa>
      <Caixa>
        <h3 className="font-semibold mb-3">Gerar agora</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="rel-mes">Mês</Label>
            <Input id="rel-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => gerar(false)} disabled={!!ocupado}>
            {ocupado === "previa" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileBarChart className="w-4 h-4 mr-2" />} Ver prévia
          </Button>
          <Button className="rounded-xl" onClick={() => gerar(true)} disabled={!!ocupado || !site.relatorio_email}>
            {ocupado === "enviar" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Enviar por e-mail
          </Button>
        </div>
        {a && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <Numero rotulo="Visitas" valor={num(a.visitas)} />
            <Numero rotulo="Cliques no WhatsApp" valor={num(a.whatsapp)} />
            <Numero rotulo="Ligações e rotas" valor={num(a.telefone + a.rota)} />
            <Numero rotulo="Site no ar" valor={previa?.disponibilidade != null ? `${String(previa.disponibilidade).replace(".", ",")}%` : "–"} />
          </div>
        )}
      </Caixa>
      <Caixa>
        <h3 className="font-semibold mb-2">Enviados</h3>
        {lista === null ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <ul className="text-sm space-y-1">
            {lista.map((r) => (
              <li key={r.mes} className="flex justify-between gap-3">
                <span className="capitalize">{nomeMes(r.mes)}</span>
                <span className={r.enviado_em ? "text-success" : "text-muted-foreground"}>
                  {r.enviado_em ? `enviado em ${new Date(r.enviado_em).toLocaleDateString("pt-BR")}` : "só prévia"}
                </span>
              </li>
            ))}
            {!lista.length && <li className="text-muted-foreground">Nenhum relatório ainda.</li>}
          </ul>
        )}
      </Caixa>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Instalação do rastreador
// ---------------------------------------------------------------------------
const SecaoInstalacao = ({ site, onAtualizar }: { site: MonitorSite; onAtualizar: () => void }) => {
  const [copiado, setCopiado] = useState(false);
  const codigo = snippetRastreador(site.chave);
  const copiar = () =>
    navigator.clipboard.writeText(codigo).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  const remover = async () => {
    if (!window.confirm(`Parar de monitorar e apagar os dados de ${site.nome}? Não dá para desfazer.`)) return;
    await removerSiteMonitorado(site.id).catch((e) => toast.error((e as Error).message));
    onAtualizar();
  };
  return (
    <div className="space-y-5">
      <Caixa>
        <h3 className="font-semibold mb-1">Rastreador de visitas e cliques</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Cole esta linha antes do <code>&lt;/head&gt;</code> do site. Ele conta visitas, de onde vieram e os cliques no WhatsApp, telefone e rota. Sem cookie e sem guardar IP, então não precisa
          de aviso de cookies.
        </p>
        <pre className="rounded-xl bg-background border border-border p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">{codigo}</pre>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <Button variant="outline" className="rounded-xl" onClick={copiar}>
            {copiado ? <Check className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />} {copiado ? "Copiado" : "Copiar código"}
          </Button>
          <span className={`text-sm ${site.rastreador_desde ? "text-success" : "text-muted-foreground"}`}>
            {site.rastreador_desde ? `Funcionando desde ${new Date(site.rastreador_desde).toLocaleDateString("pt-BR")}` : "Ainda não recebeu nenhuma visita"}
          </span>
        </div>
      </Caixa>
      <Caixa>
        <h3 className="font-semibold mb-1 text-destructive">Remover</h3>
        <p className="text-sm text-muted-foreground mb-3">Apaga o site e todo o histórico de métricas dele.</p>
        <Button variant="outline" className="rounded-xl text-destructive" onClick={remover}>
          <Trash2 className="w-4 h-4 mr-2" /> Remover site
        </Button>
      </Caixa>
    </div>
  );
};

export default AbaMetricas;
