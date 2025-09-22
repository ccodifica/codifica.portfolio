import { useEffect, useState } from "react";

const ClientsSection = () => {
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

    const section = document.getElementById('clients');
    if (section) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const clients = [
    { name: "TechCorp", logo: "TC" },
    { name: "InnovaSoft", logo: "IS" },
    { name: "DigitalPlus", logo: "DP" },
    { name: "CloudSystem", logo: "CS" },
    { name: "DataFlow", logo: "DF" },
    { name: "NextGen", logo: "NG" },
  ];

  return (
    <section id="clients" className="py-16 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h3 className="text-2xl font-semibold text-foreground mb-4">
            Confiado por empresas inovadoras
          </h3>
          <p className="text-muted-foreground">
            Alguns dos nossos clientes que já transformaram seus negócios
          </p>
        </div>

        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {clients.map((client, index) => (
            <div 
              key={index}
              className="flex items-center justify-center p-6 rounded-lg bg-card/30 backdrop-blur-sm border border-border/30 hover:bg-card/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg group-hover:scale-110 transition-transform duration-300">
                {client.logo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;