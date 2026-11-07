import { ChangeEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ClipboardList,
  CreditCard,
  Download,
  Eye,
  FileSignature,
  Hammer,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircle,
  Printer,
  Receipt,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTRATADA, brl, linkWhatsapp } from "@/config/oferta";
import { registrar } from "@/lib/metricas";
import { useAuth } from "@/contexts/AuthContext";
import { PedidoPublico, PedidoStatus, enviarArquivo } from "@/lib/pedidos";
import { DocumentosPedido, FORMA_LABEL, TIPO_LABEL, baixarDocumento, documentosDoPedido, nomeMes } from "@/lib/financeiro";

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------
export type EtapaId = "pedido" | "previa" | "contrato" | "pagamento" | "producao" | "no_ar";

export const ETAPAS: { id: EtapaId; rotulo: string; icone: typeof Eye; libera: string }[] = [
  { id: "pedido", rotulo: "Pedido", icone: ClipboardList, libera: "" },
  { id: "previa", rotulo: "Prévia", icone: Eye, libera: "Libera depois que você confirma o pedido." },
  { id: "contrato", rotulo: "Contrato", icone: FileSignature, libera: "Libera quando você aprova a prévia." },
  { id: "pagamento", rotulo: "Pagamento", icone: CreditCard, libera: "Libera quando você aceita o contrato." },
  { id: "producao", rotulo: "Produção", icone: Hammer, libera: "Libera quando o pagamento é confirmado." },
  { id: "no_ar", rotulo: "No ar", icone: Rocket, libera: "Libera quando o site é publicado." },
];

/** Em qual etapa o pedido está agora (índice em ETAPAS). */
export const etapaAtual = (s: PedidoStatus): number =>
  ({ pre_cadastro: 0, recebido: 1, previa_pronta: 1, mudanca_pedida: 1, aprovado: 2, contrato_aceito: 3, pago: 4, no_ar: 5, cancelado: 0 })[s];

/** Situação do pedido em uma linha: de quem é a vez. */
export const SITUACAO: Record<PedidoStatus, { texto: string; suaVez: boolean }> = {
  pre_cadastro: { texto: "Confira seus dados", suaVez: true },
  recebido: { texto: "Estamos montando a sua prévia", suaVez: false },
  previa_pronta: { texto: "Sua prévia está pronta", suaVez: true },
  mudanca_pedida: { texto: "Estamos ajustando a sua prévia", suaVez: false },
  aprovado: { texto: "Falta aceitar o contrato", suaVez: true },
  contrato_aceito: { texto: "Falta o pagamento", suaVez: true },
  pago: { texto: "Seu site está em produção", suaVez: false },
  no_ar: { texto: "Seu site está no ar", suaVez: false },
  cancelado: { texto: "Pedido encerrado", suaVez: false },
};

/** Data em que o pedido entrou em uma etapa (a última vez, pelo histórico). */
export const dataDaEtapa = (p: PedidoPublico, status: PedidoStatus) => {
  const h = (p.historico || []).filter((e) => e.status === status);
  return h.length ? h[h.length - 1].em : null;
};

export const dataBR = (iso: string | null | undefined, comHora = false) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", comHora ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

export const linkPessoal = (codigo: string) => `${window.location.origin}/pedido/${codigo}`;

/** Mensagem pronta para o WhatsApp da Codifica, sempre com o link do pedido (é assim que a equipe acha o cliente). */
export const mensagemPedido = (p: PedidoPublico, texto: string) =>
  `Oi! Sou ${p.nome.split(" ")[0]}, do ${p.negocio}. ${texto}\n\nMeu pedido: ${linkPessoal(p.codigo)}`;

