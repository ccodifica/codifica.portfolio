import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, Filter } from "lucide-react";
import projectEcommerce from "@/assets/project-ecommerce.jpg";
import projectDelivery from "@/assets/project-delivery.jpg";
import projectErp from "@/assets/project-erp.jpg";

const Portfolio = () => {
  const [selectedFilter, setSelectedFilter] = useState("Todos");
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

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
        setIsTransitioning(false);
      }, 200);
    }
  };

  const filters = ["Todos", "Web", "Mobile", "Sistemas"];

  const projects = [
    {
      id: 1,
      title: "E-commerce Moderno",
      description: "Plataforma completa de vendas online com painel administrativo e integração com gateways de pagamento.",
      category: "Web",
      image: projectEcommerce,
      technologies: ["React", "Node.js", "PostgreSQL", "Stripe"],
      color: "from-blue-500 to-purple-600",
    },
    {
      id: 2,
      title: "App de Delivery",
      description: "Aplicativo móvel para delivery de comida com rastreamento em tempo real e sistema de avaliações.",
      category: "Mobile",
      image: projectDelivery,
      technologies: ["React Native", "Firebase", "Maps API"],
      color: "from-green-500 to-teal-600",
    },
    {
      id: 3,
      title: "Sistema de Gestão",
      description: "ERP completo para gestão empresarial com módulos de vendas, estoque, financeiro e relatórios.",
      category: "Sistemas",
      image: projectErp,
      technologies: ["Vue.js", "Laravel", "MySQL", "Charts.js"],
      color: "from-orange-500 to-red-600",
    },
    {
      id: 4,
      title: "Portal Educacional",
      description: "Plataforma de ensino à distância com videoaulas, exercícios interativos e acompanhamento de progresso.",
      category: "Web",
      image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&h=400&fit=crop",
      technologies: ["Angular", "Python", "Django", "WebRTC"],
      color: "from-purple-500 to-pink-600",
    },
    {
      id: 5,
      title: "App Fitness",
      description: "Aplicativo de treinos personalizados com acompanhamento nutricional e gamificação.",
      category: "Mobile",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
      technologies: ["Flutter", "Firebase", "HealthKit"],
      color: "from-cyan-500 to-blue-600",
    },
    {
      id: 6,
      title: "Dashboard Analytics",
      description: "Sistema de business intelligence com visualizações interativas e relatórios em tempo real.",
      category: "Sistemas",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
      technologies: ["React", "D3.js", "Python", "Redis"],
      color: "from-indigo-500 to-purple-600",
    },
  ];

  const filteredProjects = selectedFilter === "Todos" 
    ? projects 
    : projects.filter(project => project.category === selectedFilter);

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

          {/* Projects Grid */}
          <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          } ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
            {filteredProjects.map((project, index) => (
              <Card 
                key={project.id} 
                className="card-hover bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Project Image */}
                <div className="relative overflow-hidden">
                  {/* Removido overlay de cor para exibir imagem original */}
                  <div className="hidden" />
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

                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {project.description}
                  </p>

                  {/* Technologies */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button size="sm" className="flex-1 bg-gradient-primary hover:bg-gradient-secondary">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver Projeto
                    </Button>
                    <Button size="sm" variant="outline" className="btn-outline-glow">
                      <Github className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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