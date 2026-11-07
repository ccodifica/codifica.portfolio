import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Secao } from "@/components/oferta/Base";
import { PROJETOS } from "@/config/projetos";
import { registrarCliqueProjeto, useProjetosOrdenados } from "@/lib/ordemProjetos";

const POR_VEZ = 6;

/** "Projetos que já fizemos": mais clicados primeiro, 6 por vez com "Ver mais". */
const ProjetosFeitos = () => {
  const ordenados = useProjetosOrdenados(PROJETOS);
  const [mostrando, setMostrando] = useState(POR_VEZ);
  const visiveis = ordenados.slice(0, mostrando);
  const restam = ordenados.length - mostrando;

  return (
    <Secao titulo="Projetos que já fizemos" subtitulo="Sites, sistemas e aplicativos no ar, usados por clientes de verdade.">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {visiveis.map((p) => (
          <a
            key={p.id}
            href={p.url || p.appStoreUrl || "/portfolio"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => registrarCliqueProjeto(p.id)}
            className="group rounded-2xl overflow-hidden border border-border bg-card/70 hover:border-primary/50 transition-colors"
          >
            <div className="relative">
              <img
                src={p.imagem}
                alt={p.titulo}
                loading="lazy"
                className={`w-full aspect-[16/10] ${p.categoria === "App" ? "object-contain bg-black/40 py-2" : "object-cover object-top"}`}
              />
              <span className="absolute top-2 right-2 text-[11px] font-medium rounded-full bg-background/85 px-2 py-0.5">
                {p.categoria}
              </span>
            </div>
            <div className="p-3">
              <p className="font-medium text-foreground group-hover:text-primary transition-colors text-sm md:text-base">{p.titulo}</p>
              {p.parceria === "4tuna" && <p className="text-[11px] text-muted-foreground">Em parceria com a 4tuna</p>}
            </div>
          </a>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        {restam > 0 && (
          <Button variant="outline" className="rounded-xl" onClick={() => setMostrando((m) => m + POR_VEZ)}>
            Ver mais projetos <ChevronDown className="w-4 h-4 ml-1.5" aria-hidden />
          </Button>
        )}
        <Button asChild variant="ghost" className="rounded-xl text-muted-foreground">
          <Link to="/portfolio">
            Ver todos com detalhes <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </Secao>
  );
};

export default ProjetosFeitos;
