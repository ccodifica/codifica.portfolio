import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, Check, Globe, MessageCircle, ShieldCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROTAS } from "@/config/rotas";
import { OFERTA, brl, linkWhatsapp, precoAtual } from "@/config/oferta";
import { registrar } from "@/lib/metricas";

/** Os dois caminhos da Codifica: site (produto fechado) e sistema (sob medida). */
const ServicesSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const P = precoAtual();

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setIsVisible(true), { threshold: 0.1 });
    const section = document.getElementById("services");
    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const falarSobreSistema = () => {
    registrar("clique_whatsapp", "contato_sistema_home");
    window.open(linkWhatsapp("Olá! Queria conversar sobre um sistema sob medida para o meu negócio."), "_blank", "noopener");
  };

  const garantias = [
    { icone: MessageCircle, titulo: "Direto com quem faz", texto: "Você fala no WhatsApp com quem desenvolve, sem intermediário." },
    { icone: CalendarCheck, titulo: "Prazos claros", texto: `Prévia em até ${OFERTA.prazoPreviaHoras} horas úteis e site completo em até 1 semana.` },
    { icone: ShieldCheck, titulo: "Sem amarras", texto: "Manutenção sem multa: se quiser sair, transferimos tudo para você." },
  ];

  return (
    <section id="services" className="py-24 bg-gradient-to-b from-background to-secondary/20 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className={`text-center mb-14 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="hero-text font-bold mb-4">O que a Codifica faz</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Site pronto para quem quer ser encontrado. Sistema sob medida para quem precisa de mais.
          </p>
        </div>

        <div className={`grid md:grid-cols-2 gap-6 mb-12 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Site */}
          <div className="rounded-2xl border border-primary/50 bg-primary/5 p-6 md:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mb-5">
              <Globe className="w-6 h-6 text-primary" aria-hidden />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">Site + Perfil do Google</h3>
            <p className="text-muted-foreground mb-5">
              Para negócios locais: clínica, consultório, salão, oficina, escritório, restaurante. Quem procura o seu serviço
              acha você e chama no WhatsApp.
            </p>
            <ul className="space-y-2 mb-6 text-sm">
              {["Site feito para celular, com botão de WhatsApp", "Perfil do Google completo: fotos, horário e serviços", "Prévia grátis antes de pagar"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mb-5">
              A partir de <strong className="text-foreground text-lg">{brl(P.pix)}</strong> no Pix
              {P.promo && <span className="text-amber-300"> · preço de Black Friday até {P.ate}</span>}
            </p>
            <Button asChild size="lg" className="rounded-xl font-semibold mt-auto">
              <Link to={ROTAS.produto} onClick={() => registrar("clique_comecar", "quero_meu_site_home_servicos")}>
                Quero meu site <ArrowRight className="w-5 h-5 ml-2" aria-hidden />
              </Link>
            </Button>
          </div>

          {/* Sistema */}
          <div className="rounded-2xl border border-border bg-card/50 p-6 md:p-8 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-5">
              <Workflow className="w-6 h-6 text-accent" aria-hidden />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">Sistemas sob medida</h3>
            <p className="text-muted-foreground mb-5">
              Quando o site não basta: o seu negócio precisa que o cliente agende, pague ou acompanhe algo online.
            </p>
            <ul className="space-y-2 mb-6 text-sm">
              {["Agenda online e inscrições", "Pagamento pelo site e área do cliente", "Funciona no computador e instala no celular como app"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mb-5">Valor combinado depois de uma conversa para entender o que você precisa.</p>
            <Button variant="outline" size="lg" className="rounded-xl font-semibold mt-auto" onClick={falarSobreSistema}>
              <MessageCircle className="w-5 h-5 mr-2" aria-hidden /> Falar sobre um sistema
            </Button>
          </div>
        </div>

        <div className={`grid md:grid-cols-3 gap-4 transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {garantias.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="flex items-start gap-4 p-5 rounded-xl bg-card/30 border border-border/30">
              <div className="w-11 h-11 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Icone className="w-5 h-5 text-primary" aria-hidden />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{titulo}</h4>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
