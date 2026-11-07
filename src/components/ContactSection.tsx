import { FormEvent, useEffect, useState } from "react";
import { ENDERECO, linkWhatsapp } from "@/config/oferta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { registrar } from "@/lib/metricas";

// WhatsApp SVG Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.687" />
  </svg>
);

const ASSUNTOS = [
  { id: "duvida", rotulo: "Tirar uma dúvida", abertura: "Queria tirar uma dúvida." },
  { id: "sistema", rotulo: "Sistema sob medida", abertura: "Queria conversar sobre um sistema sob medida." },
  { id: "outro", rotulo: "Outro assunto", abertura: "Queria falar com a Codifica." },
] as const;

/**
 * "Fale conosco": tudo vai para o WhatsApp, com a mensagem já escrita.
 * E-mail é canal frio para quem está decidindo; a conversa acontece no WhatsApp.
 */
const ContactSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [nome, setNome] = useState("");
  const [assunto, setAssunto] = useState<(typeof ASSUNTOS)[number]["id"]>("duvida");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setIsVisible(true), { threshold: 0.1 });
    const section = document.getElementById("contact");
    if (section) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const mensagem = () => {
    const a = ASSUNTOS.find((x) => x.id === assunto)!;
    return [`Olá!${nome.trim() ? ` Sou ${nome.trim()}.` : ""} ${a.abertura}`, descricao.trim() ? `\n\n${descricao.trim()}` : ""].join("");
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    registrar("clique_whatsapp", `contato_${assunto}`);
    window.open(linkWhatsapp(mensagem()), "_blank", "noopener");
  };

  return (
    <section id="contact" className="py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h2 className="hero-text font-bold mb-6">Fale conosco</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
            Tem uma dúvida ou precisa de um sistema sob medida? Fale direto com quem desenvolve, pelo WhatsApp.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Orçamento */}
          <div className={`transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-2">Mande sua mensagem</h3>
                <p className="text-muted-foreground mb-6">Preencha e a mensagem já abre pronta no WhatsApp.</p>

                <form onSubmit={enviar} className="space-y-6">
                  <div>
                    <label htmlFor="contato-nome" className="block text-sm font-medium text-foreground mb-2">
                      Seu nome
                    </label>
                    <Input id="contato-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar" />
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-medium text-foreground mb-2">Sobre o que você quer falar?</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ASSUNTOS.map((a) => (
                        <button
                          type="button"
                          key={a.id}
                          onClick={() => setAssunto(a.id)}
                          aria-pressed={assunto === a.id}
                          className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                            assunto === a.id ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {a.rotulo}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="contato-descricao" className="block text-sm font-medium text-foreground mb-2">
                      Sua mensagem <span className="text-muted-foreground font-normal">(opcional)</span>
                    </label>
                    <Textarea
                      id="contato-descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder={assunto === "sistema" ? "O que o sistema precisa fazer? Ex.: agenda online, pagamentos, área do cliente" : "Escreva aqui"}
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full rounded-xl font-semibold bg-[#25D366] hover:bg-[#1ebe5a] text-white">
                    <WhatsAppIcon className="w-5 h-5 mr-2" />
                    Enviar pelo WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Onde estamos */}
          <div className={`transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full overflow-hidden flex flex-col">
              <div className="relative flex-1 min-h-[280px]">
                <iframe
                  title="Mapa: endereço da Codifica"
                  src={ENDERECO.mapa}
                  className="absolute inset-0 w-full h-full border-0 grayscale-[30%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold text-foreground">{ENDERECO.linha1}</p>
                    <p className="text-muted-foreground">{ENDERECO.linha2}</p>
                    <a
                      href={ENDERECO.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                    >
                      Abrir no Google Maps <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    </a>
                  </div>
                </div>
                <a
                  href={linkWhatsapp("Olá! Gostaria de falar com a Codifica.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => registrar("clique_whatsapp", "contato_direto")}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                    <span>
                      <span className="block font-semibold text-foreground">(21) 96894-7527</span>
                      <span className="block text-sm text-muted-foreground">Chamar no WhatsApp</span>
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
