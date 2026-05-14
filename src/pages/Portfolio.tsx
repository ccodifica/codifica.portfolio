import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight, ExternalLink, Filter } from "lucide-react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import { cn } from "@/lib/utils";
import projectArcanjo from "@/assets/project-arcanjo.png";
import projectBaile55 from "@/assets/project-baile55.png";
import projectConsultec from "@/assets/project-consultec.png";
import projectJardins from "@/assets/project-jardins.png";
import projectKidstogether from "@/assets/project-kidstogether.png";
import projectMeiodomato from "@/assets/project-meiodomato.png";
import projectServitec from "@/assets/project-servitec.png";
import appKids2gether from "@/assets/app-kids2gether.png";
import appScaleclock from "@/assets/app-scaleclock.png";

const WEB_PER_PAGE = 6;
const APP_PER_PAGE = 4;

const Portfolio = () => {
  const [selectedFilter, setSelectedFilter] = useState("Todos");
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [webPage, setWebPage] = useState(1);
  const [appPage, setAppPage] = useState(1);
  const webSectionRef = useRef<HTMLDivElement>(null);
  const appSectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "instant" });
    }
  };

  const handleContactClick = () => {
    navigate('/', { state: { target: 'contact' } });
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Add transition effect when filter changes
  const handleFilterChange = (filter: string) => {
    if (filter !== selectedFilter) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedFilter(filter);
        setWebPage(1);
        setAppPage(1);
        setIsTransitioning(false);
      }, 200);
    }
  };

  const renderPagination = (
    currentPage: number,
    totalPages: number,
    setPage: (p: number) => void,
    sectionRef: React.RefObject<HTMLDivElement>,
  ) => {
    if (totalPages <= 1) return null;
    const goTo = (p: number) => {
      if (p === currentPage) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setPage(p);
        scrollToSection(sectionRef);
        setIsTransitioning(false);
      }, 200);
    };
    return (
      <Pagination className="mt-10">
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              href="#"
              size="default"
              className={cn(
                "gap-1 pl-2.5",
                currentPage === 1 && "pointer-events-none opacity-50",
              )}
              onClick={(e) => {
                e.preventDefault();
                goTo(Math.max(1, currentPage - 1));
              }}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Anterior</span>
            </PaginationLink>
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                href="#"
                isActive={currentPage === i + 1}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(i + 1);
                }}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationLink
              href="#"
              size="default"
              className={cn(
                "gap-1 pr-2.5",
                currentPage === totalPages && "pointer-events-none opacity-50",
              )}
              onClick={(e) => {
                e.preventDefault();
                goTo(Math.min(totalPages, currentPage + 1));
              }}
              aria-label="Próxima página"
            >
              <span>Próximo</span>
              <ChevronRight className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const filters = ["Todos", "Web", "App"];

  const projects = [
    {
      id: 1,
      title: "Arcanjo Sociedade de Advogados",
      description: "Site institucional para escritório especializado em Direito Tributário, Regulatório, Econômico e Financeiro. Identidade sóbria e elegante para transmitir credibilidade e expertise jurídica.",
      category: "Web",
      image: projectArcanjo,
      technologies: ["HTML5", "CSS3", "JavaScript", "Responsivo"],
      url: "https://www.arcanjoadvogados.com.br/",
      color: "from-slate-700 to-amber-700",
    },
    {
      id: 7,
      title: "Servitec Dinamômetro",
      description: "Site institucional para fabricante referência em dinamômetros automotivos desde 1988, com catálogo de produtos, blog técnico, suporte e seleção de idiomas.",
      category: "Web",
      image: projectServitec,
      technologies: ["JavaScript", "CSS3", "WebP", "Multilíngue"],
      url: "https://www.servitecdinamometro.com.br/",
      color: "from-zinc-800 to-amber-500",
    },
    {
      id: 3,
      title: "Consultec Soluções",
      description: "Landing page para empresa de serviços topográficos e agronômicos, destacando 14 anos transformando propriedades rurais em segurança jurídica e crédito.",
      category: "Web",
      image: projectConsultec,
      technologies: ["React", "Tailwind CSS", "SEO", "Formulários"],
      url: "https://www.consultecsolucoes.com/",
      color: "from-green-600 to-emerald-700",
    },
    {
      id: 4,
      title: "Jardins Dona Isabel",
      description: "Landing page premium para empreendimento de luxo sustentável na Serra Gaúcha, com tipografia editorial, animações e experiência visual imersiva voltada ao público de alto padrão.",
      category: "Web",
      image: projectJardins,
      technologies: ["JavaScript", "CSS Animations", "WhatsApp API", "ESG"],
      url: "https://www.jardinsdonaisabel.com.br/",
      color: "from-stone-700 to-emerald-800",
    },
    {
      id: 5,
      title: "Kids2gether",
      description: "Portal de turismo familiar com destinos, dicas para viajar com crianças, eco-turismo e agência integrada — complementado por aplicativo mobile próprio.",
      category: "Web",
      image: projectKidstogether,
      technologies: ["React", "Node.js", "API REST", "App Mobile"],
      url: "https://www.kids2gether.com.br/",
      color: "from-teal-400 to-yellow-500",
    },
    {
      id: 6,
      title: "Meio do Mato Eventos",
      description: "Landing page para espaço de eventos rústico-chique na Ilha de Guaratiba (RJ), com galeria, depoimentos e formulário de orçamento integrado ao WhatsApp.",
      category: "Web",
      image: projectMeiodomato,
      technologies: ["Vite", "React", "Tailwind CSS", "WhatsApp API"],
      url: "https://lp.meiodomato.com.br/",
      color: "from-emerald-600 to-green-800",
    },
    {
      id: 2,
      title: "Baile 55",
      description: "Plataforma de ensino musical com cursos online de teoria e improvisação, integrada ao app ScaleClock para estudo de escalas. Suporte multilíngue e foco em conversão.",
      category: "Web",
      image: projectBaile55,
      technologies: ["WordPress", "Elementor", "JavaScript", "Multilíngue"],
      url: "https://baile55.com/",
      color: "from-pink-500 to-purple-600",
    },
    {
      id: 8,
      title: "Kids2gether",
      description: "Aplicativo mobile para famílias que viajam com crianças — destinos, dicas, novidades e roteiros familiares na palma da mão.",
      category: "App",
      image: appKids2gether,
      technologies: ["React Native", "iOS", "Android"],
      appStoreUrl: "https://apps.apple.com/br/app/kids2gether/id1554942484",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.kids2gether&hl=pt_BR",
      titleColor: "text-violet-400",
    },
    {
      id: 9,
      title: "Scaleclock",
      description: "App nº 1 em escalas musicais — visualização interativa de escalas, modos e tonalidades para músicos e estudantes de música.",
      category: "App",
      image: appScaleclock,
      technologies: ["React Native", "iOS", "Android"],
      appStoreUrl: "https://apps.apple.com/br/app/scaleclock/id1464221197",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.scaleclock&hl=pt_BR&gl=US",
      titleColor: "text-white",
    },
  ];

  const webProjects = projects.filter((p) => p.category === "Web");
  const appProjects = projects.filter((p) => p.category === "App");
  const showWeb = selectedFilter === "Todos" || selectedFilter === "Web";
  const showApps = selectedFilter === "Todos" || selectedFilter === "App";

  const webTotalPages = Math.max(1, Math.ceil(webProjects.length / WEB_PER_PAGE));
  const appTotalPages = Math.max(1, Math.ceil(appProjects.length / APP_PER_PAGE));
  const paginatedWebProjects = webProjects.slice(
    (webPage - 1) * WEB_PER_PAGE,
    webPage * WEB_PER_PAGE,
  );
  const paginatedAppProjects = appProjects.slice(
    (appPage - 1) * APP_PER_PAGE,
    appPage * APP_PER_PAGE,
  );

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="hero-text font-bold mb-6">
              Projetos
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance">
              Confira alguns projetos desenvolvidos pela Codifica que mostram nossa capacidade de transformar ideias em software.
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* Filter Buttons */}
          <div className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "default" : "outline"}
                onClick={() => handleFilterChange(filter)}
                className={`${
                  selectedFilter === filter 
                    ? "bg-gradient-primary text-primary-foreground shadow-lg scale-105 ring-2 ring-primary/20" 
                    : "btn-outline-glow hover:scale-105 hover:shadow-md"
                } group transition-all duration-300 transform relative overflow-hidden`}
              >
                {filter === "Todos" && <Filter className="w-4 h-4 mr-2" />}
                <span className="relative z-10">{filter}</span>
                {selectedFilter === filter && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse" />
                )}
              </Button>
            ))}
          </div>

          <div className={`transition-all duration-300 ease-in-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } ${isTransitioning ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100'}`}>
            {/* Web Projects Section */}
            {showWeb && (
              <div className="mb-20 scroll-mt-24" ref={webSectionRef}>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center text-foreground">
                  Sites e Landing Pages
                </h2>
                <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                  Presença digital sob medida para clientes de diversos segmentos.
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {paginatedWebProjects.map((project, index) => (
                    <Card
                      key={project.id}
                      className="card-hover bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden group h-full flex flex-col"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                            {project.category}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                          {project.title}
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {project.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {project.technologies.map((tech) => (
                            <Badge key={tech} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex gap-3 mt-auto">
                          <Button asChild size="sm" className="flex-1 bg-gradient-primary hover:bg-gradient-secondary">
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir site ${project.title} em nova aba`}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver Projeto
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {renderPagination(webPage, webTotalPages, setWebPage, webSectionRef)}
              </div>
            )}

            {/* App Projects Section */}
            {showApps && (
              <div className="scroll-mt-24" ref={appSectionRef}>
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center text-foreground">
                  Aplicativos Mobile
                </h2>
                <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                  Apps nativos publicados na App Store e Google Play.
                </p>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {paginatedAppProjects.map((project, index) => (
                    <Card
                      key={project.id}
                      className="card-hover overflow-hidden group bg-card/50 backdrop-blur-sm border border-border/50 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] rounded-3xl relative"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="relative p-8 flex flex-col items-center text-center">
                        {/* Phone Mockup */}
                        <div className="relative w-52 aspect-[9/19] bg-black rounded-[2.75rem] p-[6px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10 mb-7 group-hover:scale-[1.03] transition-transform duration-500">
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-10" />
                          <img
                            src={project.image}
                            alt={project.title}
                            className="w-full h-full object-cover rounded-[2.4rem]"
                          />
                        </div>

                        <h3 className={`text-2xl font-bold mb-3 ${project.titleColor || "text-white"}`}>
                          {project.title}
                        </h3>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed max-w-xs">
                          {project.description}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-7 justify-center">
                          {project.technologies.map((tech) => (
                            <Badge
                              key={tech}
                              variant="outline"
                              className="text-xs bg-transparent text-gray-300 border-gray-700 hover:bg-white/5 rounded-full px-3 py-1 font-normal"
                            >
                              {tech}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                          <Button
                            asChild
                            className="bg-white text-black hover:bg-gray-100 hover:text-black font-medium rounded-2xl h-12 w-full"
                          >
                            <a
                              href={project.appStoreUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Baixar ${project.title} na App Store`}
                            >
                              <FaApple className="w-5 h-5 mr-2" />
                              App Store
                            </a>
                          </Button>
                          <Button
                            asChild
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-2xl h-12 w-full"
                          >
                            <a
                              href={project.playStoreUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Baixar ${project.title} no Google Play`}
                            >
                              <FaGooglePlay className="w-5 h-5 mr-2" />
                              Google Play
                            </a>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                {renderPagination(appPage, appTotalPages, setAppPage, appSectionRef)}
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className={`text-center mt-16 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h3 className="text-2xl font-semibold mb-4 text-foreground">
              Gostou do que viu?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Vamos conversar sobre como podemos transformar sua ideia em realidade com soluções sob medida.
            </p>
            <Button 
              onClick={handleContactClick}
              className="bg-gradient-primary hover:bg-gradient-secondary text-primary-foreground font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Faça seu orçamento
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Portfolio;