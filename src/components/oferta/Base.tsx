import { ReactNode, useEffect } from "react";
import { Check, X, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { linkWhatsapp } from "@/config/oferta";
import { EventoSite, registrar } from "@/lib/metricas";

export const PaginaOferta = ({ children, evento }: { children: ReactNode; evento?: EventoSite }) => {
  useEffect(() => {
    if (evento) registrar(evento);
  }, [evento]);
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-20">{children}</main>
      <Footer />
    </div>
  );
};

export const Secao = ({
  titulo,
  subtitulo,
  children,
  className = "",
  id,
}: {
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) => (
  <section id={id} className={`container mx-auto px-4 max-w-5xl py-10 md:py-14 ${className}`}>
    {titulo && (
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-manrope font-bold text-foreground mb-3">{titulo}</h2>
    )}
    {subtitulo && <p className="text-muted-foreground text-lg mb-8 max-w-2xl">{subtitulo}</p>}
    {children}
  </section>
);

export const ListaCheck = ({ itens, negativo = false }: { itens: string[]; negativo?: boolean }) => (
  <ul className="space-y-3">
    {itens.map((item) => (
      <li key={item} className="flex gap-3 text-foreground/90">
        {negativo ? (
          <X className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Check className="w-5 h-5 mt-0.5 shrink-0 text-success" aria-hidden />
        )}
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export const Cartao = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border bg-card/70 p-6 md:p-8 ${className}`}>{children}</div>
);

/** Selo da Black Friday: amarelo/laranja para contrastar com o roxo do site, mesmo tamanho dos outros selos. */
export const SeloBlackFriday = ({ className = "" }: { className?: string }) => (
  <span
    className={`relative inline-flex items-center overflow-hidden rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-black shadow-[0_0_18px_rgba(251,191,36,0.45)] ${className}`}
  >
    <span className="relative z-10">Black Friday</span>
    <span aria-hidden className="absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-white/50 animate-[brilho-bf_2.8s_ease-in-out_infinite]" />
  </span>
);

export const BotaoWhatsapp = ({
  mensagem,
  children = "Falar no WhatsApp",
  variante = "outline",
  className = "",
}: {
  mensagem: string;
  children?: ReactNode;
  variante?: "outline" | "default";
  className?: string;
}) => (
  <Button asChild variant={variante} className={`rounded-xl ${className}`}>
    <a
      href={linkWhatsapp(mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrar("clique_whatsapp")}
    >
      <MessageCircle className="w-4 h-4 mr-2" aria-hidden />
      {children}
    </a>
  </Button>
);