export const mascararWhatsapp = (w: string) => {
  const d = w.replace(/\D/g, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 3)}••••-${d.slice(-4)}` : w;
};

/** Barra de etapas: concluídas e a atual são clicáveis; as futuras ficam travadas. */
export const BarraEtapas = ({ atual, vendo, concluido, onEscolher }: { atual: number; vendo: number; concluido: boolean; onEscolher: (i: number) => void }) => (
  <nav aria-label="Etapas do pedido" className="mb-8">
    <ol className="flex items-start">
      {ETAPAS.map((e, i) => {
        const feita = i < atual || (concluido && i === atual);
        const liberada = i <= atual;
        const selecionada = i === vendo;
        const Icone = feita ? Check : liberada ? e.icone : Lock;
        return (
          <li key={e.id} className="flex-1 flex flex-col items-center relative">
            {i > 0 && <span aria-hidden className={`absolute top-[18px] sm:top-6 right-1/2 w-full h-0.5 -z-0 ${i <= atual ? "bg-success/60" : "bg-border"}`} />}
            <button
              type="button"
              disabled={!liberada}
              onClick={() => onEscolher(i)}
              aria-current={selecionada ? "step" : undefined}
              title={liberada ? e.rotulo : e.libera}
              className={`relative z-10 w-9 h-9 sm:w-12 sm:h-12 rounded-full grid place-items-center border-2 transition-all ${
                selecionada ? "ring-4 ring-primary/25 scale-110" : ""
              } ${
                feita
                  ? "bg-success text-white border-success"
                  : i === atual
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_24px_rgba(139,61,245,0.6)]"
                    : "bg-card text-muted-foreground border-border cursor-not-allowed"
              } ${liberada ? "hover:scale-110" : ""}`}
            >
              <Icone className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
              <span className="sr-only">{e.rotulo}</span>
            </button>
            <span className={`mt-2 text-[10.5px] sm:text-sm font-medium text-center leading-tight ${selecionada ? "text-foreground" : liberada ? "text-muted-foreground" : "text-muted-foreground/50"}`}>{e.rotulo}</span>
          </li>
        );
      })}
    </ol>
  </nav>
);

/** Cabeçalho de cada etapa. */
export const CabecalhoEtapa = ({ numero, titulo, texto, selo }: { numero: number; titulo: ReactNode; texto?: ReactNode; selo?: ReactNode }) => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Etapa {numero} de 6</span>
      {selo}
    </div>
    <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">{titulo}</h2>
    {texto && <p className="text-muted-foreground text-base md:text-lg max-w-2xl">{texto}</p>}
  </div>
);

export const Selo = ({ tipo, children }: { tipo: "ok" | "sua-vez" | "nossa-vez"; children: ReactNode }) => (
  <span
    className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${
      tipo === "ok" ? "bg-success/15 text-success" : tipo === "sua-vez" ? "bg-primary/15 text-primary" : "bg-amber-400/15 text-amber-300"
    }`}
  >
    {tipo === "ok" && <Check className="w-3.5 h-3.5" aria-hidden />}
    {children}
  </span>
);

