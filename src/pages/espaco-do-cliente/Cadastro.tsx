import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  clearDraftQuestionnaire,
  createMeeting,
  createProject,
  getDraftQuestionnaire,
} from "@/lib/client-area-store";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { emailService } from "@/services/emailService";
import {
  PROJECT_TYPE_LABEL,
  QuestionnaireData,
} from "@/types/client-area";
import { formatDataBR } from "./_shared";

const Cadastro = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [draft, setDraft] = useState<QuestionnaireData | null>(null);
  const [email, setEmail] = useState("");
  const [celular, setCelular] = useState("");
  const [senha, setSenha] = useState("");
  const [repetirSenha, setRepetirSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const d = getDraftQuestionnaire();
    if (!d) {
      toast.error("Preencha o briefing primeiro.");
      navigate("/espaco-do-cliente/questionario", { replace: true });
      return;
    }
    setDraft(d);
    setEmail(d.email);
    setCelular(d.celular);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!celular.trim()) {
      toast.error("Informe seu celular.");
      return;
    }
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== repetirSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!aceitouTermos) {
      toast.error("É preciso aceitar os termos para continuar.");
      return;
    }

    setEnviando(true);
    try {
      const user = await register({
        nome: draft.nome,
        email,
        celular,
        senha,
        empresa: draft.empresa,
        cargo: draft.cargo,
        ramo: draft.ramo,
      });

      const projeto = await createProject({
        clienteId: user.id,
        briefing: { ...draft, email, celular },
      });

      if (
        draft.reuniao.quer &&
        draft.reuniao.data &&
        draft.reuniao.horario
      ) {
        await createMeeting({
          projectId: projeto.id,
          clienteId: user.id,
          data: draft.reuniao.data,
          horario: draft.reuniao.horario,
          topico: draft.reuniao.topico ?? "",
          notificarEmail: draft.reuniao.notificarEmail,
          notificarWhatsapp: draft.reuniao.notificarWhatsapp,
        });

        if (draft.reuniao.notificarEmail) {
          emailService
            .sendMeetingScheduled({
              toEmail: email,
              toName: draft.nome,
              meetingDate: formatDataBR(draft.reuniao.data),
              meetingTime: draft.reuniao.horario,
              meetingTopic: draft.reuniao.topico ?? "",
              projectName: projeto.nome,
            })
            .catch((err) =>
              console.warn("Falha ao enviar e-mail de reunião:", err)
            );
        }
      }

      // Notificação para o e-mail interno (best-effort)
      sendLeadNotification({ ...draft, email, celular }).catch((err) =>
        console.warn("Falha ao enviar e-mail de notificação:", err)
      );

      clearDraftQuestionnaire();
      toast.success("Conta criada! Vamos analisar seu pedido em breve.");
      navigate("/espaco-do-cliente/painel", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  if (!draft) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 font-manrope">
                Crie sua conta
              </h1>
              <p className="text-muted-foreground">
                Para acompanhar o andamento do seu{" "}
                <strong className="text-foreground">
                  {draft.tipo
                    ? PROJECT_TYPE_LABEL[draft.tipo].toLowerCase()
                    : "projeto"}
                </strong>{" "}
                pelo Espaço do Cliente.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-6 md:p-8 space-y-5"
            >
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder="(21) 9 0000-0000"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="senha">Senha *</Label>
                <div className="relative mt-2">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
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

              <div>
                <Label htmlFor="repetir">Repetir senha *</Label>
                <Input
                  id="repetir"
                  type={mostrarSenha ? "text" : "password"}
                  value={repetirSenha}
                  onChange={(e) => setRepetirSenha(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="mt-2"
                  required
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={aceitouTermos}
                  onCheckedChange={(v) => setAceitouTermos(v === true)}
                  className="mt-1"
                />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Li e aceito os{" "}
                  <Link
                    to="/termos"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    to="/privacidade"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta e enviar pedido"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                to="/espaco-do-cliente/login"
                className="text-primary hover:underline font-medium"
              >
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

async function sendLeadNotification(d: QuestionnaireData): Promise<void> {
  const tipo = d.tipo ? PROJECT_TYPE_LABEL[d.tipo] : "Não informado";
  const reuniaoLinha = d.reuniao.quer
    ? `Reunião solicitada: ${d.reuniao.data} às ${d.reuniao.horario}${
        d.reuniao.notificarWhatsapp ? " (confirmar também por WhatsApp)" : ""
      }${d.reuniao.topico ? ` — ${d.reuniao.topico}` : ""}`
    : "Reunião: cliente prefere conversar depois";

  const linhas = [
    `Tipo: ${tipo}`,
    `Empresa: ${d.empresa || "—"}`,
    `Ramo: ${d.ramo || "—"}`,
    `Telefone: ${d.celular}`,
    "",
    `Objetivo: ${d.objetivoFrase}`,
    d.entregas.length ? `Entregas: ${d.entregas.join(", ")}` : "",
    d.publicoAlvo ? `Público-alvo: ${d.publicoAlvo}` : "",
    "",
    d.referencias ? `Referências: ${d.referencias}` : "",
    d.estiloDesejado ? `Estilo: ${d.estiloDesejado}` : "",
    "",
    d.prazo ? `Prazo: ${d.prazo}` : "",
    d.orcamento ? `Orçamento: ${d.orcamento}` : "",
    d.comoConheceu ? `Como conheceu: ${d.comoConheceu}` : "",
    "",
    reuniaoLinha,
  ].filter(Boolean);

  await emailService.sendContactEmail({
    name: d.nome,
    email: d.email,
    service: `Espaço do Cliente — ${tipo}`,
    description: linhas.join("\n"),
  });
}

export default Cadastro;
