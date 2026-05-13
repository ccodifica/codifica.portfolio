import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  ShoppingCart,
  Smartphone,
  LayoutDashboard,
  HelpCircle,
  Check,
  Video,
  Mail,
  MessageCircle,
  CalendarIcon,
  Info,
} from "lucide-react";
import {
  EMPTY_QUESTIONNAIRE,
  MeetingPreference,
  PROJECT_TYPE_LABEL,
  ProjectType,
  QuestionnaireData,
} from "@/types/client-area";
import {
  getDraftQuestionnaire,
  setDraftQuestionnaire,
} from "@/lib/client-area-store";
import { toast } from "@/components/ui/sonner";

const TOTAL_STEPS = 8;

const HORARIOS_DISPONIVEIS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

const ENTREGAS_OPTIONS = [
  "Vender produtos/serviços",
  "Captar contatos/leads",
  "Mostrar trabalho/portfólio",
  "Automatizar processo interno",
  "Atender clientes (suporte, agendamento)",
  "Outro",
];

const RAMOS = [
  "Comércio",
  "Serviços",
  "Indústria",
  "Educação",
  "Saúde",
  "Tecnologia",
  "Alimentação",
  "Imobiliário",
  "Outro",
];

const PRAZO_OPTIONS = [
  { value: "ate_1_mes", label: "Até 1 mês" },
  { value: "1_3_meses", label: "1 a 3 meses" },
  { value: "3_6_meses", label: "3 a 6 meses" },
  { value: "sem_pressa", label: "Sem pressa" },
];

const ORCAMENTO_OPTIONS = [
  { value: "ate_3k", label: "Até R$ 3 mil" },
  { value: "3k_10k", label: "R$ 3 mil – R$ 10 mil" },
  { value: "10k_30k", label: "R$ 10 mil – R$ 30 mil" },
  { value: "acima_30k", label: "Acima de R$ 30 mil" },
  { value: "conversar", label: "Prefiro conversar antes" },
];

const COMO_CONHECEU = [
  "Google",
  "Instagram",
  "Indicação de amigo/parceiro",
  "LinkedIn",
  "Outro",
];

const TIPO_CARDS: {
  value: ProjectType;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { value: "site", icon: Globe, desc: "Institucional, portfólio, presença digital" },
  { value: "ecommerce", icon: ShoppingCart, desc: "Loja virtual, venda de produtos" },
  { value: "app", icon: Smartphone, desc: "iOS e/ou Android" },
  { value: "sistema", icon: LayoutDashboard, desc: "Área administrativa, SaaS, ERP, gestão" },
  { value: "indeciso", icon: HelpCircle, desc: "Te explico minha ideia e você me orienta" },
];

