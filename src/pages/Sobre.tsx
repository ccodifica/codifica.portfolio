import { useEffect, useState, useRef } from "react";
import { Users, Target, Award, Code2, Calendar, Lightbulb, TrendingUp, Star, Rocket, Building } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TechCarousel from "@/components/TechCarousel";

const Sobre = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [animatedDots, setAnimatedDots] = useState<number[]>([]);
  const navigate = useNavigate();
  const timelineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Hook para detectar elementos visíveis no scroll com animações sofisticadas
  useEffect(() => {
    const currentRefs = timelineRefs.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            // Animação mais sofisticada com efeito cascata
            setTimeout(() => {
              setVisibleItems(prev => [...prev.filter(i => i !== index), index]);
            }, index * 300); // Delay maior para efeito mais dramático
            
            // Anima o dot da timeline com delay
            setTimeout(() => {
              setAnimatedDots(prev => [...prev.filter(i => i !== index), index]);
            }, (index * 300) + 200);
          }
        });
      },
      { 
        threshold: 0.15,
        rootMargin: '-10px 0px -10px 0px'
      }
    );

    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const handleContactClick = () => {
    navigate('/', { state: { target: 'contact' } });
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const timelineData = [
    {
      date: "Janeiro 2025",
      title: "A Ideia Nasce",
      description: "Gustavo e Pedro, dois desenvolvedores apaixonados por tecnologia, decidem unir forças para criar algo extraordinário. Nasce a Codifica com uma missão clara: transformar ideias em soluções digitais que fazem a diferença.",
      icon: Lightbulb,
      highlight: true,
      founders: true,
      content: "A fundação da Codifica marca o início de uma jornada focada em inovação e excelência técnica."
    },
    {
      date: "Março 2025",
      title: "Primeiros Passos",
      description: "Desenvolvemos nossos primeiros projetos focados em sites institucionais e pequenos sistemas web. Cada linha de código é cuidadosamente pensada para estabelecer nossa metodologia de trabalho e padrões de qualidade.",
      icon: Rocket,
      content: "Nossa abordagem desde o início: trabalhar lado a lado com nossos clientes, entendendo suas necessidades e criando soluções personalizadas."
    },
    {
      date: "Junho 2025",
      title: "Expansão e Crescimento",
      description: "Ampliamos nosso portfólio para incluir e-commerces complexos, sistemas de gestão empresarial e aplicações web avançadas. Nossa expertise técnica se consolida com metodologias ágeis e tecnologias modernas.",
      icon: TrendingUp,
      content: "Utilizamos as tecnologias mais modernas do mercado - React, Node.js, TypeScript - sempre buscando entregar soluções escaláveis e seguras."
    },
    {
      date: "Setembro 2025",
      title: "Crescimento Constante",
      description: "Estamos mais estabilizados no mercado e felizes em receber cada vez mais projetos. Nossa base de clientes cresce organicamente através de recomendações e parcerias sólidas que construímos ao longo do caminho.",
      icon: Star,
      highlight: true,
      content: "Cada novo projeto é uma oportunidade de aprender, crescer e entregar ainda mais valor. Estamos construindo algo sólido, passo a passo, com muito trabalho e dedicação."
    }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: "Inovação Criativa",
      description: "Transformamos ideias em soluções tecnológicas únicas",
      detail: "Utilizamos as tecnologias mais modernas para criar experiências que fazem a diferença no mercado.",
      pattern: "dots",
      color: {
        primary: "amber",
        gradient: "from-amber-500/20 via-orange-500/10 to-yellow-500/20",
        glow: "shadow-amber-500/20",
        icon: "text-amber-400"
      }
    },
    {
      icon: Award,
      title: "Qualidade Premium", 
      description: "Excelência em cada detalhe do desenvolvimento",
      detail: "Cada linha de código é cuidadosamente pensada e testada para entregar o melhor resultado possível.",
      pattern: "waves",
      color: {
        primary: "blue",
        gradient: "from-blue-500/20 via-indigo-500/10 to-purple-500/20",
        glow: "shadow-blue-500/20",
        icon: "text-blue-400"
      }
    },
    {
      icon: Users,
      title: "Parceria Genuína",
      description: "Relacionamentos duradouros baseados em confiança",
      detail: "Trabalhamos lado a lado com nossos clientes, entendendo suas necessidades e objetivos únicos.",
      pattern: "grid",
      color: {
        primary: "emerald",
        gradient: "from-emerald-500/20 via-green-500/10 to-teal-500/20",
        glow: "shadow-emerald-500/20",
        icon: "text-emerald-400"
      }
    },
    {
      icon: TrendingUp,
      title: "Crescimento Contínuo",
      description: "Evolução constante em tecnologia e metodologia",
      detail: "Adotamos as melhores práticas e metodologias ágeis para garantir entregas rápidas e eficientes.",
      pattern: "circles",
      color: {
        primary: "rose",
        gradient: "from-rose-500/20 via-pink-500/10 to-red-500/20",
        glow: "shadow-rose-500/20",
        icon: "text-rose-400"
      }
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(262_100%_58%_/_0.1),_transparent_50%)] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(195_100%_50%_/_0.1),_transparent_50%)] animate-pulse" />

        <div className="container mx-auto px-4 relative z-10">
          <div
            className={`text-center transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <h1 className="text-4xl md:text-6xl font-bold font-manrope mb-6 text-balance leading-tight">
              Sobre a<span className="text-primary"> Codifica</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto text-balance leading-relaxed">
              Transformamos ideias em soluções digitais inovadoras, construindo
              o futuro através da tecnologia.
            </p>
          </div>
        </div>
      </section>

      {/* Enhanced Timeline Section */}
      <section className="py-20 bg-gradient-to-br from-background via-card/30 to-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              {/* Base Timeline Line */}
              <div className="absolute left-8 md:left-1/2 md:-translate-x-0.5 top-0 bottom-0 w-1 bg-border/10 rounded-full"></div>
              
              {/* Smooth Loading Progress Line */}
              <div 
                className="absolute left-8 md:left-1/2 md:-translate-x-0.5 top-0 w-1 rounded-full overflow-hidden"
                style={{
                  height: visibleItems.length > 0 
                    ? `${(Math.max(...visibleItems) + 1) * 25}%` 
                    : '0%',
                  transition: 'height 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Animated gradient fill - like loading bar */}
                <div className="w-full h-full bg-gradient-to-b from-primary/90 via-primary to-accent/80 relative">
                  {/* Moving shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-transparent animate-pulse"></div>
                  
                  {/* Flowing particles inside */}
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full h-2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-bounce opacity-60"
                        style={{
                          top: `${i * 30 + 10}%`,
                          animationDelay: `${i * 0.5}s`,
                          animationDuration: '2s'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Glowing aura */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/30 to-accent/20 rounded-full blur-sm -inset-1"></div>
              </div>

              {/* Active progress indicator */}
              {visibleItems.length > 0 && (
                <div 
                  className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/50 transition-all duration-1000 ease-out"
                  style={{
                    top: `${(Math.max(...visibleItems) + 1) * 25}%`,
                    transform: 'translateX(-50%) translateY(-50%)'
                  }}
                >
                  <div className="absolute inset-0 bg-primary rounded-full animate-ping"></div>
                  <div className="absolute inset-1 bg-white/80 rounded-full animate-pulse"></div>
                </div>
              )}

              {timelineData.map((item, index) => (
                <div 
                  key={index} 
                  ref={(el) => (timelineRefs.current[index] = el)}
                  data-index={index}
                  className={`relative flex items-start transition-all duration-1200 ease-out transform ${
                    visibleItems.includes(index) 
                      ? 'opacity-100 translate-y-0 scale-100 blur-none' 
                      : 'opacity-0 translate-y-16 scale-90 blur-sm'
                  } ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} ${
                    item.founders ? 'mb-32' : 'mb-20'
                  }`}
                  style={{
                    transitionDelay: visibleItems.includes(index) ? `${index * 150}ms` : '0ms'
                  }}
                >
                  {/* Static Timeline Dots - Always Visible */}
                  <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2">
                    {/* Outer glow ring - animated only when item is visible */}
                    <div className={`absolute -inset-3 rounded-full transition-all duration-1000 ${
                      visibleItems.includes(index) 
                        ? item.highlight 
                          ? 'bg-primary/20 animate-pulse scale-100 opacity-100' 
                          : 'bg-primary/10 scale-100 opacity-100'
                        : 'scale-75 opacity-30'
                    }`}></div>
                    
                    {/* Main dot - always visible */}
                    <div className={`w-6 h-6 rounded-full border-4 z-20 relative transition-all duration-800 ${
                      item.highlight 
                        ? 'bg-primary border-primary shadow-lg shadow-primary/40' 
                        : 'bg-background border-primary shadow-md shadow-primary/20'
                    } ${visibleItems.includes(index) ? 'scale-110' : 'scale-100'}`}>
                      
                      {/* Inner pulse - only when visible */}
                      <div className={`absolute inset-2 rounded-full transition-all duration-1000 ${
                        item.highlight ? 'bg-white/30' : 'bg-primary/30'
                      } ${visibleItems.includes(index) ? 'animate-ping' : 'scale-0'}`}></div>
                      
                      {/* Icon for highlights */}
                      {item.highlight && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <item.icon className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Content Card with Professional Animations */}
                  <div className={`w-full md:w-5/12 ml-20 md:ml-0 ${
                    index % 2 === 0 ? 'md:mr-auto md:pr-12' : 'md:ml-auto md:pl-12'
                  }`}>
                    {/* Special Founders Card - Enhanced */}
                    {item.founders ? (
                      <div className="relative">
                        {/* Founders Card - Larger and More Sophisticated */}
                        <div className={`relative p-0 rounded-3xl border-2 transition-all duration-700 ease-out hover:scale-[1.02] group overflow-hidden ${
                          'bg-gradient-to-br from-primary/10 via-accent/8 to-primary/15 border-primary/30 shadow-2xl hover:shadow-3xl hover:shadow-primary/20'
                        } ${visibleItems.includes(index) ? 'hover:-translate-y-3' : ''}`}>
                          
                          {/* Animated Background Pattern */}
                          <div className="absolute inset-0 overflow-hidden">
                            <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/10 transition-all duration-1000 ${
                              visibleItems.includes(index) ? 'animate-spin-slow' : 'scale-0'
                            }`}></div>
                            <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-accent/10 transition-all duration-1200 ${
                              visibleItems.includes(index) ? 'animate-float-delayed' : 'scale-0'
                            }`}></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent"></div>
                          </div>

                          {/* Header Section */}
                          <div className="relative z-10 p-6 pb-4">
                            <div className="flex items-center mb-4">
                              <div className={`p-3 rounded-xl mr-3 transition-all duration-500 group-hover:rotate-12 bg-primary/15 shadow-md ${
                                visibleItems.includes(index) ? 'animate-icon-bounce' : ''
                              }`}>
                                <item.icon className="w-5 h-5 text-primary transition-all duration-500 group-hover:scale-110" />
                              </div>
                              <span className="text-sm font-semibold px-3 py-1 rounded-full text-primary bg-primary/10 border border-primary/20">
                                {item.date}
                              </span>
                            </div>

                            <h3 className={`text-xl font-bold mb-3 font-manrope text-primary transition-all duration-300 ${
                              visibleItems.includes(index) ? 'animate-title-reveal' : ''
                            }`}>
                              {item.title}
                            </h3>
                            
                            <p className={`text-muted-foreground leading-relaxed mb-6 text-sm transition-all duration-500 ${
                              visibleItems.includes(index) ? 'animate-text-slide-up' : 'opacity-0 translate-y-4'
                            }`}>
                              {item.description}
                            </p>
                          </div>

                          {/* Founders Photos and Education Section */}
                          <div className={`relative z-10 px-6 mb-6 transition-all duration-1000 ${
                            visibleItems.includes(index) ? 'animate-founders-section' : 'opacity-0 translate-y-8'
                          }`}>
                            {/* Section Title */}
                            <div className="text-center mb-8">
                              <h4 className="text-lg font-bold text-primary mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Nossos Fundadores
                              </h4>
                              <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"></div>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-8">
                              {/* Gustavo's Profile */}
                              <div className={`relative group/founder transition-all duration-700 ${
                                visibleItems.includes(index) ? 'animate-gustavo-appear' : 'opacity-0 scale-0'
                              }`}>
                                <div className="relative text-center">
                                  {/* Photo placeholder with sophisticated design */}
                                  <div className="relative mx-auto mb-4">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-3 border-primary/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-xl group-hover/founder:shadow-2xl group-hover/founder:shadow-primary/20 relative overflow-hidden">
                                      {/* Photo placeholder */}
                                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center relative">
                                        <span className="text-xl font-bold text-primary">G</span>
                                        {/* Overlay for future photo */}
                                        <div className="absolute inset-0 bg-black/10 rounded-full"></div>
                                      </div>
                                      {/* Animated border */}
                                      <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-spin-slow"></div>
                                    </div>
                                  </div>
                                  
                                  {/* Name and Title */}
                                  <div className="mb-4">
                                    <h5 className="text-lg font-bold text-foreground mb-1">Gustavo</h5>
                                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Co-Fundador</span>
                                  </div>
                                  
                                  {/* Education */}
                                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 group-hover/founder:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center justify-center mb-2">
                                      <Code2 className="w-4 h-4 text-primary mr-2" />
                                      <span className="text-xs font-semibold text-primary">Formação</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                      Graduação em<br />
                                      <strong className="text-primary">Análise e Desenvolvimento<br />de Sistemas</strong>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Pedro's Profile */}
                              <div className={`relative group/founder transition-all duration-700 ${
                                visibleItems.includes(index) ? 'animate-pedro-appear' : 'opacity-0 scale-0'
                              }`}>
                                <div className="relative text-center">
                                  {/* Photo placeholder with sophisticated design */}
                                  <div className="relative mx-auto mb-4">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-accent/20 to-primary/20 border-3 border-accent/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-xl group-hover/founder:shadow-2xl group-hover/founder:shadow-accent/20 relative overflow-hidden">
                                      {/* Photo placeholder */}
                                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center relative">
                                        <span className="text-xl font-bold text-primary">P</span>
                                        {/* Overlay for future photo */}
                                        <div className="absolute inset-0 bg-black/10 rounded-full"></div>
                                      </div>
                                      {/* Animated border */}
                                      <div className="absolute inset-0 border-2 border-accent/20 rounded-full animate-spin-slow"></div>
                                    </div>
                                  </div>
                                  
                                  {/* Name and Title */}
                                  <div className="mb-4">
                                    <h5 className="text-lg font-bold text-foreground mb-1">Pedro Henrique</h5>
                                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">Co-Fundador</span>
                                  </div>
                                  
                                  {/* Education */}
                                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 group-hover/founder:bg-white/10 transition-all duration-300">
                                    <div className="flex items-center justify-center mb-2">
                                      <Code2 className="w-4 h-4 text-accent mr-2" />
                                      <span className="text-xs font-semibold text-accent">Formação</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                      Graduação em<br />
                                      <strong className="text-accent">Ciência da<br />Computação</strong>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Partnership symbol */}
                            <div className="flex justify-center mt-6">
                              <div className={`text-2xl font-bold text-primary/60 transition-all duration-500 ${
                                visibleItems.includes(index) ? 'animate-pulse' : 'opacity-0'
                              }`}>
                                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">∞</span>
                              </div>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className={`relative z-10 px-6 pb-6 transition-all duration-700 ${
                            visibleItems.includes(index) ? 'animate-content-fade-in' : 'opacity-0 translate-y-2'
                          }`}>
                            <div className="bg-card/30 p-4 rounded-lg border border-border/30">
                              <p className="text-xs text-muted-foreground leading-relaxed italic text-center">
                                {item.content}
                              </p>
                            </div>
                          </div>

                          {/* Decorative Elements */}
                          <div className="absolute top-4 right-4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
                          <div className="absolute bottom-4 left-4 w-1 h-1 bg-accent/40 rounded-full animate-ping"></div>
                        </div>
                      </div>
                    ) : (
                      /* Regular Cards */
                      <div className={`p-6 rounded-2xl border transition-all duration-1000 ease-out hover:scale-[1.02] hover:rotate-1 group ${
                        item.highlight 
                          ? 'bg-gradient-to-br from-primary/8 via-accent/5 to-primary/12 border-primary/30 shadow-lg hover:shadow-2xl hover:shadow-primary/20' 
                          : 'bg-background/95 backdrop-blur-sm border-border/60 hover:border-primary/50 hover:shadow-xl hover:bg-background/98'
                      } ${visibleItems.includes(index) ? 'hover:-translate-y-2' : ''}`}>
                        
                        {/* Floating background elements */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl">
                          <div className={`absolute -top-10 -right-10 w-20 h-20 rounded-full transition-all duration-1000 ${
                            item.highlight ? 'bg-primary/5' : 'bg-accent/5'
                          } ${visibleItems.includes(index) ? 'animate-float' : 'scale-0'}`}></div>
                          <div className={`absolute -bottom-6 -left-6 w-12 h-12 rounded-full transition-all duration-1200 ${
                            item.highlight ? 'bg-accent/5' : 'bg-primary/5'
                          } ${visibleItems.includes(index) ? 'animate-float-delayed' : 'scale-0'}`}></div>
                        </div>

                        {/* Date and Icon Header */}
                        <div className="flex items-center mb-4 relative z-10">
                          <div className={`p-3 rounded-xl mr-3 transition-all duration-500 group-hover:rotate-12 ${
                            item.highlight ? 'bg-primary/15 shadow-md' : 'bg-muted hover:bg-primary/10'
                          } ${visibleItems.includes(index) ? 'animate-icon-bounce' : ''}`}>
                            <item.icon className={`w-5 h-5 transition-all duration-500 group-hover:scale-110 ${
                              item.highlight ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                            }`} />
                          </div>
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full transition-all duration-300 ${
                            item.highlight 
                              ? 'text-primary bg-primary/10 border border-primary/20' 
                              : 'text-muted-foreground bg-muted/50 hover:bg-primary/10 hover:text-primary'
                          }`}>
                            {item.date}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className={`text-xl font-bold mb-3 font-manrope relative z-10 transition-all duration-300 ${
                          item.highlight ? 'text-primary' : 'text-foreground group-hover:text-primary'
                        } ${visibleItems.includes(index) ? 'animate-title-reveal' : ''}`}>
                          {item.title}
                        </h3>
                        
                        {/* Description */}
                        <p className={`text-muted-foreground leading-relaxed mb-4 text-sm relative z-10 transition-all duration-500 ${
                          visibleItems.includes(index) ? 'animate-text-slide-up' : 'opacity-0 translate-y-4'
                        }`}>
                          {item.description}
                        </p>

                        {/* Content */}
                        <div className={`bg-card/30 p-3 rounded-lg border border-border/30 relative z-10 transition-all duration-700 ${
                          visibleItems.includes(index) ? 'animate-content-fade-in' : 'opacity-0 translate-y-2'
                        }`}>
                          <p className="text-xs text-muted-foreground leading-relaxed italic">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Final Stats Summary */}
          <div className="mt-20 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 hover:shadow-lg transition-all duration-300">
                  <Users className="w-8 h-8 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-primary mb-2">25+</div>
                  <div className="text-sm text-muted-foreground font-medium">Projetos Entregues</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 hover:shadow-lg transition-all duration-300">
                  <Target className="w-8 h-8 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-primary mb-2">100%</div>
                  <div className="text-sm text-muted-foreground font-medium">Satisfação</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 hover:shadow-lg transition-all duration-300">
                  <Award className="w-8 h-8 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-primary mb-2">2+</div>
                  <div className="text-sm text-muted-foreground font-medium">Anos Experiência</div>
                </div>
                <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 hover:shadow-lg transition-all duration-300">
                  <Code2 className="w-8 h-8 text-primary mx-auto mb-4" />
                  <div className="text-3xl font-bold text-primary mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground font-medium">Suporte Técnico</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-manrope mb-6">
              Nossa Missão
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Na Codifica, acreditamos que a tecnologia deve ser uma ferramenta
              de transformação. Nossa missão é desenvolver soluções digitais que
              não apenas atendam às necessidades dos nossos clientes, mas que
              também impulsionem o crescimento e a inovação em seus negócios.
            </p>
          </div>
        </div>

        {/* Full-width Tech Carousel */}
        <TechCarousel />
      </section>

      {/* Values Section - Sophisticated Pillars Design */}
      <section className="py-24 bg-gradient-to-b from-background via-card/5 to-background relative overflow-hidden">
        {/* Elegant background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/2 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/2 rounded-full blur-3xl animate-float-delayed"></div>
          
          {/* Subtle geometric accents */}
          <div className="absolute top-1/4 left-1/6 w-2 h-2 bg-primary/15 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/5 w-1 h-1 bg-accent/20 rounded-full animate-ping"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Title Section - Clean and Professional */}
          <div className="max-w-4xl mx-auto text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold font-manrope mb-6 text-foreground">
              Pilares da Codifica
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Os pilares fundamentais que sustentam nossa identidade e orientam cada decisão estratégica
            </p>
          </div>

          {/* Pillars Architecture - Responsive & Refined */}
          <div className="max-w-7xl mx-auto">
            {/* Foundation Platform */}
            <div className="relative mb-16">
              {/* Main foundation */}
              <div className="absolute bottom-0 left-4 right-4 md:left-8 md:right-8 h-4 md:h-6 bg-gradient-to-r from-border/20 via-border/40 to-border/20 rounded-full"></div>
              <div className="absolute bottom-1 left-6 right-6 md:left-12 md:right-12 h-2 md:h-3 bg-gradient-to-r from-border/30 via-border/60 to-border/30 rounded-full blur-sm"></div>
              
              {/* Pillars Container - Responsive Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8 px-2 md:px-4">
                {values.map((value, index) => (
                  <div
                    key={index}
                    className="group relative flex flex-col items-center"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    {/* Pillar Structure */}
                    <div className="relative flex flex-col items-center">
                      
                      {/* Floating Icon - Clean Design */}
                      <div className="relative z-30 mb-3 md:mb-4">
                        <div className={`p-2 md:p-3 rounded-full bg-gradient-to-br ${value.color.gradient} shadow-2xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 backdrop-blur-sm border border-white/20 ${value.color.glow}`}>
                          <value.icon className={`pillar-icon-responsive ${value.color.icon} group-hover:scale-125 group-hover:rotate-6 transition-all duration-400`} />
                        </div>
                        
                        {/* Subtle orbital ring */}
                        <div className="absolute inset-0 border border-white/10 rounded-full scale-125 group-hover:scale-150 group-hover:rotate-180 transition-all duration-1000 opacity-30"></div>
                      </div>
                      
                      {/* Main Pillar Column - Responsive Heights */}
                      <div className={`pillar-responsive relative bg-gradient-to-b ${value.color.gradient} border border-white/20 shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-2 group-hover:border-white/30 ${value.color.glow} rounded-t-sm overflow-hidden animate-pillar-glow`}>
                        
                        {/* Rich Interior Design - Simplified & Elegant */}
                        <div className="absolute inset-0">
                          {/* Sophisticated gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-white/12 group-hover:from-white/12 group-hover:to-white/16 transition-all duration-500"></div>
                          
                          {/* Clean vertical lines for structure */}
                          <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-white/25 to-transparent group-hover:via-white/35 transition-colors duration-500"></div>
                          <div className="absolute inset-y-8 left-1/4 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"></div>
                          <div className="absolute inset-y-8 right-1/4 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent"></div>
                          
                          {/* Subtle horizontal accents */}
                          <div className="absolute top-1/4 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                          <div className="absolute top-2/4 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
                          <div className="absolute top-3/4 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                          
                          {/* Dynamic light beam */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-1 h-8 md:h-12 bg-gradient-to-b from-white/60 via-white/30 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 animate-light-beam"></div>
                          
                          {/* Floating particles - Refined */}
                          <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-white/25 rounded-full animate-float-particle" style={{ animationDelay: '0s' }}></div>
                          <div className="absolute top-2/3 right-1/3 w-0.5 h-0.5 bg-white/35 rounded-full animate-float-particle" style={{ animationDelay: '1.5s' }}></div>
                          <div className="absolute top-1/2 left-2/3 w-0.5 h-0.5 bg-white/20 rounded-full animate-float-particle" style={{ animationDelay: '3s' }}></div>
                          
                          {/* Gentle inner glow */}
                          <div className="absolute inset-2 bg-gradient-to-b from-white/5 via-transparent to-white/8 rounded-sm group-hover:from-white/8 group-hover:to-white/12 transition-all duration-700"></div>
                        </div>
                      </div>
                      
                      {/* Base - Responsive */}
                      <div className="pillar-base-responsive bg-gradient-to-b from-border/40 to-border/60 rounded-t-sm border-t border-x border-border/50 shadow-lg"></div>
                      
                      {/* Pillar number - Responsive */}
                      <div className="absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 w-6 md:w-8 h-6 md:h-8 bg-gradient-to-b from-primary to-primary/80 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-lg group-hover:scale-125 group-hover:shadow-xl transition-all duration-500 border-2 border-white/20">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Content below pillar - Responsive */}
                    <div className="mt-8 md:mt-12 text-center max-w-xs">
                      <h3 className="text-base md:text-lg lg:text-xl font-bold font-manrope mb-2 md:mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                        {value.title}
                      </h3>
                      
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-3 md:mb-4 group-hover:text-foreground transition-colors duration-300">
                        {value.description}
                      </p>
                      
                      {/* Expandable detail - Hidden on mobile for cleaner look */}
                      <div className="overflow-hidden hidden md:block">
                        <div className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-200">
                          <div className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 shadow-sm">
                            <p className="text-xs text-muted-foreground italic leading-relaxed">
                              "{value.detail}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Foundation inscription */}
            <div className="text-center">
              <div className="inline-flex items-center gap-6 bg-gradient-to-r from-card/30 via-card/50 to-card/30 backdrop-blur-sm px-8 py-4 rounded-full border border-border/30 shadow-lg">
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"></div>
                <span className="text-lg font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Fundação sólida, futuro brilhante
                </span>
                <div className="w-8 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold font-manrope mb-6">
              Pronto para transformar sua ideia em realidade?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Entre em contato conosco e descubra como podemos ajudar sua
              empresa a alcançar o próximo nível através da tecnologia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={handleContactClick}
                className="btn-sweep-right"
              >
                Fale Conosco
              </button>
              <Link 
                to="/portfolio"
                onClick={() => {
                  // Scroll to top when navigating to portfolio
                  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                }}
              >
                <button className="btn-bounce-bottom w-full sm:w-auto">
                  Ver Projetos
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Sobre;
