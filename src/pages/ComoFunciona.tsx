import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, FileText, Gauge, ListOrdered, Maximize, Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaginaOferta, Secao, ListaCheck, Cartao, BotaoWhatsapp } from "@/components/oferta/Base";
import { registrar } from "@/lib/metricas";
import {
  ETAPAS_PROCESSO,
  INCLUI_IMPLANTACAO,
  INCLUI_MENSALIDADE,
  NAO_INCLUI,
  PERGUNTAS,
  VIDEO_COMO_FUNCIONA,
  SEM_MANUTENCAO,
  OFERTA,
  brl,
} from "@/config/oferta";

const QUEM = { voce: "Você", codifica: "Codifica", juntos: "Juntos" } as const;

const mmss = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

/**
 * Player no estilo das plataformas de streaming: capa com título e "Assistir";
 * tocando, controles próprios que somem quando o mouse para. O arquivo só baixa
 * no clique, e play/fim viram eventos do funil.
 */
const VideoComoFunciona = () => {
  const caixa = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const esconder = useRef<number>();
  const [iniciado, setIniciado] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [mudo, setMudo] = useState(false);
  const [volume, setVolume] = useState(1);
  const [velocidade, setVelocidade] = useState(1);
  const [menuVelocidade, setMenuVelocidade] = useState(false);
  const [controles, setControles] = useState(true);
  const VELOCIDADES = [0.75, 1, 1.25, 1.5, 2];

  const mudarVolume = (v: number) => {
    const el = ref.current;
    setVolume(v);
    setMudo(v === 0);
    if (el) {
      el.volume = v;
      el.muted = v === 0;
    }
  };
  const mudarVelocidade = (v: number) => {
    setVelocidade(v);
    setMenuVelocidade(false);
    if (ref.current) ref.current.playbackRate = v;
  };

  const mostrarControles = () => {
    setControles(true);
    window.clearTimeout(esconder.current);
    esconder.current = window.setTimeout(() => setControles(false), 2500);
  };
  useEffect(() => () => window.clearTimeout(esconder.current), []);

  const assistir = () => {
    setIniciado(true);
    requestAnimationFrame(() => ref.current?.play().catch(() => undefined));
    mostrarControles();
  };
  const alternar = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
    mostrarControles();
  };
  const pular = (s: number) => {
    const v = ref.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + s), v.duration || 0);
    mostrarControles();
  };
  const telaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else caixa.current?.requestFullscreen?.().catch(() => undefined);
  };
  const buscar = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const v = ref.current;
    if (v && duracao) v.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duracao;
  };

  const visiveis = !tocando || controles || menuVelocidade;
  const progresso = duracao ? (tempo / duracao) * 100 : 0;
  const BotaoIcone = ({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo} className="p-1.5 md:p-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-colors">
      {children}
    </button>
  );

  return (
    <div
      ref={caixa}
      className={`group/player relative mx-auto max-w-4xl aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_40px_90px_-35px_rgba(139,61,245,0.55)] ${iniciado && !visiveis ? "cursor-none" : ""}`}
      onPointerMove={iniciado ? mostrarControles : undefined}
      onKeyDown={(e) => {
        if (!iniciado) return;
        if (e.key === " " || e.key === "k") {
          e.preventDefault();
          alternar();
        }
        if (e.key === "ArrowRight") pular(10);
        if (e.key === "ArrowLeft") pular(-10);
      }}
    >
      <video
        ref={ref}
        src={iniciado ? VIDEO_COMO_FUNCIONA.src : undefined}
        poster={VIDEO_COMO_FUNCIONA.capa}
        playsInline
        preload="none"
        muted={mudo}
        className="absolute inset-0 w-full h-full object-cover"
        onClick={iniciado ? alternar : undefined}
        onPlay={() => (setTocando(true), registrar("video_play", "como_funciona", true))}
        onPause={() => (setTocando(false), setControles(true))}
        onEnded={() => (setTocando(false), setControles(true), registrar("video_fim", "como_funciona", true))}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuracao(e.currentTarget.duration);
          e.currentTarget.playbackRate = velocidade;
          e.currentTarget.volume = volume;
        }}
        aria-label="Vídeo: como funciona fazer o seu site com a Codifica"
      />

      {/* Capa: título, informações e botões, como nas plataformas de streaming */}
      {!iniciado && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/35 to-black/10 p-4 sm:p-8">
          <h2 className="text-xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">Como funciona</h2>
          <p className="hidden sm:block text-sm text-white/75 max-w-md mb-1">Do primeiro oi até o site no ar: prévia grátis, contrato, pagamento e o seu site pronto.</p>
          <p className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-5">
            {VIDEO_COMO_FUNCIONA.duracao} min · <span className="rounded border border-white/40 px-1 text-[10px] font-semibold text-white/80">CC</span> Com legendas
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={assistir}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 sm:px-7 py-2 sm:py-2.5 text-sm sm:text-base font-bold text-black hover:bg-white/85 transition-colors"
            >
              <Play className="w-5 h-5" fill="currentColor" aria-hidden /> Assistir
            </button>
            <a
              href="#passo-a-passo"
              className="hidden sm:inline-flex items-center gap-2 rounded-md bg-white/20 px-5 py-2.5 text-base font-semibold text-white backdrop-blur hover:bg-white/30 transition-colors"
            >
              <ListOrdered className="w-5 h-5" aria-hidden /> Ver o passo a passo
            </a>
          </div>
        </div>
      )}

      {/* Controles durante o vídeo */}
      {iniciado && (
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${visiveis ? "opacity-100" : "opacity-0"}`}>
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 sm:px-6 pt-3 pb-10">
            <p className="text-sm sm:text-base font-semibold text-white">Como funciona</p>
          </div>
          {!tocando && (
            <button
              type="button"
              onClick={alternar}
              aria-label="Continuar"
              className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/55 ring-2 ring-white/70 text-white grid place-items-center hover:scale-105 transition-transform"
            >
              <Play className="w-8 h-8 ml-1" fill="currentColor" aria-hidden />
            </button>
          )}
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 sm:px-5 pt-10 pb-2 sm:pb-3">
            <div
              role="slider"
              aria-label="Posição do vídeo"
              aria-valuemin={0}
              aria-valuemax={Math.round(duracao)}
              aria-valuenow={Math.round(tempo)}
              aria-valuetext={`${mmss(tempo)} de ${mmss(duracao)}`}
              tabIndex={0}
              className="group/barra relative h-4 flex items-center cursor-pointer"
              onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), buscar(e))}
              onPointerMove={(e) => e.buttons === 1 && buscar(e)}
            >
              <div className="relative w-full h-1 group-hover/barra:h-1.5 rounded-full bg-white/30 transition-all">
                <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progresso}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary scale-0 group-hover/barra:scale-100 transition-transform" style={{ left: `${progresso}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
              <BotaoIcone rotulo={tocando ? "Pausar" : "Tocar"} onClick={alternar}>
                {tocando ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />}
              </BotaoIcone>
              <BotaoIcone rotulo="Voltar 10 segundos" onClick={() => pular(-10)}>
                <RotateCcw className="w-5 h-5" />
              </BotaoIcone>
              <BotaoIcone rotulo="Avançar 10 segundos" onClick={() => pular(10)}>
                <RotateCw className="w-5 h-5" />
              </BotaoIcone>
              {/* Volume: botão de mudo + barra que abre ao passar o mouse */}
              <div className="group/volume flex items-center">
                <BotaoIcone rotulo={mudo ? "Ativar som" : "Tirar o som"} onClick={() => mudarVolume(mudo ? volume || 1 : 0)}>
                  {mudo || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </BotaoIcone>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={mudo ? 0 : volume}
                  onChange={(e) => mudarVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="hidden sm:block w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 focus:w-20 focus:opacity-100 transition-all accent-[hsl(var(--primary))] cursor-pointer"
                />
              </div>
              <span className="ml-1 text-xs sm:text-sm tabular-nums text-white/85">
                {mmss(tempo)} / {mmss(Math.round(duracao))}
              </span>
              <span className="flex-1" />
              {/* Velocidade */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuVelocidade((m) => !m)}
                  aria-label="Velocidade do vídeo"
                  aria-expanded={menuVelocidade}
                  className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs sm:text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Gauge className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden /> {String(velocidade).replace(".", ",")}x
                </button>
                {menuVelocidade && (
                  <div role="menu" className="absolute bottom-full right-0 mb-2 w-32 rounded-lg bg-black/90 ring-1 ring-white/15 p-1 shadow-xl">
                    <p className="px-3 pt-1.5 pb-1 text-[11px] uppercase tracking-wider text-white/50">Velocidade</p>
                    {VELOCIDADES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="menuitemradio"
                        aria-checked={velocidade === v}
                        onClick={() => mudarVelocidade(v)}
                        className={`w-full flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-left hover:bg-white/10 ${velocidade === v ? "text-white font-semibold" : "text-white/75"}`}
                      >
                        {v === 1 ? "Normal" : `${String(v).replace(".", ",")}x`}
                        {velocidade === v && <Check className="w-4 h-4 text-primary" aria-hidden />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <BotaoIcone rotulo="Tela cheia" onClick={telaCheia}>
                <Maximize className="w-5 h-5" />
              </BotaoIcone>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ComoFunciona = () => (
  <PaginaOferta evento="visita_como_funciona">
    <Secao className="pt-6 md:pt-10">
      <p className="text-primary font-semibold mb-4">Do primeiro contato até a manutenção</p>
      <h1 className="hero-text text-4xl sm:text-5xl md:text-6xl leading-tight mb-6 max-w-3xl">Como funciona</h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
        Tudo o que acontece, quem faz cada parte e o que está ou não incluído. Se ficar alguma dúvida, é só chamar no
        WhatsApp.
      </p>
    </Secao>

    {VIDEO_COMO_FUNCIONA.src && (
      <Secao className="pt-0">
        <VideoComoFunciona />
      </Secao>
    )}

    <Secao titulo="Passo a passo" id="passo-a-passo">
      <ol className="relative border-l border-border ml-3 space-y-8">
        {ETAPAS_PROCESSO.map((etapa, i) => (
          <li key={etapa.titulo} className="pl-8 relative">
            <span className="absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {i + 1}
            </span>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg md:text-xl font-semibold text-foreground">{etapa.titulo}</h3>
              <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                {QUEM[etapa.quem]}
              </span>
            </div>
            <p className="text-muted-foreground max-w-2xl">{etapa.texto}</p>
          </li>
        ))}
      </ol>
    </Secao>

    <Secao titulo="Sobre o prazo do Perfil do Google" id="perfil-google">
      <Cartao className="border-primary/40">
        <p className="text-foreground/90 mb-5 max-w-3xl">
          O site fica pronto em até 1 semana. O Perfil do Google a gente configura nessa mesma semana, mas quem decide
          quando ele aparece é o Google. Funciona assim:
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <p className="font-semibold mb-1">Já tem Perfil verificado</p>
            <p className="text-sm text-muted-foreground">
              Você nos dá acesso de administrador e a gente completa tudo. As mudanças costumam aparecer em poucos dias.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <p className="font-semibold mb-1">Ainda não tem Perfil</p>
            <p className="text-sm text-muted-foreground">
              A gente cria o Perfil completo e envia para o Google verificar. A verificação costuma levar de alguns dias a 2
              semanas e pode pedir um vídeo do local ou um código. A gente te guia em cada passo.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Esse prazo é do Google, não nosso, e está no contrato. Enquanto o Perfil é verificado, o seu site já está no ar e
          recebendo contatos.
        </p>
      </Cartao>
    </Secao>

    <Secao titulo="O que fazemos e o que não fazemos">
      <div className="grid md:grid-cols-3 gap-6">
        <Cartao>
          <h3 className="text-lg font-semibold mb-4">Na implantação</h3>
          <ListaCheck itens={INCLUI_IMPLANTACAO} />
        </Cartao>
        <Cartao>
          <h3 className="text-lg font-semibold mb-1">Manutenção (opcional)</h3>
          <p className="text-sm text-muted-foreground mb-4">1º mês incluso, depois {brl(OFERTA.mensalidade)}/mês se quiser continuar</p>
          <ListaCheck itens={INCLUI_MENSALIDADE} />
        </Cartao>
        <Cartao>
          <h3 className="text-lg font-semibold mb-4">Não inclui</h3>
          <ListaCheck itens={NAO_INCLUI} negativo />
        </Cartao>
      </div>
      <p className="text-xs text-muted-foreground mt-4 max-w-3xl">{SEM_MANUTENCAO}</p>
    </Secao>

    <Secao titulo="Precisa de um sistema?">
      <Cartao>
        <p className="text-foreground/90 mb-6 max-w-2xl">
          Agenda online, pagamento pelo site, área do cliente ou qualquer coisa sob medida é um sistema, não um site
          simples. Nesse caso, marcamos uma conversa para entender o que você precisa antes de passar um valor. O
          sistema funciona no computador e no celular, e pode ser instalado na tela inicial como um app.
        </p>
        <BotaoWhatsapp
          variante="default"
          mensagem="Oi! Preciso de um sistema (agenda, pagamento ou área do cliente) e queria marcar uma conversa com a Codifica."
        >
          Marcar uma conversa
        </BotaoWhatsapp>
      </Cartao>
    </Secao>

    <Secao titulo="Perguntas frequentes">
      <Accordion type="single" collapsible className="w-full">
        {PERGUNTAS.map(({ p, r }) => (
          <AccordionItem key={p} value={p}>
            <AccordionTrigger className="text-left text-base md:text-lg">{p}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">{r}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Secao>

    <Secao>
      <Cartao className="flex flex-col md:flex-row md:items-center gap-6 justify-between border-primary/40">
        <div>
          <h2 className="text-2xl font-bold mb-2">Pronto para ver a sua prévia?</h2>
          <p className="text-muted-foreground">Sem compromisso. Você só paga se aprovar.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link to="/comecar" onClick={() => registrar("clique_comecar")}>
              Quero minha prévia grátis
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl">
            <Link to="/contrato">
              <FileText className="w-4 h-4 mr-2" aria-hidden />
              Ler o contrato
            </Link>
          </Button>
        </div>
      </Cartao>
    </Secao>
  </PaginaOferta>
);

export default ComoFunciona;
