import { Link } from "react-router-dom";
import { ArrowRight, Search, Smartphone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginaOferta, Secao, ListaCheck, Cartao, BotaoWhatsapp, SeloBlackFriday } from "@/components/oferta/Base";
import Equipe from "@/components/oferta/Equipe";
import { registrar } from "@/lib/metricas";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  OFERTA,
  INCLUI_IMPLANTACAO,
  INCLUI_MENSALIDADE,
  NAO_INCLUI,
  PERGUNTAS,
  LINHA_RISCO,
  PRAZO_PREVIA,
  CARTAO,
  brl,
  precoAtual,
} from "@/config/oferta";

const P = precoAtual();

// As 4 dúvidas que mais travam a decisão; o resto fica em /como-funciona
const PERGUNTAS_LANDING = [0, 1, 2, 3].map((i) => PERGUNTAS[i]);
import ProjetosFeitos from "@/components/oferta/ProjetosFeitos";
import VitrineHero from "@/components/oferta/VitrineHero";

const PROBLEMAS = [
  { icone: Search, texto: "Procuram o seu serviço no Google e encontram o concorrente." },
  { icone: Star, texto: "Seu perfil no Maps está sem fotos, sem horário ou com avaliações sem resposta." },
  { icone: Smartphone, texto: "Quem acha você no Instagram não tem um link simples para ver tudo e chamar no WhatsApp." },
];

const PresencaGoogle = () => (
  <PaginaOferta evento="visita_oferta">
    {/* Topo */}
    <Secao className="pt-6 md:pt-10 max-w-6xl">
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-8 items-center">
      <div>
      {P.promo && (
        <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-400/60 bg-amber-400/10 pl-1.5 pr-4 py-1.5 text-sm mb-5 shadow-[0_0_24px_rgba(251,191,36,0.15)]">
          <SeloBlackFriday />
          <span className="text-amber-100">
            Site + Perfil do Google por <strong className="text-amber-300">{brl(P.pix)} no Pix</strong> até {P.ate}
          </span>
        </p>
      )}
      <p className="text-primary font-semibold mb-4">Site + Perfil do Google para negócios locais</p>
      <h1 className="hero-text text-4xl sm:text-5xl md:text-6xl leading-tight mb-6 max-w-3xl">
        Quando procuram seu serviço no Google, encontram você?
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
        A Codifica monta o seu site, completa o seu Perfil do Google e cuida dos dois todo mês. Você vê uma prévia antes
        de pagar qualquer coisa.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link to="/comecar" onClick={() => registrar("clique_comecar")}>
            Quero ver a prévia do meu site
            <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl">
          <Link to="/como-funciona">Como funciona</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-4 max-w-xl">{LINHA_RISCO}</p>
      </div>
      <div>
        <VitrineHero />
      </div>
      </div>
    </Secao>

    {/* Problema */}
    <Secao titulo="Isso acontece com o seu negócio?">
      <div className="grid md:grid-cols-3 gap-4">
        {PROBLEMAS.map(({ icone: Icone, texto }) => (
          <Cartao key={texto} className="p-5 md:p-6">
            <Icone className="w-6 h-6 text-primary mb-3" aria-hidden />
            <p className="text-foreground/90">{texto}</p>
          </Cartao>
        ))}
      </div>
    </Secao>

    {/* Preço */}
    <Secao titulo="Quanto custa" subtitulo="Preço fechado, sem surpresa. Você só paga depois de aprovar a prévia.">
      <div className="grid md:grid-cols-2 gap-6">
        <Cartao className={`flex flex-col ${P.promo ? "border-amber-400/60 shadow-[0_0_40px_rgba(251,191,36,0.12)]" : ""}`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Site + Perfil do Google</p>
            {P.promo && <SeloBlackFriday />}
          </div>
          <p className="text-4xl font-bold text-foreground">
            {brl(P.pix)} <span className="text-lg font-medium text-muted-foreground">no Pix ou boleto</span>
          </p>
          <p className="text-muted-foreground mb-2">ou a partir de {brl(P.cartao)} no cartão, em até {CARTAO.parcelasMax}x</p>
          {P.promo && <p className="text-sm text-amber-300 mb-6">Preço de Black Friday até {P.ate}.</p>}
          {!P.promo && <div className="mb-6" />}
          <ListaCheck itens={INCLUI_IMPLANTACAO} />
          <div className="mt-auto pt-8">
            <Button asChild size="lg" className="w-full rounded-xl font-semibold">
              <Link to="/comecar" onClick={() => registrar("clique_comecar", "quanto_custa")}>
                Quero minha prévia grátis
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-2">Você só paga se aprovar a prévia.</p>
          </div>
        </Cartao>
        <Cartao>
          <p className="text-sm uppercase tracking-wide text-muted-foreground mb-1">Manutenção mensal</p>
          <p className="text-4xl font-bold text-foreground">
            {brl(OFERTA.mensalidade)}
            <span className="text-lg font-medium text-muted-foreground">/mês</span>
          </p>
          <p className="text-muted-foreground mb-6">O 1º mês já vem incluso no preço do site. A mensalidade começa no 2º mês.</p>
          <ListaCheck itens={INCLUI_MENSALIDADE} />
        </Cartao>
      </div>
    </Secao>

    {/* Não inclui: transparente, mas sem quebrar o caminho preço → prova */}
    <Secao className="py-0 md:py-0">
      <Accordion type="single" collapsible>
        <AccordionItem value="fora" className="border rounded-2xl px-6 bg-card/70">
          <AccordionTrigger className="text-base md:text-lg">Ver o que fica de fora do pacote</AccordionTrigger>
          <AccordionContent>
            <ListaCheck itens={NAO_INCLUI} negativo />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Secao>

    <ProjetosFeitos />

    <Equipe />

    {/* Dúvidas mais comuns */}
    <Secao titulo="Dúvidas comuns">
      <Accordion type="single" collapsible className="w-full">
        {PERGUNTAS_LANDING.map(({ p, r }) => (
          <AccordionItem key={p} value={p}>
            <AccordionTrigger className="text-left text-base md:text-lg">{p}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base">{r}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Link to="/como-funciona" className="inline-block mt-4 text-primary hover:underline">
        Ver o passo a passo completo e todas as perguntas
      </Link>
    </Secao>

    {/* Chamada final */}
    <Secao>
      <Cartao className="text-center border-primary/40">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Veja o seu site antes de decidir</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Leva 2 minutos. Em até {PRAZO_PREVIA} você recebe a prévia no WhatsApp, sem
          compromisso.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link to="/comecar" onClick={() => registrar("clique_comecar")}>
              Quero minha prévia
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
            </Link>
          </Button>
          <BotaoWhatsapp mensagem="Oi! Vi a página de site + Perfil do Google da Codifica e queria tirar uma dúvida." />
        </div>
        <p className="text-sm text-muted-foreground mt-4">{LINHA_RISCO}</p>
      </Cartao>
    </Secao>
  </PaginaOferta>
);

export default PresencaGoogle;
