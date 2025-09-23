import { useState } from "react";
import { 
  SiReact, 
  SiNodedotjs, 
  SiTypescript, 
  SiPython, 
  SiAmazon, 
  SiTailwindcss
} from "react-icons/si";
import { type IconType } from "react-icons";

interface TechItem {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: IconType;
}

const TechCarousel = () => {
  const [isPaused, setIsPaused] = useState(false);

  const technologies: TechItem[] = [
    {
      id: "react",
      name: "React",
      description: "Biblioteca para interfaces modernas",
      color: "from-blue-500/20 to-cyan-500/20",
      icon: SiReact
    },
    {
      id: "nodejs",
      name: "Node.js",
      description: "Runtime JavaScript para backend",
      color: "from-green-500/20 to-emerald-500/20",
      icon: SiNodedotjs
    },
    {
      id: "typescript",
      name: "TypeScript",
      description: "JavaScript com tipagem estática",
      color: "from-blue-600/20 to-indigo-500/20",
      icon: SiTypescript
    },
    {
      id: "python",
      name: "Python",
      description: "Linguagem versátil e poderosa",
      color: "from-yellow-500/20 to-orange-500/20",
      icon: SiPython
    },
    {
      id: "aws",
      name: "AWS",
      description: "Serviços de nuvem da Amazon",
      color: "from-orange-500/20 to-red-500/20",
      icon: SiAmazon
    },
    {
      id: "tailwind",
      name: "Tailwind CSS",
      description: "Framework CSS utility-first",
      color: "from-cyan-500/20 to-blue-500/20",
      icon: SiTailwindcss
    }
  ];

  return (
    <div className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden">
      {/* Gradient masks on edges */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-background to-transparent"></div>
        <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-background to-transparent"></div>
      </div>
      
      {/* Header */}
      <div className="container mx-auto px-4 mb-8">
        <h4 className="text-xl md:text-2xl font-semibold text-center">
          Tecnologias que dominamos
        </h4>
      </div>

      {/* Carousel Container */}
      <div 
        className="infinite-scroll-container py-6"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={`tech-scroll-track ${isPaused ? 'paused' : ''}`}>
          {/* Duplicating items to ensure seamless infinite scroll */}
          {Array.from({ length: 6 }).map((_, setIndex) =>
            technologies.map((tech, i) => (
              <div
                key={`set${setIndex}-${tech.id}-${i}`}
                className="tech-carousel-item flex-shrink-0"
              >
                <div className={`relative p-6 h-40 rounded-xl bg-gradient-to-br ${tech.color} border border-border/30 hover:shadow-lg hover:scale-105 transition-all duration-500 group cursor-pointer backdrop-blur-sm`}>
                  <div className="flex flex-col items-center justify-center text-center h-full">
                    {/* Tech Icon */}
                    <tech.icon 
                      className="text-4xl text-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300 mb-3 focus:outline-none" 
                      style={{ outline: 'none' }}
                    />
                    <h5 className="font-semibold text-base mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
                      {tech.name}
                    </h5>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300 leading-relaxed">
                      {tech.description}
                    </p>
                  </div>
                  
                  {/* Subtle floating animation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent rounded-xl pointer-events-none" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TechCarousel;