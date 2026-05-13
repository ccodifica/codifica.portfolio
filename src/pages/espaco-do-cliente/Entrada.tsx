import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LogIn, FileText, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Entrada = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      navigate(
        user.role === "admin"
          ? "/espaco-do-cliente/admin"
          : "/espaco-do-cliente/painel",
        { replace: true }
      );
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-manrope mb-6 text-balance">
              Vamos começar?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Você já é cliente Codifica ou está chegando agora para tirar uma
              ideia do papel?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Link to="/espaco-do-cliente/questionario" className="group">
              <div className="h-full p-8 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:bg-card/80 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-primary/10">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mb-5 group-hover:bg-primary/25 transition-colors">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  Sou novo por aqui
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Conte sobre seu projeto em um passo a passo guiado. No final
                  você cria sua conta e acompanha tudo pelo painel.
                </p>
                <div className="flex items-center text-primary font-semibold">
                  Iniciar briefing
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            <Link to="/espaco-do-cliente/login" className="group">
              <div className="h-full p-8 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-accent/50 hover:bg-card/80 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-accent/10">
                <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center mb-5 group-hover:bg-accent/25 transition-colors">
                  <LogIn className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-2xl font-bold mb-3 group-hover:text-accent transition-colors">
                  Já sou cliente
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Entre com seu e-mail e senha para acompanhar o andamento do
                  seu projeto e trocar mensagens com a nossa equipe.
                </p>
                <div className="flex items-center text-accent font-semibold">
                  Acessar minha conta
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-12 text-center text-sm text-muted-foreground">
            Em caso de dúvidas, fale com a gente pelo{" "}
            <Link
              to="/"
              state={{ target: "contact" }}
              className="text-primary hover:underline"
            >
              formulário de contato
            </Link>
            .
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Entrada;
