import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Lock, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginaOferta, Secao, BotaoWhatsapp } from "@/components/oferta/Base";
import { linkWhatsapp } from "@/config/oferta";
import { registrar } from "@/lib/metricas";
import { PedidoPublico, verPedido } from "@/lib/pedidos";
import { BarraEtapas, ETAPAS, SITUACAO, etapaAtual, linkPessoal, mensagemPedido } from "@/components/pedido/Comuns";
import { PainelContrato, PainelNoAr, PainelPagamento, PainelPedido, PainelPrevia, PainelProducao } from "@/components/pedido/Paineis";

const PAINEIS = [PainelPedido, PainelPrevia, PainelContrato, PainelPagamento, PainelProducao, PainelNoAr];

/** Coluna lateral: ajuda no WhatsApp, o link pessoal e como voltar depois. */
const Lateral = ({ pedido }: { pedido: PedidoPublico }) => {
  const [copiado, setCopiado] = useState(false);
  const copiar = () =>
    navigator.clipboard.writeText(linkPessoal(pedido.codigo)).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  return (
    <aside className="space-y-4 lg:sticky lg:top-28">
      <div className="rounded-2xl border border-[#25D366]/40 bg-[#25D366]/[0.06] p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-[#25D366] text-white grid place-items-center">
            <MessageCircle className="w-5 h-5" aria-hidden />
          </span>
          <p className="font-semibold text-foreground">Fale direto com a gente</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Quem responde é quem faz o seu site. A mensagem já vai com o link do pedido.</p>
        <Button asChild className="w-full rounded-xl bg-[#25D366] hover:bg-[#1fbd5a] text-white font-semibold">
          <a href={linkWhatsapp(mensagemPedido(pedido, "Tenho uma dúvida sobre o meu pedido."))} target="_blank" rel="noopener noreferrer" onClick={() => registrar("clique_whatsapp", "pedido_lateral")}>
            Falar no WhatsApp
          </a>
        </Button>
      </div>
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="font-semibold text-foreground mb-1">Seu link pessoal</p>
        <p className="text-sm text-muted-foreground mb-3">Tudo do seu site fica aqui: prévia, contrato, pagamentos, notas e arquivos. Guarde este link.</p>
        <Button variant="outline" className="w-full rounded-xl" onClick={copiar}>
          {copiado ? <Check className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />}
          {copiado ? "Link copiado" : "Copiar link"}
        </Button>
        {pedido.email && (
          <p className="text-xs text-muted-foreground mt-3 flex gap-2">
            <Mail className="w-4 h-4 shrink-0" aria-hidden />
            <span>
              Ou entre pela <strong>Área do cliente</strong> com o e-mail do seu pedido. Mandamos um código, sem senha.
            </span>
          </p>
        )}
      </div>
    </aside>
  );
};

