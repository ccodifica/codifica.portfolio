import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Laptop, Smartphone, Database, Cloud, Shield, Zap } from "lucide-react";

const ServicesSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const section = document.getElementById('services');
    if (section) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const services = [
    {
      icon: Laptop,
      title: "Desenvolvimento sob medida",
      description: "Criamos soluções personalizadas que atendem exatamente às necessidades do seu negócio.",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Database,
      title: "Integrações inteligentes",
      description: "Conectamos seus sistemas existentes para otimizar processos e aumentar a eficiência.",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      icon: Cloud,
      title: "Escalabilidade e inovação",
      description: "Desenvolvemos com tecnologias modernas que crescem junto com sua empresa.",
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const features = [
    {
      icon: Smartphone,
      title: "Apps Mobile",
      description: "Aplicativos nativos e híbridos para iOS e Android",
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Implementamos as melhores práticas de segurança",
    },
    {
      icon: Zap,
      title: "Performance",
      description: "Otimização para máxima velocidade e eficiência",
    },
  ];

  return (
    <section id="services" className="py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="hero-text font-bold mb-6">
            Por que escolher a Codifica?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Combinamos expertise técnica com visão estratégica para entregar soluções que realmente fazem a diferença no seu negócio.
          </p>
        </div>

        {/* Main Services Grid */}
        <div className={`grid md:grid-cols-3 gap-8 mb-20 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {services.map((service, index) => (
            <Card key={index} className="card-hover bg-card/50 backdrop-blur-sm border-border/50 group">
              <CardContent className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full ${service.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className={`w-8 h-8 ${service.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-foreground">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className={`grid md:grid-cols-3 gap-6 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-4 p-6 rounded-xl bg-card/30 backdrop-blur-sm border border-border/30 hover:bg-card/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;