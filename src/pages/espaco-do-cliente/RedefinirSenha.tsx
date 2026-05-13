import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

type Status = "verificando" | "pronto" | "expirado";

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verificando");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setStatus(data.session ? "pronto" : "expirado");
    };
    checar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setStatus("pronto");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== repetir) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setConcluido(true);
      toast.success("Senha redefinida com sucesso.");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/espaco-do-cliente/login", { replace: true }), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao redefinir senha.";
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
              <h1 className="text-3xl md:text-4xl font-bold mb-3 font-manrope">
                Redefinir senha
              </h1>
              <p className="text-muted-foreground">
                Crie uma nova senha para sua conta.
              </p>
            </div>

            {status === "verificando" && (
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-8 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Verificando link...</p>
              </div>
            )}

            {status === "expirado" && (
              <div className="bg-card/50 backdrop-blur-sm border border-destructive/30 rounded-2xl p-8 text-center">
                <h2 className="text-lg font-bold mb-2">Link expirado ou inválido</h2>
                <p className="text-muted-foreground mb-5">
                  Solicite um novo link de recuperação e clique em até 1 hora.
                </p>
                <Link to="/espaco-do-cliente/recuperar-senha">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Solicitar novo link
                  </Button>
                </Link>
              </div>
            )}

            {status === "pronto" && !concluido && (
              <form
                onSubmit={handleSubmit}
                className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-6 md:p-8 space-y-5"
              >
                <div>
                  <Label htmlFor="senha">Nova senha</Label>
                  <div className="relative mt-2">
                    <Input
                      id="senha"
                      type={mostrar ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrar((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="repetir">Repetir nova senha</Label>
                  <Input
                    id="repetir"
                    type={mostrar ? "text" : "password"}
                    value={repetir}
                    onChange={(e) => setRepetir(e.target.value)}
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
                      Salvando...
                    </>
                  ) : (
                    "Salvar nova senha"
                  )}
                </Button>
              </form>
            )}

            {concluido && (
              <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <h2 className="text-lg font-bold mb-2">Senha redefinida</h2>
                <p className="text-muted-foreground">
                  Redirecionando para o login...
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RedefinirSenha;
