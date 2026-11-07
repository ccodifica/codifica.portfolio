import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, Plus, Repeat, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EQUIPE, OFERTA, brl } from "@/config/oferta";
import { PedidoAdmin } from "@/lib/pedidos";
import {
  FORMA_LABEL,
  FormaPagamento,
  Lancamento,
  NovoLancamento,
  TIPO_LABEL,
  TipoLancamento,
  anexarNota,
  baixarDocumento,
  criarLancamento,
  excluirLancamento,
  hojeISO,
  listarLancamentos,
  mesISO,
  nomeMes,
} from "@/lib/financeiro";
import { Project, User } from "@/types/client-area";

type Periodo = "mes" | "ano" | "tudo";
const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "ano", rotulo: "Este ano" },
  { id: "tudo", rotulo: "Desde o início" },
];

const dataBR = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
const campo =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** A manutenção é cobrada a partir do mês seguinte ao pagamento do site. */
const devendoManutencaoEm = (p: PedidoAdmin, mes: string) => {
  if (p.status !== "no_ar" || p.manutencao_status !== "ativa" || !p.pago_em) return false;
  const pago = new Date(p.pago_em);
  const primeiroMesCobrado = new Date(pago.getFullYear(), pago.getMonth() + 1, 1);
  return primeiroMesCobrado <= new Date(`${mes}T12:00:00`);
};

// ---------------------------------------------------------------------------
// Novo lançamento
// ---------------------------------------------------------------------------
type Rascunho = {
  tipo: TipoLancamento;
  pedido_id: string;
  projeto_id: string;
  cliente: string;
  descricao: string;
  valor: string;
  forma: FormaPagamento;
  parcelas: string;
  recebido_em: string;
  competencia: string; // YYYY-MM
};

const rascunhoVazio = (): Rascunho => ({
  tipo: "site",
  pedido_id: "",
  projeto_id: "",
  cliente: "",
  descricao: "",
  valor: "",
  forma: "pix",
  parcelas: "1",
  recebido_em: hojeISO(),
  competencia: hojeISO().slice(0, 7),
});