const Questionario = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>(EMPTY_QUESTIONNAIRE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = getDraftQuestionnaire();
    if (draft) {
      setData({
        ...EMPTY_QUESTIONNAIRE,
        ...draft,
        reuniao: {
          ...EMPTY_QUESTIONNAIRE.reuniao,
          ...(draft.reuniao ?? {}),
        },
      });
    }
  }, []);

  useEffect(() => {
    setDraftQuestionnaire(data);
  }, [data]);

  const update = <K extends keyof QuestionnaireData>(
    key: K,
    value: QuestionnaireData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateTecnico = (key: string, value: string | string[] | boolean) => {
    setData((prev) => ({
      ...prev,
      detalhesTecnicos: { ...prev.detalhesTecnicos, [key]: value },
    }));
  };

  const toggleEntrega = (option: string) => {
    setData((prev) => {
      const has = prev.entregas.includes(option);
      return {
        ...prev,
        entregas: has
          ? prev.entregas.filter((e) => e !== option)
          : [...prev.entregas, option],
      };
    });
  };

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        if (!data.nome.trim()) return "Informe seu nome.";
        if (!data.email.trim()) return "Informe seu e-mail.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
          return "E-mail inválido.";
        if (!data.celular.trim()) return "Informe seu telefone/WhatsApp.";
        return null;
      case 2:
        if (!data.tipo) return "Escolha o tipo de projeto.";
        return null;
      case 3:
        if (!data.objetivoFrase.trim())
          return "Conte em uma frase o objetivo do projeto.";
        return null;
      case 6:
        if (!data.prazo) return "Selecione um prazo desejado.";
        return null;
      case 7:
        if (data.reuniao.quer) {
          if (!data.reuniao.data) return "Escolha a data da reunião.";
          if (!data.reuniao.horario) return "Escolha o horário da reunião.";
        }
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleFinish();
    }
  };

  const back = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinish = () => {
    setSubmitting(true);
    setDraftQuestionnaire(data);
    navigate("/espaco-do-cliente/cadastro");
  };

  const progresso = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-20">
        <section className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>
                  Passo {step} de {TOTAL_STEPS}
                </span>
                <span>{Math.round(progresso)}%</span>
              </div>
              <Progress value={progresso} className="h-2" />
            </div>

            <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-8 md:p-10">
              {step === 1 && (
                <Step1 data={data} update={update} />
              )}
              {step === 2 && <Step2 data={data} update={update} />}
              {step === 3 && (
                <Step3 data={data} update={update} toggleEntrega={toggleEntrega} />
              )}
              {step === 4 && (
                <Step4 data={data} updateTecnico={updateTecnico} update={update} />
              )}
              {step === 5 && <Step5 data={data} update={update} />}
              {step === 6 && <Step6 data={data} update={update} />}
              {step === 7 && <Step7Reuniao data={data} update={update} />}
              {step === 8 && <Step8Revisao data={data} />}

              <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/40">
                <Button
                  variant="ghost"
                  onClick={back}
                  disabled={step === 1}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  onClick={next}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                >
                  {step === TOTAL_STEPS ? (
                    <>
                      Continuar para o cadastro
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Avançar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
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

// --- Passos ---

interface StepProps {
  data: QuestionnaireData;
  update: <K extends keyof QuestionnaireData>(
    key: K,
    value: QuestionnaireData[K]
  ) => void;
}

const StepHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-8">
    <h2 className="text-2xl md:text-3xl font-bold mb-2 font-manrope">{title}</h2>
    <p className="text-muted-foreground">{subtitle}</p>
  </div>
);

const Step1 = ({ data, update }: StepProps) => (
  <>
    <StepHeader
      title="Sobre você"
      subtitle="Vamos começar com algumas informações básicas para a gente se conectar."
    />
    <div className="grid md:grid-cols-2 gap-5">
      <div className="md:col-span-2">
        <Label htmlFor="nome">Nome completo *</Label>
        <Input
          id="nome"
          value={data.nome}
          onChange={(e) => update("nome", e.target.value)}
          placeholder="Seu nome"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="email">E-mail *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="seu@email.com"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="celular">Telefone / WhatsApp *</Label>
        <Input
          id="celular"
          value={data.celular}
          onChange={(e) => update("celular", e.target.value)}
          placeholder="(21) 9 0000-0000"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="empresa">Empresa (opcional)</Label>
        <Input
          id="empresa"
          value={data.empresa ?? ""}
          onChange={(e) => update("empresa", e.target.value)}
          placeholder="Nome da empresa"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="cargo">Seu cargo (opcional)</Label>
        <Input
          id="cargo"
          value={data.cargo ?? ""}
          onChange={(e) => update("cargo", e.target.value)}
          placeholder="Ex.: Sócio-fundador"
          className="mt-2"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="ramo">Ramo de atuação</Label>
        <Select
          value={data.ramo ?? ""}
          onValueChange={(v) => update("ramo", v)}
        >
          <SelectTrigger id="ramo" className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {RAMOS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </>
);

const Step2 = ({ data, update }: StepProps) => (
  <>
    <StepHeader
      title="O que você quer desenvolver?"
      subtitle="Escolha a opção que mais combina com seu projeto. Você pode detalhar nos próximos passos."
    />
    <div className="grid sm:grid-cols-2 gap-4">
      {TIPO_CARDS.map((card) => {
        const Icon = card.icon;
        const selected = data.tipo === card.value;
        return (
          <button
            key={card.value}
            type="button"
            onClick={() => update("tipo", card.value)}
            className={`text-left p-5 rounded-xl border transition-all duration-200 ${
              selected
                ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                : "border-border/60 bg-card/30 hover:border-primary/40 hover:bg-card/60"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected ? "bg-primary/20" : "bg-muted"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    selected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-1">
                  {PROJECT_TYPE_LABEL[card.value]}
                </div>
                <div className="text-sm text-muted-foreground">{card.desc}</div>
              </div>
              {selected && (
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  </>
);

const Step3 = ({
  data,
  update,
  toggleEntrega,
}: StepProps & { toggleEntrega: (o: string) => void }) => (
  <>
    <StepHeader
      title="Objetivo do projeto"
      subtitle="Quanto mais claro o objetivo, mais certeira fica a proposta."
    />
    <div className="space-y-6">
      <div>
        <Label htmlFor="objetivoFrase">
          Em uma frase, qual é o objetivo principal? *
        </Label>
        <Textarea
          id="objetivoFrase"
          value={data.objetivoFrase}
          onChange={(e) => update("objetivoFrase", e.target.value)}
          placeholder="Ex.: Quero um site para vender meus cursos online e captar leads."
          rows={3}
          className="mt-2 resize-none"
        />
      </div>

      <div>
        <Label>O que esse projeto precisa entregar? (pode marcar mais de um)</Label>
        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          {ENTREGAS_OPTIONS.map((opt) => {
            const checked = data.entregas.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 hover:border-primary/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleEntrega(opt)}
                />
                <span className="text-sm">{opt}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="publico">Quem é o público-alvo?</Label>
        <Input
          id="publico"
          value={data.publicoAlvo}
          onChange={(e) => update("publicoAlvo", e.target.value)}
          placeholder="Ex.: Pequenas empresas do ramo de alimentação"
          className="mt-2"
        />
      </div>
    </div>
  </>
);

const Step4 = ({
  data,
  updateTecnico,
  update,
}: StepProps & {
  updateTecnico: (k: string, v: string | string[] | boolean) => void;
}) => {
  const tipo = data.tipo;
  const t = data.detalhesTecnicos;

  if (!tipo) {
    return (
      <>
        <StepHeader
          title="Detalhes técnicos"
          subtitle="Você precisa selecionar um tipo de projeto no passo anterior."
        />
      </>
    );
  }

  if (tipo === "indeciso") {
    return (
      <>
        <StepHeader
          title="Conte sua ideia"
          subtitle="Sem problema não saber ainda o formato. Nos conte o que você imagina e vamos te orientar."
        />
        <div>
          <Label htmlFor="ideia">Descreva sua ideia</Label>
          <Textarea
            id="ideia"
            value={(t.ideia as string) ?? ""}
            onChange={(e) => updateTecnico("ideia", e.target.value)}
            placeholder="O que você quer resolver? Para quem? Como imagina que funcionaria?"
            rows={6}
            className="mt-2 resize-none"
          />
        </div>
      </>
    );
  }

  if (tipo === "site") {
    return (
      <>
        <StepHeader
          title="Detalhes do site"
          subtitle="Algumas perguntas para entendermos o tamanho e o escopo."
        />
        <div className="space-y-5">
          <div>
            <Label>Quantas páginas/seções aproximadamente?</Label>
            <Select
              value={(t.qtdPaginas as string) ?? ""}
              onValueChange={(v) => updateTecnico("qtdPaginas", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (landing page)</SelectItem>
                <SelectItem value="2-5">2 a 5 páginas</SelectItem>
                <SelectItem value="6-15">6 a 15 páginas</SelectItem>
                <SelectItem value="15+">Mais de 15 páginas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CheckboxField
            label="Precisa de blog/área de notícias"
            checked={Boolean(t.blog)}
            onChange={(v) => updateTecnico("blog", v)}
          />
          <CheckboxField
            label="Integração com WhatsApp (botão flutuante)"
            checked={Boolean(t.whatsapp)}
            onChange={(v) => updateTecnico("whatsapp", v)}
          />
          <CheckboxField
            label="Formulário de contato com envio para e-mail"
            checked={Boolean(t.formContato)}
            onChange={(v) => updateTecnico("formContato", v)}
          />
          <CheckboxField
            label="Multi-idioma (PT + EN, por exemplo)"
            checked={Boolean(t.multiIdioma)}
            onChange={(v) => updateTecnico("multiIdioma", v)}
          />
        </div>
      </>
    );
  }

  if (tipo === "ecommerce") {
    return (
      <>
        <StepHeader
          title="Detalhes do e-commerce"
          subtitle="Vamos entender o tamanho da operação e os meios de pagamento."
        />
        <div className="space-y-5">
          <div>
            <Label>Quantos produtos aproximadamente?</Label>
            <Select
              value={(t.qtdProdutos as string) ?? ""}
              onValueChange={(v) => updateTecnico("qtdProdutos", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ate_20">Até 20</SelectItem>
                <SelectItem value="20_100">20 a 100</SelectItem>
                <SelectItem value="100_500">100 a 500</SelectItem>
                <SelectItem value="500+">Mais de 500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de produto</Label>
            <Select
              value={(t.tipoProduto as string) ?? ""}
              onValueChange={(v) => updateTecnico("tipoProduto", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisico">Físico (precisa de frete)</SelectItem>
                <SelectItem value="digital">Digital / download</SelectItem>
                <SelectItem value="servico">Serviço / agendamento</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CheckboxField
            label="Pix"
            checked={Boolean(t.pagPix)}
            onChange={(v) => updateTecnico("pagPix", v)}
          />
          <CheckboxField
            label="Cartão de crédito/débito"
            checked={Boolean(t.pagCartao)}
            onChange={(v) => updateTecnico("pagCartao", v)}
          />
          <CheckboxField
            label="Boleto"
            checked={Boolean(t.pagBoleto)}
            onChange={(v) => updateTecnico("pagBoleto", v)}
          />
          <CheckboxField
            label="Já uso um ERP / sistema de estoque que preciso integrar"
            checked={Boolean(t.temERP)}
            onChange={(v) => updateTecnico("temERP", v)}
          />
        </div>
      </>
    );
  }

  if (tipo === "app") {
    return (
      <>
        <StepHeader
          title="Detalhes do aplicativo"
          subtitle="Algumas perguntas técnicas para dimensionar o app."
        />
        <div className="space-y-5">
          <div>
            <Label>Plataformas</Label>
            <Select
              value={(t.plataformas as string) ?? ""}
              onValueChange={(v) => updateTecnico("plataformas", v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ios">Apenas iOS</SelectItem>
                <SelectItem value="android">Apenas Android</SelectItem>
                <SelectItem value="ambos">iOS e Android</SelectItem>
                <SelectItem value="naosei">Não sei ainda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CheckboxField
            label="Precisa funcionar offline (sem internet)"
            checked={Boolean(t.offline)}
            onChange={(v) => updateTecnico("offline", v)}
          />
          <CheckboxField
            label="Vai usar localização / mapa (GPS)"
            checked={Boolean(t.gps)}
            onChange={(v) => updateTecnico("gps", v)}
          />
          <CheckboxField
            label="Vai usar câmera ou galeria de fotos"
            checked={Boolean(t.camera)}
            onChange={(v) => updateTecnico("camera", v)}
          />
          <CheckboxField
            label="Notificações push"
            checked={Boolean(t.push)}
            onChange={(v) => updateTecnico("push", v)}
          />
          <CheckboxField
            label="Login de usuário"
            checked={Boolean(t.loginApp)}
            onChange={(v) => updateTecnico("loginApp", v)}
          />
          <div>
            <Label>Vai integrar com algum sistema externo (API)?</Label>
            <Input
              value={(t.integracoes as string) ?? ""}
              onChange={(e) => updateTecnico("integracoes", e.target.value)}
              placeholder="Ex.: meu ERP, Google Maps, Stripe..."
              className="mt-2"
            />
          </div>
        </div>
      </>
    );
  }

  // sistema
  return (
    <>
      <StepHeader
        title="Detalhes do sistema"
        subtitle="Quanto mais detalhe, mais precisa fica a estimativa."
      />
      <div className="space-y-5">
        <div>
          <Label>Quantos tipos de usuário/perfis o sistema terá?</Label>
          <Select
            value={(t.perfis as string) ?? ""}
            onValueChange={(v) => updateTecnico("perfis", v)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 (todos com mesmo acesso)</SelectItem>
              <SelectItem value="2-3">2 a 3 perfis</SelectItem>
              <SelectItem value="4+">4 ou mais perfis</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="modulos">Principais módulos / funcionalidades</Label>
          <Textarea
            id="modulos"
            value={(t.modulos as string) ?? ""}
            onChange={(e) => updateTecnico("modulos", e.target.value)}
            placeholder="Ex.: cadastro de clientes, financeiro, relatórios, agenda..."
            rows={4}
            className="mt-2 resize-none"
          />
        </div>
        <CheckboxField
          label="Dashboard com gráficos e indicadores"
          checked={Boolean(t.dashboard)}
          onChange={(v) => updateTecnico("dashboard", v)}
        />
        <CheckboxField
          label="Exportação de relatórios (PDF / Excel)"
          checked={Boolean(t.exportRel)}
          onChange={(v) => updateTecnico("exportRel", v)}
        />
        <div>
          <Label>Precisa integrar com algum sistema atual?</Label>
          <Input
            value={(t.integracoesSistema as string) ?? ""}
            onChange={(e) =>
              updateTecnico("integracoesSistema", e.target.value)
            }
            placeholder="Ex.: ERP, CRM, planilhas, API externa..."
            className="mt-2"
          />
        </div>
      </div>
    </>
  );
};

const Step5 = ({ data, update }: StepProps) => (
  <>
    <StepHeader
      title="Identidade visual e referências"
      subtitle="Isso ajuda muito a equipe de design no início do projeto."
    />
    <div className="space-y-5">
      <div>
        <Label>Já tem logo e identidade visual?</Label>
        <Select
          value={data.temIdentidade}
          onValueChange={(v) =>
            update("temIdentidade", v as QuestionnaireData["temIdentidade"])
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim, completo</SelectItem>
            <SelectItem value="parcial">Parcial (só logo, por exemplo)</SelectItem>
            <SelectItem value="nao">Ainda não tenho</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Já tem domínio comprado?</Label>
        <Select
          value={data.temDominio}
          onValueChange={(v) =>
            update("temDominio", v as QuestionnaireData["temDominio"])
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sim">Sim</SelectItem>
            <SelectItem value="nao">Não</SelectItem>
            <SelectItem value="nao_sei">Não sei o que é</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="referencias">
          Cite 2-3 sites ou apps que você admira
        </Label>
        <Textarea
          id="referencias"
          value={data.referencias}
          onChange={(e) => update("referencias", e.target.value)}
          placeholder="Cole os links ou nomes. Pode incluir o que você gostou em cada um."
          rows={3}
          className="mt-2 resize-none"
        />
      </div>
      <div>
        <Label htmlFor="estilo">Estilo desejado / cores que combinam com a marca</Label>
        <Textarea
          id="estilo"
          value={data.estiloDesejado}
          onChange={(e) => update("estiloDesejado", e.target.value)}
          placeholder="Ex.: minimalista, escuro com roxo, alegre e colorido..."
          rows={2}
          className="mt-2 resize-none"
        />
      </div>
    </div>
  </>
);

const Step6 = ({ data, update }: StepProps) => (
  <>
    <StepHeader
      title="Prazo e investimento"
      subtitle="Essas informações são usadas só para propor a solução ideal — você pode revisar depois."
    />
    <div className="space-y-5">
      <div>
        <Label>Quando precisa que esteja no ar? *</Label>
        <Select
          value={data.prazo}
          onValueChange={(v) => update("prazo", v)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {PRAZO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Faixa de investimento prevista</Label>
        <Select
          value={data.orcamento}
          onValueChange={(v) => update("orcamento", v)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {ORCAMENTO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Como conheceu a Codifica?</Label>
        <Select
          value={data.comoConheceu}
          onValueChange={(v) => update("comoConheceu", v)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {COMO_CONHECEU.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </>
);

const Step7Reuniao = ({ data, update }: StepProps) => {
  const reuniao = data.reuniao;
  const updateReuniao = <K extends keyof MeetingPreference>(
    key: K,
    value: MeetingPreference[K]
  ) => update("reuniao", { ...reuniao, [key]: value });

  const dataSelecionada = reuniao.data
    ? parseLocalDate(reuniao.data)
    : undefined;

  // Permite a partir do próximo dia útil, até 60 dias à frente
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 60);

  return (
    <>
      <StepHeader
        title="Vamos marcar uma conversa?"
        subtitle="A reunião é uma etapa importante do processo. É nela que entendemos a fundo o seu projeto, alinhamos expectativas e ganhamos tempo nas próximas etapas."
      />

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6 flex items-start gap-3">
        <Video className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground/90">
          <strong>Por que recomendamos fortemente:</strong> em 30 minutos
          alinhamos escopo, tiramos dúvidas técnicas e mostramos referências.
          A reunião acontece pelo <strong>Google Meet</strong> — você recebe o
          link por e-mail antes do horário.
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <OptionCard
          selected={reuniao.quer === true}
          onClick={() => updateReuniao("quer", true)}
          title="Sim, quero marcar agora"
          subtitle="Escolho data e horário e recebo o convite por e-mail."
          icon={CalendarIcon}
          highlighted
        />
        <OptionCard
          selected={reuniao.quer === false}
          onClick={() => updateReuniao("quer", false)}
          title="Não, prefiro conversar depois"
          subtitle="Vamos analisar o briefing e entrar em contato pelo canal que você preferir."
          icon={Info}
        />
      </div>

      {reuniao.quer && (
        <div className="space-y-6 border-t border-border/40 pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Escolha uma data</Label>
              <div className="rounded-xl border border-border/60 bg-card/50 p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={dataSelecionada}
                  onSelect={(d) =>
                    updateReuniao("data", d ? toLocalDateString(d) : undefined)
                  }
                  disabled={(d) => {
                    const dia = d.getDay();
                    return d < hoje || d > limite || dia === 0 || dia === 6;
                  }}
                  weekStartsOn={1}
                  locale={undefined}
                  className="rounded-md"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Atendemos de segunda a sexta. Janelas até 60 dias à frente.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Horário disponível</Label>
                <div className="grid grid-cols-3 gap-2">
                  {HORARIOS_DISPONIVEIS.map((h) => {
                    const selecionado = reuniao.horario === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updateReuniao("horario", h)}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          selecionado
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-card/30 hover:border-primary/40"
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="topico">
                  O que você gostaria de conversar? (opcional)
                </Label>
                <Textarea
                  id="topico"
                  value={reuniao.topico ?? ""}
                  onChange={(e) => updateReuniao("topico", e.target.value)}
                  placeholder="Ex.: quero entender melhor o processo, mostrar referências, tirar dúvidas técnicas..."
                  rows={4}
                  className="mt-2 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-5">
            <Label className="mb-3 block">
              Como você quer receber a confirmação?
            </Label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
                <Checkbox
                  checked={reuniao.notificarEmail}
                  onCheckedChange={(v) =>
                    updateReuniao("notificarEmail", v === true)
                  }
                />
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Por <strong>e-mail</strong> — receberei o convite com o link
                  do Google Meet.
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border/60 cursor-pointer hover:border-primary/30 transition-colors">
                <Checkbox
                  checked={reuniao.notificarWhatsapp}
                  onCheckedChange={(v) =>
                    updateReuniao("notificarWhatsapp", v === true)
                  }
                />
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  Também por <strong>WhatsApp</strong> — usaremos o número que
                  você cadastrou.
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const OptionCard = ({
  selected,
  onClick,
  title,
  subtitle,
  icon: Icon,
  highlighted,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-4 rounded-xl border transition-colors ${
      selected
        ? "border-primary bg-primary/10"
        : highlighted
        ? "border-primary/30 bg-primary/5 hover:border-primary/60"
        : "border-border/60 bg-card/30 hover:border-primary/40"
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          selected ? "bg-primary/20" : "bg-muted"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`}
        />
      </div>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{subtitle}</div>
      </div>
      {selected && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
    </div>
  </button>
);

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s: string): Date | undefined {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function formatDataBR(s?: string): string {
  if (!s) return "—";
  const dt = parseLocalDate(s);
  if (!dt) return s;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const Step8Revisao = ({ data }: { data: QuestionnaireData }) => (
  <>
    <StepHeader
      title="Revisão do briefing"
      subtitle="Confira tudo abaixo. Você poderá editar mais tarde dentro do seu painel."
    />
    <div className="space-y-4 text-sm">
      <ReviewItem label="Nome" value={data.nome} />
      <ReviewItem label="E-mail" value={data.email} />
      <ReviewItem label="Telefone" value={data.celular} />
      {data.empresa && <ReviewItem label="Empresa" value={data.empresa} />}
      {data.ramo && <ReviewItem label="Ramo" value={data.ramo} />}
      <ReviewItem
        label="Tipo de projeto"
        value={data.tipo ? PROJECT_TYPE_LABEL[data.tipo] : "—"}
      />
      <ReviewItem label="Objetivo" value={data.objetivoFrase} />
      {data.entregas.length > 0 && (
        <ReviewItem label="Entregas" value={data.entregas.join(", ")} />
      )}
      {data.publicoAlvo && (
        <ReviewItem label="Público-alvo" value={data.publicoAlvo} />
      )}
      {data.temIdentidade && (
        <ReviewItem label="Identidade visual" value={data.temIdentidade} />
      )}
      {data.temDominio && (
        <ReviewItem label="Domínio" value={data.temDominio} />
      )}
      {data.referencias && (
        <ReviewItem label="Referências" value={data.referencias} />
      )}
      {data.prazo && (
        <ReviewItem
          label="Prazo"
          value={
            PRAZO_OPTIONS.find((p) => p.value === data.prazo)?.label ?? data.prazo
          }
        />
      )}
      {data.orcamento && (
        <ReviewItem
          label="Investimento"
          value={
            ORCAMENTO_OPTIONS.find((o) => o.value === data.orcamento)?.label ??
            data.orcamento
          }
        />
      )}
      <ReviewItem
        label="Reunião"
        value={
          data.reuniao.quer
            ? `${formatDataBR(data.reuniao.data)} às ${data.reuniao.horario}${
                data.reuniao.notificarWhatsapp ? " · também por WhatsApp" : ""
              }`
            : "Conversar mais tarde"
        }
      />
    </div>
    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm">
      No próximo passo você cria sua conta para acompanhar o projeto no seu
      Espaço do Cliente.
    </div>
  </>
);

const ReviewItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-border/40 last:border-b-0">
    <span className="font-medium text-muted-foreground sm:w-40">{label}</span>
    <span className="text-foreground flex-1 break-words">{value || "—"}</span>
  </div>
);

const CheckboxField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
    />
    <span className="text-sm">{label}</span>
  </label>
);

export default Questionario;
