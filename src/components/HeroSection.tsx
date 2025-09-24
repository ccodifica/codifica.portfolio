import { useEffect, useState, useMemo } from "react";
import projectEcommerce from "@/assets/project-ecommerce.jpg";
import projectDelivery from "@/assets/project-delivery.jpg";
import projectErp from "@/assets/project-erp.jpg";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const TypewriterText = () => {
  const words = useMemo(() => [
    "startups",
    "empreendedores",
    "equipes de produto",
    "equipes de marketing",
  ], []);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const currentWord = words[currentWordIndex];

    const typewriterTimeout = setTimeout(
      () => {
        if (isDeleting) {
          if (currentText.length > 0) {
            setCurrentText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentWordIndex((prev) => (prev + 1) % words.length);
          }
        } else {
          if (currentText.length < currentWord.length) {
            setCurrentText((prev) => currentWord.slice(0, prev.length + 1));
          } else {
            // Pausa antes de começar a deletar
            setTimeout(() => setIsDeleting(true), 1500);
          }
        }
      },
      isDeleting ? 75 : 120
    ); // Velocidade de deletar vs escrever

    return () => clearTimeout(typewriterTimeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  const containerStyle = {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.25rem",
    fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Georgia', serif",
    fontSize: "clamp(1rem, 4vw, 1.6rem)",
    fontStyle: "italic",
    fontWeight: "300",
    letterSpacing: "0.01em",
    lineHeight: "1.2",
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
    flexWrap: "wrap" as const,
  };

  const perfectForStyle = {
    fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Georgia', serif",
    fontSize: "clamp(1rem, 4vw, 1.6rem)",
    fontStyle: "italic",
    fontWeight: "300",
    letterSpacing: "0.01em",
    color: "hsl(215, 20.2%, 65.1%)",
    opacity: "0.8",
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
  };

  const textStyle = {
    fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Georgia', serif",
    fontSize: "clamp(1rem, 4vw, 1.6rem)",
    fontStyle: "italic",
    fontWeight: "300",
    letterSpacing: "0.01em",
    color: "hsl(262, 100%, 58%)",
    whiteSpace: "nowrap" as const,
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
  };

  const cursorStyle = {
    fontFamily: "'Playfair Display', 'Cormorant Garamond', 'Georgia', serif",
    fontSize: "clamp(1rem, 4vw, 1.6rem)",
    fontStyle: "italic",
    fontWeight: "300",
    letterSpacing: "0.01em",
    color: "hsl(215, 20.2%, 65.1%)",
    marginLeft: "2px",
    opacity: showCursor ? 1 : 0,
    transition: "opacity 0.1s ease-in-out",
    WebkitFontSmoothing: "antialiased" as const,
    MozOsxFontSmoothing: "grayscale" as const,
  };

  return (
    <div style={containerStyle}>
      <span style={perfectForStyle}>Perfeito para</span>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "clamp(0.2em, 2vw, 0.3em)",
          minWidth: "0", // Permite que o texto se ajuste
        }}
      >
        <span style={textStyle}>{currentText}</span>
        <span style={cursorStyle}>|</span>
      </div>
    </div>
  );
};

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleContactClick = () => {
    const contact = document.getElementById("contact");
    if (contact) {
      contact.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gradient-hero w-full pt-28 sm:pt-32">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(262_100%_58%_/_0.1),_transparent_50%)] animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(195_100%_50%_/_0.1),_transparent_50%)] animate-pulse" />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl float" />
      <div
        className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 right-20 w-16 h-16 bg-success/10 rounded-full blur-xl float"
        style={{ animationDelay: "4s" }}
      />

      {/* Content Wrapper (centered, constrained width for text) */}
      <div className="w-full text-center relative z-10 px-4 sm:px-8">
        <div
          className={`mx-auto max-w-5xl transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main Heading */}
          <h1 className="text-reveal hero-text text-3xl md:text-5xl lg:text-6xl font-manrope font-bold mb-6 text-center text-balance leading-tight max-w-4xl mx-auto">
            Soluções inteligentes
            <br />
            em software para o
            <br />
            futuro
          </h1>

          {/* Subtitle */}
          <p className="text-reveal font-manrope text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance leading-relaxed font-medium">
            Na Codifica, desenvolvemos sistemas e aplicações sob medida para
            transformar ideias em resultados.
          </p>

          {/* CTA Buttons */}
          <div className="text-reveal flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleContactClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-manrope font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group"
            >
              Fale Conosco!
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <Link to="/portfolio">
              <Button
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-manrope font-medium px-6 py-3 rounded-lg transition-all duration-300"
              >
                Ver Projetos
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
                  {(() => {
                    const baseImages = [
                      { src: projectEcommerce, alt: "Projeto E-commerce" },
                      { src: projectDelivery, alt: "Projeto Delivery" },
                      { src: projectErp, alt: "Projeto ERP" },
                    ];
                    // Duplicar sequência para loop suave
                    const sequence = [...baseImages, ...baseImages];
                    return Array.from({ length: 4 }).flatMap((_, setIndex) =>
                      sequence.map((img, i) => (
                        <div key={`set${setIndex}-${i}`} className="carousel-item">
                          <img
                            src={img.src}
                            alt={setIndex === 0 ? img.alt : ""}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Animated Text Section */}
          <div className="text-reveal mt-16 mb-12 sm:mb-20 text-center px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              <TypewriterText />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
