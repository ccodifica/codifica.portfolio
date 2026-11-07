import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROTAS } from "@/config/rotas";
import { registrar } from "@/lib/metricas";
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
import { PROJETOS_APP, PROJETOS_WEB } from "@/config/projetos";
import { registrarCliqueProjeto, useProjetosOrdenados } from "@/lib/ordemProjetos";

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

  const filters = ["Todos", "Sites", "Sistemas", "Apps"];

  const webOrdenados = useProjetosOrdenados(PROJETOS_WEB);
  const appOrdenados = useProjetosOrdenados(PROJETOS_APP);
  const webProjects = webOrdenados.filter(
    (p) =>
      selectedFilter === "Todos" ||
      (selectedFilter === "Sites" && p.categoria === "Site") ||
      (selectedFilter === "Sistemas" && p.categoria === "Sistema")
  );
  const appProjects = appOrdenados;
  const showWeb = selectedFilter !== "Apps";
  const showApps = selectedFilter === "Todos" || selectedFilter === "Apps";

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
      <main>
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="hero-text font-bold mb-6">
              Projetos
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance">
              Sites, sistemas e aplicativos que já estão no ar, usados por clientes de verdade.
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
                  {selectedFilter === "Sites" ? "Sites" : selectedFilter === "Sistemas" ? "Sistemas" : "Sites e sistemas"}
                </h2>
                <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
                  Sites, plataformas de inscrição, ticketeria e gestão para clientes de vários segmentos.
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
                          src={project.imagem}
                          alt={project.titulo}
                          loading="lazy"
                          className="w-full h-48 object-cover object-top group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                            {project.categoria}
                          </Badge>
                        </div>
                        {project.parceria === "4tuna" && (
                          <div className="absolute bottom-3 left-3">
                            <Badge variant="secondary" className="bg-background/85 backdrop-blur-sm text-[11px] font-medium">
                              Em parceria com a 4tuna
                            </Badge>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                          {project.titulo}
                        </h3>
                        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                          {project.descricao}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {project.tags.map((tech) => (
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
                              aria-label={`Abrir ${project.titulo} em nova aba`}
                              onClick={() => registrarCliqueProjeto(project.id)}
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
                            src={project.imagem}
                            alt={project.titulo}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-[2.4rem]"
                          />
                        </div>

                        <h3 className={`text-2xl font-bold mb-3 ${project.corTitulo || "text-white"}`}>
                          {project.titulo}
                        </h3>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed max-w-xs">
                          {project.descricao}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-7 justify-center">
                          {project.tags.map((tech) => (
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
                              aria-label={`Baixar ${project.titulo} na App Store`}
                              onClick={() => registrarCliqueProjeto(project.id)}
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
                              aria-label={`Baixar ${project.titulo} no Google Play`}
                              onClick={() => registrarCliqueProjeto(project.id)}
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
              O seu negócio pode ser o próximo. Você vê uma prévia do seu site antes de pagar qualquer coisa.
            </p>
            <Button
              asChild
              className="bg-gradient-primary hover:bg-gradient-secondary text-primary-foreground font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Link to={ROTAS.produto} onClick={() => registrar("clique_comecar", "quero_meu_site_projetos")}>
                Quero meu site
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Precisa de um sistema?{" "}
              <button onClick={handleContactClick} className="text-primary hover:underline">
                Fale com a gente
              </button>
            </p>
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </div>
  );
};

export default Portfolio;