export const Bloco = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card/70 p-5 md:p-7 ${className}`}>{children}</div>
);

// ---------------------------------------------------------------------------
// Aviso no WhatsApp: é como a equipe fica sabendo de cada passo do cliente
// ---------------------------------------------------------------------------
export const AvisoWhatsapp = ({
  pedido,
  chave,
  titulo,
  texto,
  mensagem,
  rotulo = "Avisar no WhatsApp",
}: {
  pedido: PedidoPublico;
  chave: string;
  titulo: string;
  texto: ReactNode;
  mensagem: string;
  rotulo?: string;
}) => {
  const memoria = `codifica-aviso:${pedido.codigo}:${chave}`;
  const [enviado, setEnviado] = useState(false);
  useEffect(() => {
    try {
      setEnviado(localStorage.getItem(memoria) === "1");
    } catch {
      /* navegação privada: segue sem lembrar */
    }
  }, [memoria]);

  const marcar = () => {
    registrar("clique_whatsapp", `aviso_${chave}`);
    setEnviado(true);
    try {
      localStorage.setItem(memoria, "1");
    } catch {
      /* sem armazenamento local */
    }
  };

  return (
    <div className={`rounded-2xl border p-5 md:p-6 mb-6 ${enviado ? "border-success/40 bg-success/5" : "border-[#25D366]/50 bg-[#25D366]/[0.07] shadow-[0_0_40px_-12px_rgba(37,211,102,0.45)]"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${enviado ? "bg-success/20 text-success" : "bg-[#25D366] text-white"}`}>
          {enviado ? <Check className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-lg">{enviado ? "Mensagem enviada?" : titulo}</p>
          <p className="text-muted-foreground text-sm">
            {enviado ? "Se ainda não mandou, é só tocar de novo. A mensagem já vai com o link do seu pedido." : texto}
          </p>
        </div>
        <Button asChild size="lg" variant={enviado ? "outline" : "default"} className={`rounded-xl font-semibold shrink-0 ${enviado ? "" : "bg-[#25D366] hover:bg-[#1fbd5a] text-white"}`}>
          <a href={linkWhatsapp(mensagemPedido(pedido, mensagem))} target="_blank" rel="noopener noreferrer" onClick={marcar}>
            <MessageCircle className="w-5 h-5 mr-2" aria-hidden />
            {enviado ? "Enviar de novo" : rotulo}
          </a>
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Fotos e logo: o cliente manda o que tiver de melhor (as redes são o plano B)
// ---------------------------------------------------------------------------
export const EnvioArquivos = ({ pedido, onAtualiza, destaque = false }: { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void; destaque?: boolean }) => {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!arquivos.length) return;
    setErro("");
    setEnviando(true);
    try {
      let ultimo = pedido;
      for (const a of arquivos) ultimo = await enviarArquivo(pedido.codigo, a);
      onAtualiza(ultimo);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Bloco className={destaque ? "border-primary/40 bg-primary/[0.06]" : ""}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <ImagePlus className="w-5 h-5" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">Tem fotos boas? Manda pra gente</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Logo, fotos do espaço, da equipe ou do seu trabalho. Arquivos originais ficam com mais qualidade do que os das
            redes. Se não tiver, tudo bem: a gente usa o que você já publicou no Instagram e no Google.
          </p>
          <input ref={entrada} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" className="hidden" onChange={escolher} />
          <Button variant={destaque ? "default" : "outline"} className="rounded-xl" disabled={enviando} onClick={() => entrada.current?.click()}>
            {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
            {enviando ? "Enviando..." : "Escolher fotos e logo"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">PNG, JPG, WEBP, SVG ou PDF, até 10 MB cada.</p>
          {erro && (
            <p role="alert" className="text-destructive mt-3 text-sm">
              {erro}
            </p>
          )}
          {pedido.arquivos.length > 0 && (
            <ul className="mt-4 grid sm:grid-cols-2 gap-2">
              {pedido.arquivos.map((a, i) => (
                <li key={`${a.nome}-${i}`} className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2 min-w-0">
                  <Check className="w-4 h-4 text-success shrink-0" aria-hidden />
                  <span className="truncate">{a.nome}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Bloco>
  );
};

// ---------------------------------------------------------------------------
// Pagamentos, recibos, notas fiscais e arquivos de entrega
// ---------------------------------------------------------------------------
export const useDocumentos = (codigo: string, ativo: boolean) => {
  const [docs, setDocs] = useState<DocumentosPedido | null>(null);
  useEffect(() => {
    if (!ativo) return;
    documentosDoPedido(codigo).then(setDocs).catch(() => setDocs(null));
  }, [codigo, ativo]);
  return docs;
};

const useLiberaDownload = (email: string | null) => {
  const { user } = useAuth();
  return !!user && (user.role === "admin" || (!!email && user.email.toLowerCase() === email.toLowerCase()));
};

const EntrarParaBaixar = ({ codigo, email }: { codigo: string; email: string | null }) => (
  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <p className="text-sm">
      Para proteger seus dados, notas e arquivos abrem depois que você entra com o e-mail do seu pedido. Mandamos um código,
      sem senha.
    </p>
    <Button asChild size="sm" className="rounded-xl shrink-0">
      <Link to="/entrar" state={{ from: `/pedido/${codigo}` }}>
        Entrar para baixar
      </Link>
    </Button>
  </div>
);

type Pagamento = DocumentosPedido["pagamentos"][number];

const Recibo = ({ pedido, pagamento, onFechar }: { pedido: PedidoPublico; pagamento: Pagamento | null; onFechar: () => void }) => (
  <Dialog open={!!pagamento} onOpenChange={(v) => !v && onFechar()}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Recibo de pagamento</DialogTitle>
      </DialogHeader>
      {pagamento && (
        <div className="area-impressao space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-bold text-lg">
              <span className="text-primary">{"<>"}</span> Codifica
            </span>
            <span className="text-muted-foreground">Nº {pagamento.id.slice(0, 8).toUpperCase()}</span>
          </div>
          {[
            ["Cliente", pedido.contrato_nome || pedido.nome],
            ["Negócio", pedido.negocio],
            ["Referente a", pagamento.tipo === "manutencao" && pagamento.competencia ? `Manutenção de ${nomeMes(pagamento.competencia)}` : pagamento.descricao || TIPO_LABEL[pagamento.tipo]],
            ["Forma de pagamento", `${FORMA_LABEL[pagamento.forma]}${pagamento.parcelas > 1 ? ` em ${pagamento.parcelas}x` : ""}`],
            ["Data", new Date(`${pagamento.recebido_em}T12:00:00`).toLocaleDateString("pt-BR")],
          ].map(([r, v]) => (
            <div key={r} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{r}</span>
              <span className="text-right font-medium">{v}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
            <span className="font-semibold">Valor recebido</span>
            <span className="font-bold">{brl(pagamento.valor)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recebemos o valor acima. Este recibo não substitui a nota fiscal{CONTRATADA.cnpj ? `. Codifica · CNPJ ${CONTRATADA.cnpj}` : ""}.
          </p>
        </div>
      )}
      <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
        <Printer className="w-4 h-4 mr-2" /> Imprimir ou salvar em PDF
      </Button>
    </DialogContent>
  </Dialog>
);

export const ListaPagamentos = ({ pedido, docs }: { pedido: PedidoPublico; docs: DocumentosPedido | null }) => {
  const podeBaixar = useLiberaDownload(pedido.email || null);
  const [recibo, setRecibo] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState("");
  if (!docs) return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
  if (!docs.pagamentos.length)
    return <p className="text-sm text-muted-foreground">O comprovante e a nota fiscal aparecem aqui assim que registrarmos o pagamento.</p>;
  const baixar = (path: string) => baixarDocumento(path).catch(() => setErro("Não conseguimos abrir a nota agora. Tente de novo em instantes."));
  return (
    <>
      {!podeBaixar && docs.pagamentos.some((p) => p.nota_path) && <EntrarParaBaixar codigo={pedido.codigo} email={pedido.email || null} />}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {docs.pagamentos.map((l) => (
          <li key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {l.tipo === "manutencao" && l.competencia ? `Manutenção de ${nomeMes(l.competencia)}` : l.descricao || TIPO_LABEL[l.tipo]}
              </p>
              <p className="text-xs text-muted-foreground">
                {brl(l.valor)} · {FORMA_LABEL[l.forma]}
                {l.parcelas > 1 && ` em ${l.parcelas}x`} · {new Date(`${l.recebido_em}T12:00:00`).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setRecibo(l)}>
                <Receipt className="w-4 h-4 mr-1.5" aria-hidden /> Recibo
              </Button>
              {l.nota_path ? (
                <Button size="sm" variant="outline" className="rounded-lg" disabled={!podeBaixar} onClick={() => baixar(l.nota_path!)}>
                  <Download className="w-4 h-4 mr-1.5" aria-hidden /> Nota fiscal
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground self-center">Nota em emissão</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {erro && <p className="text-destructive text-sm mt-2">{erro}</p>}
      <Recibo pedido={pedido} pagamento={recibo} onFechar={() => setRecibo(null)} />
    </>
  );
};

export const ArquivosEntrega = ({ pedido, docs }: { pedido: PedidoPublico; docs: DocumentosPedido | null }) => {
  const podeBaixar = useLiberaDownload(pedido.email || null);
  if (!docs || (!docs.entrega.length && !docs.entrega_instrucoes)) return null;
  return (
    <Bloco>
      <h3 className="text-lg font-semibold mb-1">Arquivos do seu site</h3>
      <p className="text-muted-foreground text-sm mb-4">Ficam guardados aqui. Baixe quando precisar.</p>
      {!podeBaixar && docs.entrega.length > 0 && <EntrarParaBaixar codigo={pedido.codigo} email={pedido.email || null} />}
      {docs.entrega_instrucoes && <p className="text-sm text-muted-foreground whitespace-pre-line rounded-xl border border-border p-3 mb-3">{docs.entrega_instrucoes}</p>}
      <ul className="space-y-2">
        {docs.entrega.map((a) => (
          <li key={a.path}>
            <button
              onClick={() => baixarDocumento(a.path, a.nome).catch(() => undefined)}
              disabled={!podeBaixar}
              className="w-full flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-primary transition-colors text-left disabled:opacity-60"
            >
              <span className="truncate">{a.nome}</span>
              <Download className="w-4 h-4 text-primary shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </Bloco>
  );
};