const Pedido = () => {
  const { codigo = "" } = useParams();
  const [pedido, setPedido] = useState<PedidoPublico | null>(null);
  const [estado, setEstado] = useState<"carregando" | "ok" | "nao_encontrado" | "erro">("carregando");
  const [vendo, setVendo] = useState(0);

  const carregar = useCallback(async () => {
    try {
      const p = await verPedido(codigo);
      setPedido(p);
      if (p) registrar("pedido_aberto", p.status, true);
      setEstado(p ? "ok" : "nao_encontrado");
    } catch {
      setEstado("erro");
    }
  }, [codigo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Sempre que o pedido muda de etapa, mostra a etapa atual (e sobe até ela, se não for a primeira carga)
  const status = pedido?.status;
  const statusAnterior = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!status) return;
    setVendo(etapaAtual(status));
    if (statusAnterior.current && statusAnterior.current !== status) {
      requestAnimationFrame(() => document.getElementById("topo-pedido")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
    statusAnterior.current = status;
  }, [status]);

  // Link pessoal: não deve ser indexado
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const escolher = (i: number) => {
    setVendo(i);
    document.getElementById("painel-etapa")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (estado === "carregando") {
    return (
      <PaginaOferta>
        <Secao className="max-w-3xl flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Carregando" />
        </Secao>
      </PaginaOferta>
    );
  }

  if (estado !== "ok" || !pedido) {
    return (
      <PaginaOferta>
        <Secao className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-3">{estado === "erro" ? "Não conseguimos carregar agora" : "Link não encontrado"}</h1>
          <p className="text-muted-foreground mb-6">{estado === "erro" ? "Tente de novo em instantes." : "Confira se o link está completo, ou fale com a gente pelo WhatsApp."}</p>
          <div className="flex gap-3">
            {estado === "erro" && (
              <Button className="rounded-xl" onClick={carregar}>
                Tentar de novo
              </Button>
            )}
            <BotaoWhatsapp mensagem="Oi! Estou com problema para abrir o link do meu pedido na Codifica." />
          </div>
        </Secao>
      </PaginaOferta>
    );
  }

  if (pedido.status === "cancelado") {
    return (
      <PaginaOferta>
        <Secao className="max-w-3xl">
          <p className="text-primary font-semibold mb-1">{pedido.negocio}</p>
          <h1 className="text-3xl font-bold mb-3">Pedido encerrado</h1>
          <p className="text-muted-foreground mb-6">Se quiser retomar, é só chamar a gente.</p>
          <BotaoWhatsapp mensagem={mensagemPedido(pedido, "Queria retomar o meu pedido.")} />
        </Secao>
      </PaginaOferta>
    );
  }

  const atual = etapaAtual(pedido.status);
  const concluido = pedido.status === "no_ar";
  const situacao = SITUACAO[pedido.status];
  const Painel = PAINEIS[vendo];
  const anterior = vendo > 0 ? vendo - 1 : null;
  const proxima = vendo < ETAPAS.length - 1 ? vendo + 1 : null;
  const proximaLiberada = proxima !== null && proxima <= atual;

  return (
    <PaginaOferta>
      <Secao className="max-w-6xl pt-6">
        <div data-clarity-mask="True">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-primary font-semibold mb-1">{pedido.negocio}</p>
              <h1 className="text-3xl md:text-4xl font-bold">Olá, {pedido.nome.split(" ")[0]}!</h1>
            </div>
            <div className={`inline-flex items-center gap-3 self-start md:self-auto rounded-2xl border px-4 py-3 ${situacao.suaVez ? "border-primary/50 bg-primary/10" : "border-border bg-card/70"}`}>
              <span className={`relative flex w-3 h-3`} aria-hidden>
                {situacao.suaVez && <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />}
                <span className={`relative inline-flex w-3 h-3 rounded-full ${concluido ? "bg-success" : situacao.suaVez ? "bg-primary" : "bg-amber-300"}`} />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{concluido ? "Tudo pronto" : situacao.suaVez ? "Sua vez" : "Nossa vez"}</p>
                <p className="font-semibold text-foreground">{situacao.texto}</p>
              </div>
            </div>
          </div>

          <div id="topo-pedido" className="scroll-mt-28" />
          <BarraEtapas atual={atual} vendo={vendo} concluido={concluido} onEscolher={escolher} />

          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
            <div id="painel-etapa" className="scroll-mt-28 min-w-0">
              {vendo !== atual && (
                <button onClick={() => escolher(atual)} className="mb-5 inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ArrowRight className="w-4 h-4" aria-hidden /> Ir para a etapa atual: {ETAPAS[atual].rotulo}
                </button>
              )}
              <div key={vendo} className="animate-[pagina-entra_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
                <Painel pedido={pedido} onAtualiza={setPedido} atual={vendo === atual} />
              </div>

              {/* Navegação entre etapas */}
              <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-border">
                {anterior !== null ? (
                  <Button variant="ghost" className="rounded-xl" onClick={() => escolher(anterior)}>
                    <ArrowLeft className="w-4 h-4 mr-2" aria-hidden /> {ETAPAS[anterior].rotulo}
                  </Button>
                ) : (
                  <span />
                )}
                {proxima !== null &&
                  (proximaLiberada ? (
                    <Button variant="outline" className="rounded-xl" onClick={() => escolher(proxima)}>
                      {ETAPAS[proxima].rotulo} <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
                    </Button>
                  ) : (
                    <span className="inline-flex min-w-0 max-w-[65%] items-center gap-2 text-sm text-muted-foreground text-right">
                      <Lock className="w-4 h-4 shrink-0" aria-hidden /> {ETAPAS[proxima].libera}
                    </span>
                  ))}
              </div>
            </div>
            <Lateral pedido={pedido} />
          </div>
        </div>
      </Secao>
    </PaginaOferta>
  );
};

export default Pedido;
