import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const fromPath =
    (location.state as { from?: string } | null)?.from ?? null;

  // Já autenticado → manda direto pro destino (sem ficar preso na tela)
  useEffect(() => {
    if (isLoading || !user) return;
    const destino =
      fromPath ??
      (user.role === "admin"
        ? "/espaco-do-cliente/admin"
        : "/espaco-do-cliente/painel");
    navigate(destino, { replace: true });
  }, [user, isLoading, fromPath, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Lê direto dos inputs do DOM — protege contra Chrome autofill
    // que às vezes preenche o campo sem disparar onChange no React
    const form = e.currentTarget;
    const emailField = form.elements.namedItem("email") as HTMLInputElement | null;
    const senhaField = form.elements.namedItem("senha") as HTMLInputElement | null;
    const emailFinal = (emailField?.value ?? email).trim();
    const senhaFinal = senhaField?.value ?? senha;

    if (!emailFinal || !senhaFinal) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setEnviando(true);
    try {
      const user = await login(emailFinal, senhaFinal);
      const destino =
        fromPath ??
        (user.role === "admin"
          ? "/espaco-do-cliente/admin"
          : "/espaco-do-cliente/painel");
      navigate(destino, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar.";
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
                Acessar minha conta
              </h1>
              <p className="text-muted-foreground">
                Entre para acompanhar o andamento do seu projeto.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-6 md:p-8 space-y-5"
            >
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  placeholder="seu@email.com"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Link
                    to="/espaco-do-cliente/recuperar-senha"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="senha"
                    name="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onInput={(e) => setSenha((e.target as HTMLInputElement).value)}
                    placeholder="Sua senha"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link
                to="/espaco-do-cliente/questionario"
                className="text-primary hover:underline font-medium"
              >
                Começar briefing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
