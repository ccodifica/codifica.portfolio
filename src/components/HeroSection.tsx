import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(262_100%_58%_/_0.1),_transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(195_100%_50%_/_0.1),_transparent_50%)] animate-pulse" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-success/10 rounded-full blur-xl float" style={{ animationDelay: '4s' }} />

      <div className="container mx-auto px-4 text-center relative z-10">
        <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Soluções sob medida para sua empresa</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-reveal hero-text font-bold mb-6 text-balance leading-tight">
            Soluções inteligentes
            <br />
            em software para o
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">futuro</span>
          </h1>

          {/* Subtitle */}
          <p className="text-reveal text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance leading-relaxed">
            Na Codifica, desenvolvemos sistemas e aplicações sob medida para transformar ideias em resultados.
          </p>

          {/* CTA Buttons */}
          <div className="text-reveal flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="btn-hero group">
              Fale Conosco
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Link to="/portfolio">
              <Button variant="outline" className="btn-outline-glow">
                Ver Portfólio
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="text-reveal grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Projetos Entregues</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">98%</div>
              <div className="text-muted-foreground">Satisfação do Cliente</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-success mb-2">24/7</div>
              <div className="text-muted-foreground">Suporte Técnico</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;