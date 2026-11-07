import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Hourglass,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Paperclip,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OFERTA, brl, precoAtual } from "@/config/oferta";
import {
  ArquivoEntrega,
  FORMA_LABEL,
  FormaPagamento,
  baixarDocumento,
  criarLancamento,
  enviarArquivoEntrega,
  hojeISO,
  removerArquivoEntrega,
} from "@/lib/financeiro";
import {
  EMAIL_PERFIL_CODIFICA,
  MOTIVO_PERDA_LABEL,
  MotivoPerda,
  ORIGEM_LABEL,
  Origem,
  PEDIDO_STATUS_LABEL,
  PedidoAdmin,
  PedidoEvento,
  PedidoStatus,
  REDES_LISTA,
  atualizarPedido,
  criarPreCadastro,
  linkPedido,
  urlArquivo,
} from "@/lib/pedidos";

// ---------------------------------------------------------------------------
// Regras de etapa: de quem é a vez e qual o próximo passo
// ---------------------------------------------------------------------------
type DeQuem = "cliente" | "codifica" | "fim";

const ETAPA: Record<PedidoStatus, { deQuem: DeQuem; proximo: string; cor: string }> = {
  pre_cadastro: { deQuem: "cliente", proximo: "Cliente confirmar os dados no link", cor: "bg-muted text-muted-foreground" },
  recebido: { deQuem: "codifica", proximo: "Montar e publicar a prévia", cor: "bg-primary/15 text-primary" },
  mudanca_pedida: { deQuem: "codifica", proximo: "Aplicar a mudança e publicar de novo", cor: "bg-yellow-500/15 text-yellow-300" },
  previa_pronta: { deQuem: "cliente", proximo: "Cliente aprovar a prévia", cor: "bg-accent/15 text-accent" },
  aprovado: { deQuem: "cliente", proximo: "Cliente aceitar o contrato", cor: "bg-accent/15 text-accent" },
  contrato_aceito: { deQuem: "codifica", proximo: "Enviar o link e confirmar o pagamento", cor: "bg-yellow-500/15 text-yellow-300" },
  pago: { deQuem: "codifica", proximo: "Construir o site e publicar", cor: "bg-success/15 text-success" },
  no_ar: { deQuem: "fim", proximo: "Site no ar · manutenção mensal", cor: "bg-success/25 text-success" },
  cancelado: { deQuem: "fim", proximo: "Encerrado", cor: "bg-destructive/15 text-destructive" },
};

/**
 * Grupos do painel (definição do Pedro, 06/11):
 * - Negociação: ainda não pagou (do pré-cadastro até o contrato aceito)
 * - Em andamento: já pagou e o site ainda não está pronto
 * - Concluídos: todos os sites entregues, sem exceção
 * - No ar: os entregues que estão com a manutenção da Codifica
 */
const NEGOCIACAO: PedidoStatus[] = ["pre_cadastro", "recebido", "mudanca_pedida", "previa_pronta", "aprovado", "contrato_aceito"];
const emAndamento = (p: PedidoAdmin) => p.status === "pago";
const concluido = (p: PedidoAdmin) => p.status === "no_ar";
const noAr = (p: PedidoAdmin) => p.status === "no_ar" && p.manutencao_status === "ativa";

const FILTROS: { id: string; rotulo: string; teste: (p: PedidoAdmin) => boolean }[] = [
  { id: "negociacao", rotulo: "Negociação", teste: (p) => NEGOCIACAO.includes(p.status) },
  { id: "andamento", rotulo: "Em andamento", teste: emAndamento },
  { id: "concluidos", rotulo: "Concluídos", teste: concluido },
  { id: "no_ar", rotulo: "No ar", teste: noAr },
  { id: "cancelado", rotulo: "Perdidos", teste: (p) => p.status === "cancelado" },
  { id: "todos", rotulo: "Todos", teste: () => true },
];

const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const tempo = (d: number) => (d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`);

const zap = (numero: string, texto: string) => {
  const d = numero.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}?text=${encodeURIComponent(texto)}`;
};

/** Mensagem pronta para o WhatsApp conforme a etapa. */
const mensagemEtapa = (p: PedidoAdmin) => {
  const nome = p.nome.split(" ")[0];
  const link = linkPedido(p.codigo);
  switch (p.status) {
    case "pre_cadastro":
      return `Oi, ${nome}! Aqui é da Codifica. Para montar a prévia do site do ${p.negocio}, confere seus dados neste link (leva 1 minuto): ${link}`;
    case "previa_pronta":
      return `Oi, ${nome}! A prévia do site do ${p.negocio} está pronta: ${p.previa_url || link}\n\nSe gostar, é só me responder aqui. Se quiser mudar algo, me conta o que. Você também pode aprovar pelo seu link: ${link}`;
    case "aprovado":
      return `Oi, ${nome}! Que bom que gostou da prévia. Falta só aceitar o contrato aqui: ${link}`;
    case "contrato_aceito":
      return `Oi, ${nome}! Obrigado pelo aceite. O pagamento fica neste link: ${link}`;
    case "no_ar":
      return `Oi, ${nome}! O site do ${p.negocio} está no ar: ${p.site_url || link}`;
    default:
      return `Oi, ${nome}! Aqui é da Codifica. Você acompanha o pedido do ${p.negocio} por este link: ${link}`;
  }
};