const DialogoLancamento = ({
  inicial,
  pedidos,
  projetos,
  usuarios,
  onFechar,
  onCriado,
}: {
  inicial: Rascunho | null;
  pedidos: PedidoAdmin[];
  projetos: Project[];
  usuarios: User[];
  onFechar: () => void;
  onCriado: (l: Lancamento) => void;
}) => {
  const [r, setR] = useState<Rascunho>(rascunhoVazio());
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (inicial) setR(inicial);
  }, [inicial]);

  const set = <K extends keyof Rascunho>(k: K, v: Rascunho[K]) => setR((x) => ({ ...x, [k]: v }));
  const pedidosVinculaveis = pedidos.filter((p) => p.status !== "cancelado");
  const nomeProjeto = (pr: Project) => `${pr.nome} · ${usuarios.find((u) => u.id === pr.clienteId)?.nome || "cliente"}`;

  const escolherPedido = (id: string) => {
    const p = pedidos.find((x) => x.id === id);
    setR((x) => ({ ...x, pedido_id: id, cliente: p ? p.negocio : x.cliente }));
  };
  const escolherProjeto = (id: string) => {
    const pr = projetos.find((x) => x.id === id);
    const dono = pr && usuarios.find((u) => u.id === pr.clienteId);
    setR((x) => ({ ...x, projeto_id: id, cliente: pr ? dono?.empresa || dono?.nome || pr.nome : x.cliente }));
  };
  const escolherTipo = (tipo: TipoLancamento) =>
    setR((x) => ({
      ...x,
      tipo,
      pedido_id: tipo === "site" || tipo === "manutencao" ? x.pedido_id : "",
      projeto_id: tipo === "sistema" ? x.projeto_id : "",
      valor: tipo === "manutencao" && !x.valor ? String(OFERTA.mensalidade) : x.valor,
    }));

  const valor = Number(r.valor.replace(",", "."));
  const valido = r.cliente.trim() && valor > 0 && r.recebido_em;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setSalvando(true);
    try {
      const novo: NovoLancamento = {
        tipo: r.tipo,
        pedido_id: r.pedido_id || null,
        projeto_id: r.projeto_id || null,
        cliente: r.cliente.trim(),
        descricao: r.descricao.trim() || null,
        valor,
        forma: r.forma,
        parcelas: r.forma === "cartao" ? Math.min(12, Math.max(1, Number(r.parcelas) || 1)) : 1,
        recebido_em: r.recebido_em,
        competencia: r.tipo === "manutencao" ? `${r.competencia}-01` : null,
      };
      onCriado(await criarLancamento(novo));
      toast.success("Recebimento registrado. Lembre de anexar a nota fiscal.");
      onFechar();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={!!inicial} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-clarity-mask="True">
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>Venda de site, mês de manutenção, sistema ou outro valor que entrou.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(TIPO_LABEL) as TipoLancamento[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => escolherTipo(t)}
                aria-pressed={r.tipo === t}
                className={`rounded-lg border px-2 py-2 text-sm ${r.tipo === t ? "border-primary bg-primary/15" : "border-border text-muted-foreground"}`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>

          {(r.tipo === "site" || r.tipo === "manutencao") && (
            <div className="space-y-1">
              <Label htmlFor="l-pedido">Pedido de site</Label>
              <select id="l-pedido" className={campo} value={r.pedido_id} onChange={(e) => escolherPedido(e.target.value)}>
                <option value="">Sem vínculo</option>
                {pedidosVinculaveis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.negocio} · {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          {r.tipo === "sistema" && (
            <div className="space-y-1">
              <Label htmlFor="l-projeto">Projeto de sistema</Label>
              <select id="l-projeto" className={campo} value={r.projeto_id} onChange={(e) => escolherProjeto(e.target.value)}>
                <option value="">Sem vínculo</option>
                {projetos.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {nomeProjeto(pr)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="l-cliente">Cliente</Label>
            <Input id="l-cliente" value={r.cliente} onChange={(e) => set("cliente", e.target.value)} placeholder="Nome do negócio ou do cliente" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l-valor">Valor recebido (R$)</Label>
              <Input id="l-valor" inputMode="decimal" value={r.valor} onChange={(e) => set("valor", e.target.value)} placeholder="597" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-data">Recebido em</Label>
              <Input id="l-data" type="date" value={r.recebido_em} onChange={(e) => set("recebido_em", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(FORMA_LABEL) as FormaPagamento[]).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => set("forma", f)}
                  aria-pressed={r.forma === f}
                  className={`rounded-lg border px-2 py-2 text-sm ${r.forma === f ? "border-primary bg-primary/15" : "border-border text-muted-foreground"}`}
                >
                  {FORMA_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {r.forma === "cartao" && (
              <div className="space-y-1">
                <Label htmlFor="l-parcelas">Parcelas</Label>
                <Input id="l-parcelas" type="number" min={1} max={12} value={r.parcelas} onChange={(e) => set("parcelas", e.target.value)} />
              </div>
            )}
            {r.tipo === "manutencao" && (
              <div className="space-y-1">
                <Label htmlFor="l-mes">Mês pago</Label>
                <Input id="l-mes" type="month" value={r.competencia} onChange={(e) => set("competencia", e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="l-desc">
              Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input id="l-desc" value={r.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex.: Site + Perfil do Google" />
          </div>

          <Button type="submit" className="w-full rounded-xl" disabled={!valido || salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar {valor > 0 ? brl(valor) : ""}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Anexar nota fiscal
// ---------------------------------------------------------------------------
const DialogoNota = ({
  lancamento,
  onFechar,
  onAtualiza,
}: {
  lancamento: Lancamento | null;
  onFechar: () => void;
  onAtualiza: (l: Lancamento) => void;
}) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [numero, setNumero] = useState("");
  const [emitidaPor, setEmitidaPor] = useState<string>(EQUIPE[0].nome);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setArquivo(null);
    setNumero(lancamento?.nota_numero || "");
    setEmitidaPor(lancamento?.nota_emitida_por || EQUIPE[0].nome);
  }, [lancamento]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!lancamento || !arquivo) return;
    setEnviando(true);
    try {
      onAtualiza(await anexarNota(lancamento, arquivo, { numero, emitidaPor }));
      toast.success("Nota anexada. O cliente já consegue baixar pelo link dele.");
      onFechar();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={!!lancamento} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-md" data-clarity-mask="True">
        <DialogHeader>
          <DialogTitle>{lancamento?.nota_path ? "Trocar nota fiscal" : "Anexar nota fiscal"}</DialogTitle>
          <DialogDescription>
            {lancamento && `${lancamento.cliente} · ${brl(lancamento.valor)} · ${dataBR(lancamento.recebido_em)}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="n-arquivo">PDF da nota</Label>
            <Input id="n-arquivo" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="n-numero">
                Número <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input id="n-numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="n-cnpj">CNPJ de quem emitiu</Label>
              <select id="n-cnpj" className={campo} value={emitidaPor} onChange={(e) => setEmitidaPor(e.target.value)}>
                {EQUIPE.map((p) => (
                  <option key={p.nome} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
                <option value="Codifica">Codifica</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={!arquivo || enviando}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Anexar nota
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Aba
// ---------------------------------------------------------------------------
const AbaFinanceiro = ({ pedidos, projetos, usuarios }: { pedidos: PedidoAdmin[]; projetos: Project[]; usuarios: User[] }) => {
  const [lancamentos, setLancamentos] = useState<Lancamento[] | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [soSemNota, setSoSemNota] = useState(false);
  const [novo, setNovo] = useState<Rascunho | null>(null);
  const [nota, setNota] = useState<Lancamento | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  useEffect(() => {
    listarLancamentos()
      .then(setLancamentos)
      .catch((e) => {
        toast.error((e as Error).message);
        setLancamentos([]);
      });
  }, []);

  const hoje = hojeISO();
  const mesAtual = mesISO(hoje);
  const inicio = periodo === "mes" ? mesAtual : periodo === "ano" ? `${hoje.slice(0, 4)}-01-01` : "0000-01-01";

  const lista = lancamentos || [];
  const noPeriodo = lista.filter((l) => l.recebido_em >= inicio);
  const soma = (tipo?: TipoLancamento) => noPeriodo.filter((l) => !tipo || l.tipo === tipo).reduce((t, l) => t + l.valor, 0);
  const qtd = (tipo: TipoLancamento) => noPeriodo.filter((l) => l.tipo === tipo).length;
  const semNota = lista.filter((l) => !l.nota_path);

  const comManutencao = pedidos.filter((p) => p.status === "no_ar" && p.manutencao_status === "ativa");
  const sistemasComManutencao = projetos.filter((p) => p.status === "concluido" && p.manutencaoAtiva).length;
  const recorrente = comManutencao.length * OFERTA.mensalidade;

  const mensalidades = useMemo(
    () =>
      pedidos
        .filter((p) => devendoManutencaoEm(p, mesAtual))
        .map((p) => ({
          p,
          pago: lista.some((l) => l.tipo === "manutencao" && l.pedido_id === p.id && l.competencia === mesAtual),
        }))
        .sort((a, b) => Number(a.pago) - Number(b.pago)),
    [pedidos, lista, mesAtual]
  );

  const visiveis = (soSemNota ? semNota : noPeriodo).slice(0, 200);
  const rotuloPeriodo = PERIODOS.find((x) => x.id === periodo)!.rotulo.toLowerCase();

  const cartoes = [
    { rotulo: "Total recebido", valor: brl(soma()), dica: rotuloPeriodo, icone: Wallet, destaque: true },
    { rotulo: "Sites vendidos", valor: brl(soma("site")), dica: `${qtd("site")} ${qtd("site") === 1 ? "site" : "sites"}`, icone: CheckCircle2 },
    { rotulo: "Manutenção", valor: brl(soma("manutencao")), dica: `${qtd("manutencao")} mensalidade(s) recebida(s)`, icone: Repeat },
    { rotulo: "Sistemas e outros", valor: brl(soma("sistema") + soma("outro")), dica: `${qtd("sistema") + qtd("outro")} recebimento(s)`, icone: Wallet },
  ];

  const atualizar = (l: Lancamento) =>
    setLancamentos((xs) => [l, ...(xs || []).filter((x) => x.id !== l.id)].sort((a, b) => b.recebido_em.localeCompare(a.recebido_em)));

  const excluir = async (l: Lancamento) => {
    try {
      await excluirLancamento(l);
      setLancamentos((xs) => (xs || []).filter((x) => x.id !== l.id));
      toast.success("Lançamento excluído.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExcluindo(null);
    }
  };

  const baixar = (path: string) => baixarDocumento(path).catch((e) => toast.error((e as Error).message));

  if (!lancamentos) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-border p-1 bg-card/50 self-start">
          {PERIODOS.map(({ id, rotulo }) => (
            <button
              key={id}
              onClick={() => {
                setPeriodo(id);
                setSoSemNota(false);
              }}
              aria-pressed={periodo === id}
              className={`px-3 py-1.5 text-sm rounded-lg ${periodo === id && !soSemNota ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <Button className="rounded-xl" onClick={() => setNovo(rascunhoVazio())}>
          <Plus className="w-4 h-4 mr-1.5" /> Registrar recebimento
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cartoes.map(({ rotulo, valor, dica, icone: Icone, destaque }) => (
          <div key={rotulo} className={`rounded-2xl border p-4 ${destaque ? "border-primary/50 bg-primary/10" : "border-border bg-card/70"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{rotulo}</span>
              <Icone className={`w-4 h-4 ${destaque ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
            </div>
            <p className="text-2xl md:text-3xl font-bold text-foreground leading-none mb-1">{valor}</p>
            <p className="text-xs text-muted-foreground">{dica}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recorrência */}
        <section className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Mensalidades de {nomeMes(mesAtual)}</h2>
              <p className="text-sm text-muted-foreground">
                {comManutencao.length} {comManutencao.length === 1 ? "site" : "sites"} com manutenção · {brl(recorrente)}/mês
                {sistemasComManutencao > 0 && ` · ${sistemasComManutencao} sistema(s) com manutenção`}
              </p>
            </div>
          </div>
          {mensalidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma mensalidade para cobrar neste mês. O 1º mês vem incluso no preço do site.
            </p>
          ) : (
            <ul className="space-y-2">
              {mensalidades.map(({ p, pago }) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.negocio}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.nome}</p>
                  </div>
                  {pago ? (
                    <span className="text-success text-xs font-semibold inline-flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Pago
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg shrink-0"
                      onClick={() =>
                        setNovo({
                          ...rascunhoVazio(),
                          tipo: "manutencao",
                          pedido_id: p.id,
                          cliente: p.negocio,
                          valor: String(OFERTA.mensalidade),
                          descricao: `Manutenção de ${nomeMes(mesAtual)}`,
                        })
                      }
                    >
                      Registrar {brl(OFERTA.mensalidade)}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notas */}
        <section className={`rounded-2xl border p-5 ${semNota.length ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card/70"}`}>
          <h2 className="text-lg font-semibold mb-1">Notas fiscais</h2>
          {semNota.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" /> Todos os recebimentos têm nota anexada.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                {semNota.length} {semNota.length === 1 ? "recebimento está" : "recebimentos estão"} sem nota. Emita a nota e anexe o
                PDF: o cliente baixa pelo link dele na hora.
              </p>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setSoSemNota(true)}>
                Ver os que faltam
              </Button>
            </>
          )}
        </section>
      </div>

      {/* Lançamentos */}
      <section className="rounded-2xl border border-border bg-card/70">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 className="text-lg font-semibold">{soSemNota ? "Recebimentos sem nota" : `Recebimentos · ${rotuloPeriodo}`}</h2>
          {soSemNota && (
            <Button size="sm" variant="ghost" onClick={() => setSoSemNota(false)}>
              Ver todos
            </Button>
          )}
        </div>
        {visiveis.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted-foreground">Nenhum recebimento registrado {soSemNota ? "sem nota" : `em ${rotuloPeriodo}`}.</p>
        ) : (
          <ul className="divide-y divide-border" data-clarity-mask="True">
            {visiveis.map((l) => (
              <li key={l.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">{TIPO_LABEL[l.tipo]}</span>
                    <p className="font-medium truncate">{l.cliente}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dataBR(l.recebido_em)} · {FORMA_LABEL[l.forma]}
                    {l.parcelas > 1 && ` em ${l.parcelas}x`}
                    {l.competencia && ` · ref. ${nomeMes(l.competencia)}`}
                    {l.descricao && ` · ${l.descricao}`}
                  </p>
                </div>
                <p className="font-semibold text-foreground sm:w-28 sm:text-right">{brl(l.valor)}</p>
                <div className="flex items-center gap-1 sm:w-auto">
                  {l.nota_path ? (
                    <>
                      <Button size="sm" variant="ghost" className="text-success" onClick={() => baixar(l.nota_path!)}>
                        <Download className="w-4 h-4 mr-1" /> Nota{l.nota_numero ? ` ${l.nota_numero}` : ""}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setNota(l)}>
                        Trocar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="rounded-lg border-yellow-500/40" onClick={() => setNota(l)}>
                      <FileUp className="w-4 h-4 mr-1" /> Anexar nota
                    </Button>
                  )}
                  {excluindo === l.id ? (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => excluir(l)}>
                        Excluir mesmo
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExcluindo(null)}>
                        Não
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost" aria-label="Excluir lançamento" onClick={() => setExcluindo(l.id)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DialogoLancamento
        inicial={novo}
        pedidos={pedidos}
        projetos={projetos}
        usuarios={usuarios}
        onFechar={() => setNovo(null)}
        onCriado={atualizar}
      />
      <DialogoNota lancamento={nota} onFechar={() => setNota(null)} onAtualiza={atualizar} />
    </div>
  );
};

export default AbaFinanceiro;
