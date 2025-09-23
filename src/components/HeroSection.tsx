import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const TypewriterText = () => {
  const words = ["startups", "empreendedores", "equipes de produto", "equipes de marketing"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    
    const typewriterTimeout = setTimeout(() => {
      if (isDeleting) {
        if (currentText.length > 0) {
          setCurrentText(prev => prev.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentWordIndex(prev => (prev + 1) % words.length);
        }
      } else {
        if (currentText.length < currentWord.length) {
          setCurrentText(prev => currentWord.slice(0, prev.length + 1));
        } else {
          // Pausa antes de começar a deletar
          setTimeout(() => setIsDeleting(true), 1500);
        }
      }
    }, isDeleting ? 75 : 120); // Velocidade de deletar vs escrever

    return () => clearTimeout(typewriterTimeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="typewriter-container flex flex-col sm:flex-row items-center justify-center gap-3">
      <span className="perfect-for-text text-muted-foreground">Perfeito para</span>
      <div className="typewriter-word-container relative">
        <span className="typewriter-text text-yellow-400">
          {currentText}
        </span>
        <span 
          className={`typewriter-cursor ml-1 transition-opacity duration-100 ${showCursor ? 'opacity-100' : 'opacity-0'}`}
          style={{ color: '#FFD700' }}
        >
          |
        </span>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-hero w-full">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(262_100%_58%_/_0.1),_transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(195_100%_50%_/_0.1),_transparent_50%)] animate-pulse" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-success/10 rounded-full blur-xl float" style={{ animationDelay: '4s' }} />

      {/* Content Wrapper (centered, constrained width for text) */}
      <div className="w-full text-center relative z-10 px-4 sm:px-8">
        <div className={`mx-auto max-w-5xl transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 text-sm font-manrope font-medium text-primary backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>✓ Soluções sob medida para sua empresa</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-reveal hero-text font-manrope font-bold mb-6 text-balance leading-tight">
            Soluções inteligentes
            <br />
            em software para o
            <br />
            futuro
          </h1>

          {/* Subtitle */}
          <p className="text-reveal font-manrope text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance leading-relaxed font-medium">
            Na Codifica, desenvolvemos sistemas e aplicações sob medida para transformar ideias em resultados.
          </p>

          {/* CTA Buttons */}
          <div className="text-reveal flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="btn-hero group font-manrope font-semibold">
              Fale Conosco!
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Link to="/portfolio">
              <Button variant="outline" className="btn-outline-glow font-manrope font-medium">
                Ver Portfólio
              </Button>
            </Link>
          </div>

          {/* Portfolio Carousel */}
          {/* Full Width Portfolio Carousel */}
          <div className="text-reveal mt-20 pt-16 border-t border-border/50">
            <div className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-background to-transparent"></div>
                <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-background to-transparent"></div>
              </div>
              <div className="infinite-scroll-container">
                <div className="infinite-scroll-track">
                  {/* Criando múltiplas cópias para garantir loop seamless */}
                  {Array.from({ length: 4 }).map((_, setIndex) =>
                    [
                      '/src/assets/project-ecommerce.jpg',
                      '/src/assets/project-delivery.jpg',
                      '/src/assets/project-erp.jpg',
                      '/src/assets/project-ecommerce.jpg',
                      '/src/assets/project-delivery.jpg',
                      '/src/assets/project-erp.jpg',
                    ].map((src, i) => (
                      <div key={`set${setIndex}-${i}`} className="carousel-item">
                        <img src={src} alt={setIndex === 0 ? `Projeto ${i + 1}` : ""} className="w-full h-full object-cover" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Animated Text Section */}
          <div className="text-reveal mt-16 text-center">
            <TypewriterText />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;