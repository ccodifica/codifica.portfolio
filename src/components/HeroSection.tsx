import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PROJETOS_WEB } from "@/config/projetos";
import { ROTAS } from "@/config/rotas";
import { OFERTA, brl, precoAtual } from "@/config/oferta";
import { registrarCliqueProjeto, useProjetosOrdenados } from "@/lib/ordemProjetos";
import { registrar } from "@/lib/metricas";
import { Button } from "@/components/ui/button";
import { SeloBlackFriday } from "@/components/oferta/Base";

/**
 * Topo da home. Fala com o dono de negócio local (o público do produto
 * Site + Perfil do Google) e deixa os sistemas para a seção seguinte.
 */
const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const projetosOrdenados = useProjetosOrdenados(PROJETOS_WEB);
  const P = precoAtual();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const irParaSistemas = () => document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className="relative flex flex-col justify-center overflow-hidden bg-gradient-hero w-full pt-32 sm:pt-36 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(262_100%_58%_/_0.1),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(195_100%_50%_/_0.1),_transparent_50%)]" />

      <div className="w-full text-center relative z-10 px-4 sm:px-8">
        <div className={`mx-auto max-w-5xl transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {P.promo && (
            <Link
              to={ROTAS.produto}
              onClick={() => registrar("clique_comecar", "quero_meu_site_home_bf")}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/10 pl-1.5 pr-4 py-1.5 text-sm mb-6 hover:border-amber-400 transition-colors"
            >
              <SeloBlackFriday />
              <span className="text-foreground">
                Site + Perfil do Google por <strong>{brl(P.pix)}</strong> no Pix até {P.ate}
              </span>
            </Link>
          )}

          <h1 className="hero-text text-4xl md:text-5xl lg:text-6xl font-manrope font-bold mb-6 text-balance leading-tight max-w-4xl mx-auto">
            Seu negócio encontrado no Google e chamado no WhatsApp
          </h1>

          <p className="font-manrope text-lg md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance leading-relaxed">
            Fazemos o site do seu negócio, completamos o seu Perfil do Google e cuidamos dos dois todo mês. Você vê uma
            prévia antes de pagar qualquer coisa.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button asChild size="lg" className="rounded-xl font-semibold px-8 shadow-lg group">
              <Link to={ROTAS.produto} onClick={() => registrar("clique_comecar", "quero_meu_site_home")}>
                Quero meu site
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" aria-hidden />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="rounded-xl text-muted-foreground hover:text-foreground" onClick={irParaSistemas}>
              Preciso de um sistema
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Prévia grátis em até {OFERTA.prazoPreviaHoras} horas úteis. Você só paga se aprovar.
          </p>

          {/* Projetos no ar */}
          <div className="mt-16 pt-10 border-t border-border/50">
            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-6">Alguns projetos nossos no ar</p>
            <div className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-background to-transparent"></div>
                <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-background to-transparent"></div>
              </div>
              <div className="infinite-scroll-container">
                <div className="infinite-scroll-track">
                  {(() => {
                    const baseImages = projetosOrdenados.map((p) => ({ id: p.id, src: p.imagem, alt: p.titulo, url: p.url || "/portfolio" }));
                    const sequence = [...baseImages, ...baseImages];
                    return Array.from({ length: 2 }).flatMap((_, setIndex) =>
                      sequence.map((img, i) => (
                        <div key={`set${setIndex}-${i}`} className="carousel-item">
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir site ${img.alt} em nova aba`}
                            onClick={() => registrarCliqueProjeto(img.id)}
                            className="block w-full h-full"
                          >
                            <img
                              src={img.src}
                              alt={setIndex === 0 && i < baseImages.length ? img.alt : ""}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                              }}
                            />
                          </a>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
