import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LayoutDashboard, Loader2, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PaginaOferta, Secao, Cartao, BotaoWhatsapp } from "@/components/oferta/Base";
import { useAuth } from "@/contexts/AuthContext";
import { ROTAS } from "@/config/rotas";

/** Login sem senha: e-mail → código de 6 dígitos → dentro. */
const Entrar = () => {
  const { user, isLoading, enviarCodigo, entrarComCodigo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from;

  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [reenviarEm, setReenviarEm] = useState(0);

  // Já logado: cliente vai direto; admin escolhe se entra no painel ou como cliente (para testar)
  useEffect(() => {
    if (isLoading || !user) return;
    if (destino) navigate(destino, { replace: true });
    else if (user.role !== "admin") navigate(ROTAS.minhaArea, { replace: true });
  }, [user, isLoading, navigate, destino]);

  useEffect(() => {
    if (reenviarEm <= 0) return;
    const t = setTimeout(() => setReenviarEm((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenviarEm]);

  const pedirCodigo = async (e?: FormEvent) => {
    e?.preventDefault();
    setErro("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErro("Confira o e-mail.");
      return;
    }
    setEnviando(true);
    try {
      await enviarCodigo(email);
      setEtapa("codigo");
      setCodigo("");
      setReenviarEm(60);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const conferir = async (valor = codigo) => {
    if (valor.length !== 6) return;
    setErro("");
    setEnviando(true);
    try {
      const u = await entrarComCodigo(email, valor);
      if (destino) navigate(destino, { replace: true });
      else if (u.role !== "admin") navigate(ROTAS.minhaArea, { replace: true });
      // admin: o useEffect não redireciona e a tela mostra a escolha
    } catch (err) {
      setErro((err as Error).message);
      setCodigo("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PaginaOferta>
      <Secao className="max-w-md pt-6 md:pt-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Área do cliente</h1>
        <p className="text-muted-foreground mb-8">
          Entre com o e-mail que você usou no pedido. Sem senha: mandamos um código.
        </p>

        {user?.role === "admin" && !destino ? (
          <Cartao>
            <h2 className="text-xl font-semibold mb-1">Como você quer entrar?</h2>
            <p className="text-muted-foreground mb-6">{user.email} é da equipe Codifica.</p>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full rounded-xl font-semibold justify-between">
                <Link to={ROTAS.admin} replace>
                  <span className="inline-flex items-center">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Painel da Codifica
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-xl font-semibold justify-between">
                <Link to={ROTAS.minhaArea} replace>
                  <span className="inline-flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" /> Área do cliente (ver como cliente)
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Na área do cliente aparecem os pedidos feitos com este e-mail. Dá para trocar depois pelo menu da sua conta.
            </p>
          </Cartao>
        ) : (
        <Cartao>
          {etapa === "email" ? (
            <form onSubmit={pedirCodigo} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="entrar-email" className="text-base">
                  E-mail
                </Label>
                <Input
                  id="entrar-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" disabled={enviando} className="w-full rounded-xl font-semibold">
                {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Receber código
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <p className="text-foreground/90">
                Mandamos um código de 6 dígitos para <strong>{email.trim().toLowerCase()}</strong>. Confira também a
                caixa de spam.
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={codigo}
                  autoFocus
                  inputMode="numeric"
                  onChange={(v) => {
                    const so = v.replace(/\D/g, "");
                    setCodigo(so);
                    if (so.length === 6) conferir(so);
                  }}
                  aria-label="Código de 6 dígitos"
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                size="lg"
                disabled={enviando || codigo.length !== 6}
                className="w-full rounded-xl font-semibold"
                onClick={() => conferir()}
              >
                {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Entrar
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEtapa("email");
                    setErro("");
                  }}
                >
                  <ArrowLeft className="w-4 h-4" /> Trocar e-mail
                </button>
                <button
                  className="text-primary disabled:text-muted-foreground"
                  disabled={reenviarEm > 0 || enviando}
                  onClick={() => pedirCodigo()}
                >
                  {reenviarEm > 0 ? `Reenviar em ${reenviarEm}s` : "Reenviar código"}
                </button>
              </div>
            </div>
          )}
          {erro && (
            <p role="alert" className="text-destructive mt-4">
              {erro}
            </p>
          )}
        </Cartao>
        )}

        <div className="mt-8 space-y-3 text-sm text-muted-foreground">
          <p>
            Ainda não é cliente?{" "}
            <Link to="/comecar" className="text-primary hover:underline">
              Peça a prévia grátis do seu site
            </Link>
            .
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span>Não recebeu o código ou mudou de e-mail?</span>
            <BotaoWhatsapp mensagem="Oi! Estou com problema para entrar na área do cliente da Codifica." className="h-8 px-3 text-xs">
              Chamar no WhatsApp
            </BotaoWhatsapp>
          </div>
        </div>
      </Secao>
    </PaginaOferta>
  );
};

export default Entrar;
