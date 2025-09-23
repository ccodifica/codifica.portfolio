import { useEffect, useState } from "react";
import { Users, Target, Award, Code2 } from "lucide-react";

const Sobre = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { icon: Users, value: "50+", label: "Projetos Entregues" },
    { icon: Target, value: "100%", label: "Satisfação do Cliente" },
    { icon: Award, value: "5+", label: "Anos de Experiência" },
    { icon: Code2, value: "24/7", label: "Suporte Técnico" },
  ];

  const values = [
    {
      title: "Inovação",
      description:
        "Utilizamos as tecnologias mais modernas para criar soluções que fazem a diferença no mercado.",
    },
    {
      title: "Qualidade",
      description:
        "Cada linha de código é cuidadosamente pensada para entregar o melhor resultado possível.",
    },
    {
      title: "Parceria",
      description:
        "Trabalhamos lado a lado com nossos clientes, construindo relacionamentos duradouros.",
    },
    {
      title: "Agilidade",
      description:
        "Metodologias ágeis que garantem entregas rápidas sem comprometer a qualidade.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
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

      {/* Stats Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-background/50 border border-border/50 hover:border-primary/50 transition-all duration-300"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <div className="text-3xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
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

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-primary">
                Quem Somos
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Somos uma equipe apaixonada por tecnologia e inovação, com anos
                de experiência no desenvolvimento de soluções digitais para
                empresas de todos os portes. Nossa expertise abrange desde
                aplicações web modernas até sistemas complexos de gestão
                empresarial.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Trabalhamos com as tecnologias mais avançadas do mercado, sempre
                buscando entregar soluções que sejam não apenas funcionais, mas
                também escaláveis, seguras e de fácil manutenção.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border border-border/50">
              <h4 className="text-xl font-semibold mb-4">
                Tecnologias que dominamos:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>React & Next.js</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Node.js & Express</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>TypeScript</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Python & Django</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>PostgreSQL & MongoDB</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>AWS & Docker</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-manrope mb-6">
              Nossos Valores
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Os princípios que guiam nosso trabalho e definem nossa cultura
              organizacional.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center p-8 rounded-xl bg-background/50 border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-primary mb-4">
                  {value.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
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
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Fale Conosco
              </button>
              <button className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium px-6 py-3 rounded-lg transition-all duration-300">
                Ver Portfólio
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
