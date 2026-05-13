import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const RecuperarSenha = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setEnviando(true);
    try {
      await requestPasswordReset(email);
      setEnviado(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível enviar.";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                <KeyRound className="w-4 h-4" />
                Recuperar acesso
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 font-manrope">
                Esqueci minha senha
              </h1>
              <p className="text-muted-foreground">
                Informe o e-mail cadastrado e enviaremos as instruções para
                redefinir sua senha.
              </p>
            </div>

            {enviado ? (
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <h2 className="text-xl font-bold mb-2">Pronto!</h2>
                <p className="text-muted-foreground mb-6">
                  Se houver uma conta com esse e-mail, você receberá um link
                  para redefinir sua senha em instantes.
                </p>
                <Link to="/espaco-do-cliente/login">
                  <Button variant="outline" className="w-full">
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-6 md:p-8 space-y-5"
              >
                <div>
                  <Label htmlFor="email">E-mail cadastrado</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-2"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar instruções"
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Lembrou da senha?{" "}
                  <Link
                    to="/espaco-do-cliente/login"
                    className="text-primary hover:underline font-medium"
                  >
                    Voltar ao login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RecuperarSenha;
