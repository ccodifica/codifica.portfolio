import { Linkedin, MapPin } from "lucide-react";
import { Secao, Cartao } from "@/components/oferta/Base";
import { EQUIPE } from "@/config/oferta";
import fotoGustavo from "@/assets/fundador-gustavo.jpg";
import fotoPedro from "@/assets/fundador-pedro.jpg";

const FOTOS = { gustavo: fotoGustavo, pedro: fotoPedro };

/** "Quem faz o seu site": gente de verdade, sem depoimento inventado. */
const Equipe = () => (
  <Secao titulo="Quem faz o seu site">
    <div className="grid sm:grid-cols-2 gap-4">
      {EQUIPE.map((p) => (
        <Cartao key={p.nome} className="p-5 md:p-6 flex items-center gap-4">
          <img
            src={FOTOS[p.foto]}
            alt={`Foto de ${p.nome}`}
            loading="lazy"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-primary/40 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg text-foreground">{p.nome}</p>
            <p className="text-sm text-muted-foreground">{p.formacao}</p>
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden /> Rio de Janeiro
            </p>
          </div>
          {p.linkedin && (
            <a
              href={p.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`LinkedIn de ${p.nome}`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary transition-colors shrink-0"
            >
              <Linkedin className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
          )}
        </Cartao>
      ))}
    </div>
    <p className="text-muted-foreground mt-4">Você fala direto com quem desenvolve o site, sem intermediário.</p>
  </Secao>
);

export default Equipe;