const Pilula = ({ status }: { status: PedidoStatus }) => (
  <span className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 whitespace-nowrap ${ETAPA[status].cor}`}>
    {PEDIDO_STATUS_LABEL[status]}
  </span>
);

const copiar = (texto: string, aviso: string) =>
  navigator.clipboard.writeText(texto).then(
    () => toast.success(aviso),
    () => toast.error("Não foi possível copiar.")
  );

// ---------------------------------------------------------------------------
// Resumo no topo
// ---------------------------------------------------------------------------
const Resumo = ({
  pedidos,
  filtro,
  onFiltrar,
}: {
  pedidos: PedidoAdmin[];
  filtro: string;
  onFiltrar: (id: string) => void;
}) => {
  const andamento = pedidos.filter(emAndamento);
  const concluidos = pedidos.filter(concluido);
  const comManutencao = pedidos.filter(noAr);

  const cartoes = [
    { id: "andamento", icone: Hourglass, rotulo: "Em andamento", valor: andamento.length, dica: "já pagos, site ainda não está pronto" },
    { id: "concluidos", icone: CheckCircle2, rotulo: "Concluídos", valor: concluidos.length, dica: "todos os sites entregues" },
    { id: "no_ar", icone: Wallet, rotulo: "Sites no ar", valor: comManutencao.length, dica: `com manutenção · ${brl(comManutencao.length * OFERTA.mensalidade)}/mês` },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {cartoes.map(({ id, icone: Icone, rotulo, valor, dica }) => {
        const ativo = filtro === id;
        return (
          <button
            key={id}
            onClick={() => onFiltrar(id)}
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
  );
};

// ---------------------------------------------------------------------------
// Novo pré-cadastro (modal)
// ---------------------------------------------------------------------------
const NovoPreCadastro = ({
  aberto,
  onAberto,
  onCriado,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  onCriado: (p: PedidoAdmin) => void;
}) => {
  const vazio = { nome: "", email: "", whatsapp: "", negocio: "", cidade: "", redes: "", origem: "meta" as Origem };
  const [f, setF] = useState(vazio);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const p = await criarPreCadastro({
        nome: f.nome,
        email: f.email,
        whatsapp: f.whatsapp,
        negocio: f.negocio,
        cidade: f.cidade,
        redes: f.redes.trim() ? { outro: f.redes.trim() } : {},
        origem: f.origem,
      });
      await navigator.clipboard.writeText(linkPedido(p.codigo)).catch(() => undefined);
      toast.success("Pré-cadastro criado. O link pessoal foi copiado.");
      onCriado(p);
      setF({ ...vazio, origem: f.origem });
      onAberto(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const campos: [keyof typeof vazio, string, boolean, string?][] = [
    ["nome", "Nome", true],
    ["whatsapp", "WhatsApp", true, "(21) 99999-9999"],
    ["negocio", "Negócio", true],
    ["cidade", "Cidade e bairro", true],
    ["email", "E-mail", false],
    ["redes", "Instagram, Facebook ou Google", false],
  ];

  return (
    <Dialog open={aberto} onOpenChange={onAberto}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pré-cadastro</DialogTitle>
          <DialogDescription>
            Para leads da Meta, prospecção ou indicação. O cliente recebe um link com tudo preenchido e só confere.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {campos.map(([k, r, obrigatorio, dica]) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={`pc-${k}`}>
                  {r} {!obrigatorio && <span className="text-muted-foreground font-normal">(opcional)</span>}
                </Label>
                <Input
                  id={`pc-${k}`}
                  required={obrigatorio}
                  type={k === "email" ? "email" : "text"}
                  placeholder={dica}
                  value={f[k] as string}
                  onChange={(e) => setF((v) => ({ ...v, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label>Origem</Label>
              <Select value={f.origem} onValueChange={(v) => setF((x) => ({ ...x, origem: v as Origem }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORIGEM_LABEL) as Origem[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {ORIGEM_LABEL[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="rounded-xl">
              {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar e copiar link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Linha da lista
// ---------------------------------------------------------------------------
const LinhaPedido = ({ p, dias, onAbrir }: { p: PedidoAdmin; dias: number; onAbrir: () => void }) => {
  const e = ETAPA[p.status];
  const atrasado = e.deQuem === "cliente" && dias >= 2;
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onAbrir}
        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onAbrir()}
        className="group grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1.3fr)_auto] items-center gap-3 md:gap-5 rounded-2xl border border-border bg-card/70 px-4 py-4 md:px-5 hover:border-primary/50 hover:bg-card transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{p.negocio}</p>
          <p className="text-sm text-muted-foreground truncate">
            {p.nome} · {p.cidade}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Pilula status={p.status} />
          <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {ORIGEM_LABEL[p.origem]}
          </span>
          {p.precisa_sistema === "sim" && (
            <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Sistema</span>
          )}
        </div>
        <div className="min-w-0 text-sm">
          <p className={`truncate ${e.deQuem === "codifica" ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {e.deQuem === "codifica" && <span className="text-primary">● </span>}
            {e.proximo}
          </p>
          <p className={`text-xs flex items-center gap-1 ${atrasado ? "text-yellow-300" : "text-muted-foreground"}`}>
            <Clock className="w-3 h-3" aria-hidden /> nesta etapa {tempo(dias)}
            {atrasado && " · retomar contato"}
          </p>
        </div>
        <div className="flex items-center gap-1 justify-end" onClick={(ev) => ev.stopPropagation()}>
          <Button size="icon" variant="ghost" asChild title="Mandar mensagem no WhatsApp">
            <a href={zap(p.whatsapp, mensagemEtapa(p))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Copiar link pessoal"
            aria-label="Copiar link pessoal"
            onClick={() => copiar(linkPedido(p.codigo), "Link pessoal copiado.")}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-1 hidden md:block" aria-hidden />
        </div>
      </div>
    </li>
  );
};

// ---------------------------------------------------------------------------
// Painel lateral do pedido
// ---------------------------------------------------------------------------
const Bloco = ({ titulo, children, icone: Icone }: { titulo: string; children: ReactNode; icone?: typeof FileText }) => (
  <section className="rounded-xl border border-border p-4">
    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
      {Icone && <Icone className="w-4 h-4 text-muted-foreground" aria-hidden />}
      {titulo}
    </h3>
    {children}
  </section>
);

// ---------------------------------------------------------------------------
// Confirmar pagamento: já registra a venda no Financeiro
// ---------------------------------------------------------------------------
const ConfirmarPagamento = ({
  pedido,
  desabilitado,
  onConfirmado,
}: {
  pedido: PedidoAdmin;
  desabilitado: boolean;
  onConfirmado: () => Promise<void>;
}) => {
  const preco = precoAtual(pedido.contrato_aceito_em ? new Date(pedido.contrato_aceito_em) : new Date());
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [valor, setValor] = useState(String(preco.pix));
  const [parcelas, setParcelas] = useState("1");
  const [enviando, setEnviando] = useState(false);

  const escolher = (f: FormaPagamento) => {
    setForma(f);
    setValor(String(f === "cartao" ? preco.cartao : preco.pix));
  };
  const numero = Number(valor.replace(",", "."));

  const confirmar = async () => {
    setEnviando(true);
    try {
      await criarLancamento({
        tipo: "site",
        pedido_id: pedido.id,
        projeto_id: null,
        cliente: pedido.negocio,
        descricao: `Site + Perfil do Google${preco.promo ? " (Black Friday)" : ""}`,
        valor: numero,
        forma,
        parcelas: forma === "cartao" ? Math.min(12, Math.max(1, Number(parcelas) || 1)) : 1,
        recebido_em: hojeISO(),
        competencia: null,
      });
      await onConfirmado();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <p className="text-xs text-muted-foreground">Quando o dinheiro cair, confirme aqui. A venda entra no Financeiro.</p>
      <div className="grid grid-cols-3 gap-2">
        {(["pix", "boleto", "cartao"] as FormaPagamento[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => escolher(f)}
            aria-pressed={forma === f}
            className={`rounded-lg border px-2 py-2 text-sm ${forma === f ? "border-primary bg-primary/15" : "border-border text-muted-foreground"}`}
          >
            {FORMA_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor={`${pedido.id}-valor`} className="text-xs text-muted-foreground">
            Valor recebido (R$)
          </Label>
          <Input id={`${pedido.id}-valor`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        {forma === "cartao" && (
          <div className="w-24 space-y-1">
            <Label htmlFor={`${pedido.id}-parc`} className="text-xs text-muted-foreground">
              Parcelas
            </Label>
            <Input id={`${pedido.id}-parc`} type="number" min={1} max={12} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
          </div>
        )}
      </div>
      <Button className="w-full rounded-xl" disabled={desabilitado || enviando || !(numero > 0)} onClick={confirmar}>
        {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Confirmar pagamento de {numero > 0 ? brl(numero) : "..."}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Entrega ao cliente: arquivos e instruções que ficam no link dele
// ---------------------------------------------------------------------------
const BlocoEntrega = ({ pedido, onAtualiza }: { pedido: PedidoAdmin; onAtualiza: (p: PedidoAdmin) => void }) => {
  const [instrucoes, setInstrucoes] = useState(pedido.entrega_instrucoes || "");
  const [ocupado, setOcupado] = useState(false);
  const entrega = pedido.entrega || [];

  useEffect(() => setInstrucoes(pedido.entrega_instrucoes || ""), [pedido.id, pedido.entrega_instrucoes]);

  const rodar = async (fn: () => Promise<void>) => {
    setOcupado(true);
    try {
      await fn();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const enviar = (arquivos: FileList | null) =>
    rodar(async () => {
      let lista = entrega;
      for (const a of Array.from(arquivos || [])) lista = await enviarArquivoEntrega(pedido.id, lista, a);
      onAtualiza({ ...pedido, entrega: lista });
      toast.success("Arquivo disponível no link do cliente.");
    });

  const remover = (a: ArquivoEntrega) =>
    rodar(async () => {
      onAtualiza({ ...pedido, entrega: await removerArquivoEntrega(pedido.id, entrega, a) });
    });

  const salvarInstrucoes = () =>
    rodar(async () => {
      onAtualiza(await atualizarPedido(pedido.id, { entrega_instrucoes: instrucoes.trim() || null }));
      toast.success("Instruções salvas no link do cliente.");
    });

  const mensagem = `Oi, ${pedido.nome.split(" ")[0]}! Deixamos tudo do seu site no seu link da Codifica: arquivos, instruções e notas fiscais. Fica guardado lá para você baixar quando quiser: ${linkPedido(pedido.codigo)}`;

  return (
    <Bloco titulo="Entrega ao cliente" icone={Package}>
      <p className="text-xs text-muted-foreground mb-3">
        Arquivos do site, guia de acesso ao domínio e ao Perfil do Google. Ficam no link do cliente para sempre. Não coloque
        senhas aqui: mande pelo WhatsApp.
      </p>
      {entrega.length > 0 && (
        <ul className="space-y-1 mb-3">
          {entrega.map((a) => (
            <li key={a.path} className="flex items-center justify-between gap-2 text-sm">
              <button
                className="text-primary hover:underline truncate text-left"
                onClick={() => baixarDocumento(a.path, a.nome).catch((e) => toast.error((e as Error).message))}
              >
                {a.nome}
              </button>
              <Button size="icon" variant="ghost" className="shrink-0" disabled={ocupado} aria-label={`Remover ${a.nome}`} onClick={() => remover(a)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm cursor-pointer hover:border-primary ${ocupado ? "opacity-60 pointer-events-none" : ""}`}>
        {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Enviar arquivos (ZIP, PDF, imagem · até 50 MB)
        <input type="file" multiple className="sr-only" onChange={(e) => enviar(e.target.files)} />
      </label>
      <Label htmlFor={`${pedido.id}-instr`} className="text-xs text-muted-foreground mt-3 block">
        Instruções para o cliente
      </Label>
      <Textarea
        id={`${pedido.id}-instr`}
        rows={3}
        className="mt-1"
        value={instrucoes}
        onChange={(e) => setInstrucoes(e.target.value)}
        placeholder="Ex.: o domínio foi transferido para o seu CPF no Registro.br. A hospedagem está na Hostinger em seu nome."
      />
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <Button size="sm" variant="outline" className="rounded-lg" disabled={ocupado || instrucoes === (pedido.entrega_instrucoes || "")} onClick={salvarInstrucoes}>
          Salvar instruções
        </Button>
        <Button size="sm" asChild className="rounded-lg">
          <a href={zap(pedido.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-1.5" /> Avisar no WhatsApp
          </a>
        </Button>
      </div>
    </Bloco>
  );
};

/**
 * Acesso ao Perfil do Google do cliente. A equipe pede pelo WhatsApp que ele convide a
 * ccodifica@gmail.com como Administrador (ou cria o Perfil, se ele não tiver) e confirma aqui.
 */
const BlocoPerfil = ({ pedido, onAtualiza }: { pedido: PedidoAdmin; onAtualiza: (p: PedidoAdmin) => void }) => {
  const [ocupado, setOcupado] = useState(false);
  const situacao = pedido.perfil_acesso === "confirmado" ? "confirmado" : null;
  const primeiro = (pedido.nome || "").split(" ")[0];
  const mensagem =
    `Oi, ${primeiro}! Pra gente cuidar do Perfil do Google do ${pedido.negocio}, precisamos que você adicione a Codifica como administradora. ` +
    `Leva 2 minutos: no seu Perfil, toque nos 3 pontinhos > Configurações do perfil > Pessoas e acesso > Adicionar, ` +
    `coloque ${EMAIL_PERFIL_CODIFICA} e escolha Administrador. Você continua sendo o dono. ` +
    `Se o seu negócio ainda não tem Perfil no Google, me avisa que a gente cria pra você.`;
  const textos: Record<string, string> = {
    confirmado: "A Codifica já administra o Perfil deste cliente.",
  };
  const marcar = async (valor: PedidoAdmin["perfil_acesso"]) => {
    setOcupado(true);
    try {
      onAtualiza(await atualizarPedido(pedido.id, { perfil_acesso: valor, perfil_acesso_em: valor ? new Date().toISOString() : null } as Partial<PedidoAdmin>));
      toast.success(valor === "confirmado" ? "Acesso ao Perfil confirmado." : "Atualizado.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setOcupado(false);
    }
  };
  return (
    <Bloco titulo="Perfil do Google" icone={Globe}>
      <p className="text-sm text-muted-foreground mb-3">
        {situacao
          ? textos[situacao]
          : `Peça pelo WhatsApp que o cliente adicione a ${EMAIL_PERFIL_CODIFICA} como Administrador do Perfil. Se ele não tiver Perfil, criem pela conta da Codifica e passem a propriedade para ele.`}
      </p>
      {situacao !== "confirmado" ? (
        <div className="space-y-2">
          <Button asChild className="w-full rounded-xl">
            <a href={zap(pedido.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" /> Pedir acesso no WhatsApp
            </a>
          </Button>
          <Button variant="outline" className="w-full rounded-xl" disabled={ocupado} onClick={() => marcar("confirmado")}>
            Acesso confirmado
          </Button>
        </div>
      ) : (
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground" disabled={ocupado} onClick={() => marcar(null)}>
          Desfazer
        </button>
      )}
    </Bloco>
  );
};

const Linha = ({ rotulo, children }: { rotulo: string; children: ReactNode }) => (
  <div className="flex gap-3 text-sm py-1">
    <span className="text-muted-foreground w-28 shrink-0">{rotulo}</span>
    <span className="text-foreground min-w-0 break-words">{children}</span>
  </div>
);

const comLink = (v: string) => {
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("@")) return `https://instagram.com/${v.slice(1)}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
};

const PainelPedido = ({
  pedido,
  etapas,
  onFechar,
  onAtualiza,
}: {
  pedido: PedidoAdmin | null;
  etapas: PedidoEvento[];
  onFechar: () => void;
  onAtualiza: (p: PedidoAdmin) => void;
}) => {
  const [campos, setCampos] = useState({ previa_url: "", pagamento_link: "", site_url: "", notas_admin: "" });
  const [salvando, setSalvando] = useState(false);
  const [motivo, setMotivo] = useState<MotivoPerda | "">("");
  const [motivoDetalhe, setMotivoDetalhe] = useState("");
  const [encerrando, setEncerrando] = useState(false);
  const [mudancaZap, setMudancaZap] = useState("");

  useEffect(() => {
    if (!pedido) return;
    setCampos({
      previa_url: pedido.previa_url || "",
      pagamento_link: pedido.pagamento_link || "",
      site_url: pedido.site_url || "",
      notas_admin: pedido.notas_admin || "",
    });
    setMotivo("");
    setMotivoDetalhe("");
    setEncerrando(false);
  }, [pedido?.id, pedido?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pedido) return null;
  const p = pedido;
  const historico = etapas.filter((e) => e.pedido_id === p.id);

  const salvar = async (extra: Partial<PedidoAdmin> = {}, aviso = "Salvo.") => {
    setSalvando(true);
    try {
      const limpos = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.trim() || null]));
      onAtualiza(await atualizarPedido(p.id, { ...limpos, ...extra }));
      toast.success(aviso);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const abrirArquivo = async (path: string) => {
    try {
      window.open(await urlArquivo(path), "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const CampoUrl = ({ k, rotulo, placeholder }: { k: "previa_url" | "pagamento_link" | "site_url"; rotulo: string; placeholder: string }) => (
    <div className="space-y-1">
      <Label htmlFor={`${p.id}-${k}`} className="text-xs text-muted-foreground">
        {rotulo}
      </Label>
      <Input
        id={`${p.id}-${k}`}
        placeholder={placeholder}
        value={campos[k]}
        onChange={(e) => setCampos((c) => ({ ...c, [k]: e.target.value }))}
      />
    </div>
  );

  // Ação principal da etapa
  const acao = (() => {
    switch (p.status) {
      case "recebido":
      case "mudanca_pedida":
        return (
          <div className="space-y-3">
            {p.status === "mudanca_pedida" && p.mudanca_texto && (
              <p className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm">
                <span className="font-medium">O cliente pediu:</span> {p.mudanca_texto}
              </p>
            )}
            {p.precisa_sistema === "sim" && (
              <p className="rounded-lg bg-primary/10 border border-primary/30 p-3 text-sm">
                Marcou que precisa de sistema. Combine uma conversa antes de fazer a prévia.
              </p>
            )}
            {CampoUrl({ k: "previa_url", rotulo: "Link da prévia", placeholder: "https://..." })}
            <Button
              className="w-full rounded-xl"
              disabled={salvando || !campos.previa_url.trim()}
              onClick={() => salvar({ status: "previa_pronta" }, "Prévia publicada no link do cliente.")}
            >
              Publicar prévia para o cliente
            </Button>
            <p className="text-xs text-muted-foreground pt-1">Mandou a prévia só pelo WhatsApp e o cliente aprovou por lá?</p>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={salvando}
              onClick={() =>
                salvar(
                  { status: "aprovado", previa_aprovada_em: new Date().toISOString(), previa_aprovada_por: "admin_whatsapp" },
                  "Aprovação registrada. O cliente aceita o contrato pelo link."
                )
              }
            >
              Aprovou pelo WhatsApp
            </Button>
          </div>
        );
      case "contrato_aceito":
        return (
          <div className="space-y-3">
            {CampoUrl({ k: "pagamento_link", rotulo: "Link de pagamento (aparece no link do cliente)", placeholder: "https://..." })}
            <div className="flex gap-2">
              <Button variant="outline" className="w-full rounded-xl" disabled={salvando} onClick={() => salvar({}, "Link de pagamento salvo.")}>
                Salvar link
              </Button>
            </div>
            <ConfirmarPagamento
              pedido={p}
              desabilitado={salvando}
              onConfirmado={() =>
                salvar(
                  { status: "pago", pagamento_status: "pago", pago_em: new Date().toISOString() },
                  "Pagamento confirmado e lançado no Financeiro."
                )
              }
            />
          </div>
        );
      case "pago":
        return (
          <div className="space-y-3">
            {CampoUrl({ k: "site_url", rotulo: "Endereço do site publicado", placeholder: "https://www.negocio.com.br" })}
            <Button
              className="w-full rounded-xl"
              disabled={salvando || !campos.site_url.trim()}
              onClick={() => salvar({ status: "no_ar" }, "Site marcado como no ar.")}
            >
              Marcar site no ar
            </Button>
          </div>
        );
      case "previa_pronta":
        return (
          <div className="space-y-3">
            <Button asChild className="w-full rounded-xl">
              <a href={zap(p.whatsapp, mensagemEtapa(p))} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" /> Mandar a prévia no WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Se o cliente responder pelo WhatsApp, registre aqui:</p>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={salvando}
              onClick={() =>
                salvar(
                  { status: "aprovado", previa_aprovada_em: new Date().toISOString(), previa_aprovada_por: "admin_whatsapp" },
                  "Aprovação registrada. O cliente aceita o contrato pelo link."
                )
              }
            >
              Aprovou pelo WhatsApp
            </Button>
            {p.mudancas_usadas < OFERTA.mudancasNaPrevia && (
              <div className="flex gap-2">
                <Input placeholder="O que ele pediu para mudar" value={mudancaZap} onChange={(ev) => setMudancaZap(ev.target.value)} />
                <Button
                  variant="outline"
                  className="shrink-0 rounded-xl"
                  disabled={salvando || !mudancaZap.trim()}
                  onClick={() =>
                    salvar(
                      { status: "mudanca_pedida", mudancas_usadas: p.mudancas_usadas + 1, mudanca_texto: mudancaZap.trim() },
                      "Pedido de mudança registrado."
                    )
                  }
                >
                  Pediu mudança
                </Button>
              </div>
            )}
          </div>
        );
      case "no_ar":
        return (
          <div className="space-y-3">
            {p.site_url && (
              <Button asChild variant="outline" className="w-full rounded-xl">
                <a href={p.site_url} target="_blank" rel="noopener noreferrer">
                  Abrir o site <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            )}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <span>
                Manutenção:{" "}
                {p.manutencao_status === "ativa" ? (
                  <span className="text-success font-medium">ativa</span>
                ) : (
                  <span className="text-muted-foreground">
                    cancelada{p.manutencao_cancelada_em && ` em ${new Date(p.manutencao_cancelada_em).toLocaleDateString("pt-BR")}`}
                    {p.manutencao_cancelada_por === "cliente_site" ? " pelo cliente no site" : " via WhatsApp"}
                  </span>
                )}
              </span>
              {p.manutencao_status === "ativa" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={salvando}
                  onClick={() =>
                    salvar(
                      { manutencao_status: "cancelada", manutencao_cancelada_em: new Date().toISOString(), manutencao_cancelada_por: "admin_whatsapp" },
                      "Cancelamento registrado. Coloque os arquivos em \"Entrega ao cliente\" e combine a transferência."
                    )
                  }
                >
                  Cancelou pelo WhatsApp
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={salvando}
                  onClick={() =>
                    salvar({ manutencao_status: "ativa", manutencao_cancelada_em: null, manutencao_cancelada_por: null }, "Manutenção reativada.")
                  }
                >
                  Reativar
                </Button>
              )}
            </div>
            {p.manutencao_motivo && <p className="text-xs text-muted-foreground">Motivo informado: "{p.manutencao_motivo}"</p>}
          </div>
        );
      case "cancelado":
        return (
          <p className="text-sm text-muted-foreground">
            {p.motivo_perda ? MOTIVO_PERDA_LABEL[p.motivo_perda] : "Sem motivo registrado"}
            {p.motivo_perda_detalhe && ` · "${p.motivo_perda_detalhe}"`}
          </p>
        );
      default:
        return (
          <Button asChild className="w-full rounded-xl">
            <a href={zap(p.whatsapp, mensagemEtapa(p))} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" /> Lembrar o cliente no WhatsApp
            </a>
          </Button>
        );
    }
  })();

  const e = ETAPA[p.status];

  return (
    <Sheet open={!!pedido} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0" data-clarity-mask="True">
        <div className="p-6 border-b border-border bg-card/50">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Pilula status={p.status} />
              <span className="text-xs text-muted-foreground">
                {ORIGEM_LABEL[p.origem]} · criado {tempo(diasDesde(p.created_at))}
              </span>
            </div>
            <SheetTitle className="text-2xl">{p.negocio}</SheetTitle>
            <SheetDescription>
              {p.nome} · {p.cidade}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" asChild className="rounded-lg">
              <a href={zap(p.whatsapp, mensagemEtapa(p))} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
              </a>
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => copiar(linkPedido(p.codigo), "Link pessoal copiado.")}>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar link
            </Button>
            <Button size="sm" variant="outline" asChild className="rounded-lg">
              <a href={linkPedido(p.codigo)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1.5" /> Ver como cliente
              </a>
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Próximo passo */}
          <section
            className={`rounded-xl p-4 border ${
              e.deQuem === "codifica" ? "border-primary/50 bg-primary/5" : "border-border bg-card/50"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {e.deQuem === "codifica" ? "Próximo passo · nossa vez" : e.deQuem === "cliente" ? "Esperando o cliente" : "Situação"}
            </p>
            <p className="font-semibold text-foreground mb-3">{e.proximo}</p>
            {acao}
          </section>

          <Bloco titulo="Contato" icone={Phone}>
            <Linha rotulo="WhatsApp">{p.whatsapp}</Linha>
            <Linha rotulo="E-mail">
              {p.email ? (
                <a href={`mailto:${p.email}`} className="text-primary hover:underline inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {p.email}
                </a>
              ) : (
                <span className="text-muted-foreground">não informado</span>
              )}
            </Linha>
          </Bloco>

          <Bloco titulo="Onde o negócio aparece" icone={Search}>
            {REDES_LISTA.filter((r) => p.redes?.[r.chave]).map((r) => {
              const v = String(p.redes[r.chave]);
              const url = comLink(v);
              return (
                <Linha key={r.chave} rotulo={r.rotulo}>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {v}
                    </a>
                  ) : (
                    v
                  )}
                </Linha>
              );
            })}
            {p.redes?.nenhuma && <p className="text-sm text-yellow-300">Não tem redes: pedir logo e fotos pelo WhatsApp.</p>}
            {p.site_atual && <Linha rotulo="Site atual">{p.site_atual}</Linha>}
            {p.referencia && <Linha rotulo="Referência">{p.referencia}</Linha>}
            <Linha rotulo="Sistema?">{{ sim: "Sim", nao: "Não", nao_sei: "Não sabe" }[p.precisa_sistema || ""] || "?"}</Linha>
            {Object.keys(p.utm || {}).length > 0 && (
              <Linha rotulo="Campanha">{Object.values(p.utm).join(" · ")}</Linha>
            )}
          </Bloco>

          {(p.previa_url || p.contrato_aceito_em || p.pagamento_link) && (
            <Bloco titulo="Prévia, contrato e pagamento" icone={FileText}>
              {p.previa_url && (
                <Linha rotulo="Prévia">
                  <a href={p.previa_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {p.previa_url}
                  </a>
                  {p.mudancas_usadas > 0 && <span className="text-muted-foreground"> · mudança usada</span>}
                </Linha>
              )}
              {p.contrato_aceito_em && (
                <Linha rotulo="Contrato">
                  Versão {p.contrato_versao}, aceito por {p.contrato_nome} ({p.contrato_documento}) em{" "}
                  {new Date(p.contrato_aceito_em).toLocaleString("pt-BR")}
                </Linha>
              )}
              {p.pagamento_link && (
                <Linha rotulo="Pagamento">
                  <a href={p.pagamento_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                    {p.pagamento_link}
                  </a>
                  {p.pago_em && <span className="text-success"> · pago em {new Date(p.pago_em).toLocaleDateString("pt-BR")}</span>}
                </Linha>
              )}
            </Bloco>
          )}

          {(p.status === "pago" || p.status === "no_ar") && <BlocoPerfil pedido={p} onAtualiza={onAtualiza} />}
          {(p.status === "pago" || p.status === "no_ar") && <BlocoEntrega pedido={p} onAtualiza={onAtualiza} />}

          {p.arquivos.length > 0 && (
            <Bloco titulo={`Arquivos do cliente (${p.arquivos.length})`} icone={Paperclip}>
              <ul className="space-y-1">
                {p.arquivos.map((a) => (
                  <li key={a.path}>
                    <button className="text-sm text-primary hover:underline inline-flex items-center gap-1" onClick={() => abrirArquivo(a.path)}>
                      {a.nome} <ExternalLink className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}

          <Bloco titulo="Histórico" icone={Clock}>
            <ol className="relative border-l border-border ml-1.5 space-y-3">
              {historico.map((h, i) => (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-sm text-foreground">{PEDIDO_STATUS_LABEL[h.para_status]}</p>
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                </li>
              ))}
              {historico.length === 0 && <li className="pl-4 text-sm text-muted-foreground">Sem registros ainda.</li>}
            </ol>
          </Bloco>

          <Bloco titulo="Notas internas" icone={FileText}>
            <Textarea
              rows={3}
              placeholder="Só a equipe vê. Ex.: preferiu cores azuis, ligar depois das 14h..."
              value={campos.notas_admin}
              onChange={(ev) => setCampos((c) => ({ ...c, notas_admin: ev.target.value }))}
            />
            <Button size="sm" variant="outline" className="mt-2 rounded-lg" disabled={salvando} onClick={() => salvar({}, "Notas salvas.")}>
              Salvar notas
            </Button>
          </Bloco>

          {p.status !== "cancelado" && p.status !== "no_ar" && (
            <section className="rounded-xl border border-border p-4">
              {!encerrando ? (
                <button
                  className="text-sm text-muted-foreground hover:text-destructive inline-flex items-center gap-2"
                  onClick={() => setEncerrando(true)}
                >
                  <XCircle className="w-4 h-4" /> Não fechou? Encerrar com o motivo
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Por que não fechou?</p>
                  <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoPerda)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(MOTIVO_PERDA_LABEL) as MotivoPerda[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {MOTIVO_PERDA_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="O que a pessoa disse (opcional)"
                    value={motivoDetalhe}
                    onChange={(ev) => setMotivoDetalhe(ev.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEncerrando(false)}>
                      Voltar
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={salvando || !motivo}
                      onClick={() =>
                        salvar(
                          { status: "cancelado", motivo_perda: motivo as MotivoPerda, motivo_perda_detalhe: motivoDetalhe.trim() || null },
                          "Pedido encerrado."
                        )
                      }
                    >
                      Encerrar pedido
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};


// ---------------------------------------------------------------------------
// Aba "Sites" do painel único (/painel-codifica)
// ---------------------------------------------------------------------------
const AbaSites = ({
  pedidos,
  etapas,
  onAtualiza,
}: {
  pedidos: PedidoAdmin[];
  etapas: PedidoEvento[];
  onAtualiza: (p: PedidoAdmin) => void;
}) => {
  const [filtro, setFiltro] = useState("negociacao");
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  const ultimaMudanca = (p: PedidoAdmin) =>
    etapas.filter((e) => e.pedido_id === p.id).at(-1)?.created_at || p.created_at;

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    FILTROS.forEach((f) => (c[f.id] = pedidos.filter(f.teste).length));
    return c;
  }, [pedidos]);

  const visiveis = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    const termo = busca.trim().toLowerCase();
    return pedidos
      .filter(f.teste)
      .filter((p) => !termo || [p.negocio, p.nome, p.cidade, p.email || "", p.whatsapp].some((v) => v.toLowerCase().includes(termo)))
      .sort((a, b) => {
        // nossa vez primeiro, depois quem está parado há mais tempo
        const peso = (p: PedidoAdmin) => (ETAPA[p.status].deQuem === "codifica" ? 0 : ETAPA[p.status].deQuem === "cliente" ? 1 : 2);
        return peso(a) - peso(b) || ultimaMudanca(a).localeCompare(ultimaMudanca(b));
      });
  }, [pedidos, filtro, busca, etapas]); // eslint-disable-line react-hooks/exhaustive-deps

  const selecionado = pedidos.find((p) => p.id === selecionadoId) || null;

  return (
    <>
      <Resumo pedidos={pedidos} filtro={filtro} onFiltrar={setFiltro} />

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filtro === f.id
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.rotulo}
              <span className="text-xs rounded-full bg-background/60 px-1.5">{contagem[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 xl:ml-auto">
          <div className="relative flex-1 xl:w-52 xl:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar negócio, nome, cidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar pedidos"
            />
          </div>
          <Button className="rounded-xl shrink-0" onClick={() => setNovoAberto(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Pré-cadastro
          </Button>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground mb-1">
            {pedidos.length === 0 ? "Nenhum pedido ainda" : "Nada por aqui com esse filtro"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {pedidos.length === 0
              ? "Os pedidos do formulário do site aparecem aqui sozinhos. Leads da Meta e da prospecção entram pelo pré-cadastro."
              : "Tente outro filtro ou limpe a busca."}
          </p>
          {pedidos.length === 0 && (
            <Button variant="outline" className="rounded-xl" onClick={() => setNovoAberto(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Criar pré-cadastro
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((p) => (
            <LinhaPedido key={p.id} p={p} dias={diasDesde(ultimaMudanca(p))} onAbrir={() => setSelecionadoId(p.id)} />
          ))}
        </ul>
      )}

      <NovoPreCadastro aberto={novoAberto} onAberto={setNovoAberto} onCriado={onAtualiza} />
      <PainelPedido pedido={selecionado} etapas={etapas} onFechar={() => setSelecionadoId(null)} onAtualiza={onAtualiza} />
    </>
  );
};

export default AbaSites;
