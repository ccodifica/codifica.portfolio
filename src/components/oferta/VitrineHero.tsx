import { Clock, Globe, Lock, Navigation, Phone, Search } from "lucide-react";
import siteWeb from "@/assets/vitrine-helena-web.webp";
import siteCelular from "@/assets/vitrine-helena-cel.webp";
import foto1 from "@/assets/vitrine-helena-foto1.webp";
import foto2 from "@/assets/vitrine-helena-foto2.webp";
import foto3 from "@/assets/vitrine-helena-foto3.webp";

/**
 * Prova visual do topo da oferta, com o exemplo fictício do vídeo (Dra. Helena
 * Prado, dermatologista): a busca no Google com o Perfil completo, e o site no
 * computador e no celular. O site de exemplo foi montado como página de verdade
 * (fotos geradas por IA) e fotografado com o Playwright. Sem nota ou avaliação
 * inventada; identificado como exemplo na legenda.
 */
const VitrineHero = () => (
  <figure className="relative mx-auto w-full max-w-[600px] pb-6 select-none">
    <div className="absolute -inset-6 rounded-full bg-primary/20 blur-3xl" aria-hidden />

    {/* Site no computador */}
    <div className="relative rounded-xl border border-white/10 bg-[#1c1c21] shadow-2xl overflow-hidden ml-[10%] mr-[6%]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5" aria-hidden>
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-2 flex-1 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-[10px] text-white/50 truncate">
          <Lock className="w-2.5 h-2.5 shrink-0" />
          drahelenaprado.com.br
        </div>
      </div>
      <img src={siteWeb} alt="Site de exemplo de uma dermatologista, no computador" width={1200} height={750} className="block w-full h-auto" fetchPriority="high" />
    </div>

    {/* Site no celular (posicionado em relação à janela do computador) */}
    <div className="absolute right-0 top-[8%] sm:top-[30%] w-[27%] rounded-[1.4rem] border-[4px] border-[#26262c] bg-[#26262c] shadow-2xl overflow-hidden z-20">
      <img src={siteCelular} alt="O mesmo site no celular" width={480} height={817} className="block w-full h-auto rounded-[1.05rem]" fetchPriority="high" />
    </div>

    {/* Busca no Google + Perfil da Empresa */}
    <div
      className="relative z-10 -mt-[14%] w-[66%] sm:absolute sm:left-0 sm:top-[46%] sm:mt-0 sm:w-[54%] rounded-2xl border border-white/10 bg-[#202124] shadow-2xl p-3 sm:p-3.5 text-left"
      aria-hidden
    >
      <div className="flex items-center gap-2 rounded-full bg-[#303134] px-3 py-1.5 mb-3 text-[11px] sm:text-xs text-white/85">
        <Search className="w-3 h-3 text-white/60 shrink-0" />
        <span className="truncate">dermatologista em botafogo</span>
      </div>
      <p className="text-[13px] sm:text-sm font-semibold text-white leading-tight">Dra. Helena Prado · Dermatologia</p>
      <p className="text-[10.5px] sm:text-[11px] text-white/60 mb-1.5">Dermatologista em Botafogo, Rio de Janeiro</p>
      <p className="text-[10.5px] sm:text-[11px] mb-2.5 flex items-center gap-1">
        <Clock className="w-3 h-3 text-white/50" />
        <span className="text-[#81c995] font-medium">Aberto</span>
        <span className="text-white/60">· Fecha às 18:00</span>
      </p>
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        {[foto1, foto2, foto3].map((f) => (
          <img key={f} src={f} alt="" width={200} height={200} className="w-full aspect-square object-cover rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { icone: Globe, rotulo: "Site" },
          { icone: Navigation, rotulo: "Rotas" },
          { icone: Phone, rotulo: "Ligar" },
        ].map(({ icone: Icone, rotulo }) => (
          <div key={rotulo} className="flex items-center justify-center gap-1 rounded-full border border-white/15 py-1">
            <Icone className="w-3 h-3 text-[#8ab4f8]" />
            <span className="text-[10px] sm:text-[11px] text-[#8ab4f8]">{rotulo}</span>
          </div>
        ))}
      </div>
    </div>

    <figcaption className="relative mt-4 sm:mt-[44%] text-xs text-muted-foreground text-center">
      Exemplo do que você recebe: o site no computador e no celular, e o Perfil do Google completo
    </figcaption>
  </figure>
);

export default VitrineHero;
