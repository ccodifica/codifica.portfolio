import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DADOS_VAZIOS, DadosPedido, REDES_LISTA, Redes, SimNao } from "@/lib/pedidos";
import { registrar } from "@/lib/metricas";

const formatarWhatsapp = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const Campo = ({
  id,
  rotulo,
  opcional,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-base">
      {rotulo} {opcional && <span className="text-muted-foreground font-normal">(opcional)</span>}
    </Label>
    {children}
  </div>
);

const PerguntaSimNao = ({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: SimNao | "" | undefined;
  onChange: (v: SimNao) => void;
}) => (
  <fieldset className="space-y-3">
    <legend className="text-base font-medium mb-1">{rotulo}</legend>
    <RadioGroup value={valor || ""} onValueChange={(v) => onChange(v as SimNao)} className="flex flex-wrap gap-4">
      {(
        [
          ["sim", "Sim"],
          ["nao", "Não"],
          ["nao_sei", "Não sei"],
        ] as const
      ).map(([v, r]) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={`${id}-${v}`} />
          <Label htmlFor={`${id}-${v}`} className="font-normal">
            {r}
          </Label>
        </div>
      ))}
    </RadioGroup>
  </fieldset>
);

/**
 * Formulário curto do pedido. Usado em /comecar (novo) e no link pessoal
 * quando o pedido veio de pré-cadastro (dados já preenchidos, cliente confere).
 */
const FormularioPedido = ({
  inicial = DADOS_VAZIOS,
  textoBotao,
  onEnviar,
}: {
  inicial?: DadosPedido;
  textoBotao: string;
  onEnviar: (dados: DadosPedido) => Promise<void>;
}) => {
  const [dados, setDados] = useState<DadosPedido>({ ...DADOS_VAZIOS, ...inicial, redes: { ...inicial.redes } });
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set(REDES_LISTA.filter((r) => inicial.redes?.[r.chave]).map((r) => r.chave))
  );
  const [armadilha, setArmadilha] = useState(""); // campo invisível contra robôs
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const muda = <K extends keyof DadosPedido>(k: K, v: DadosPedido[K]) => {
    registrar("form_inicio", "", true);
    setDados((d) => ({ ...d, [k]: v }));
  };
  const mudaRede = (k: keyof Redes, v: string | boolean) => {
    registrar("form_inicio", "", true);
    setDados((d) => ({ ...d, redes: { ...d.redes, [k]: v } }));
  };
  const falha = (mensagem: string, tipo: string) => {
    setErro(mensagem);
    registrar("form_erro", tipo);
  };

  const alternaRede = (chave: string, ligada: boolean) => {
    setMarcadas((s) => {
      const n = new Set(s);
      if (ligada) n.add(chave);
      else n.delete(chave);
      return n;
    });
    if (ligada) mudaRede("nenhuma", false);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (armadilha) return;
    if (![dados.nome, dados.negocio, dados.cidade].every((v) => v.trim())) {
      falha("Preencha seu nome, o nome do negócio e a cidade.", "campos_obrigatorios");
      return;
    }
    const redes: Redes = {};
    REDES_LISTA.forEach(({ chave }) => {
      const v = dados.redes[chave]?.toString().trim();
      if (marcadas.has(chave) && v) redes[chave] = v;
    });
    if (dados.redes.nenhuma) redes.nenhuma = true;
    if (!Object.keys(redes).length) {
      falha("Informe pelo menos uma rede do negócio ou marque \"Ainda não tenho nenhuma\".", "sem_rede");
      return;
    }
    if (dados.whatsapp.replace(/\D/g, "").length < 10) {
      falha("Confira o WhatsApp com DDD.", "whatsapp");
      return;
    }
    // E-mail não é pedido aqui (menos campos = mais conversão): entra no aceite do contrato
    setEnviando(true);
    try {
      await onEnviar({ ...dados, email: (dados.email || "").trim().toLowerCase(), redes });
    } catch (err) {
      falha((err as Error).message, "servidor");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-8" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <Campo id="nome" rotulo="Seu nome">
          <Input id="nome" required autoComplete="name" value={dados.nome} onChange={(e) => muda("nome", e.target.value)} />
        </Campo>
        <Campo id="whatsapp" rotulo="WhatsApp com DDD">
          <Input
            id="whatsapp"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(21) 99999-9999"
            value={dados.whatsapp}
            onChange={(e) => muda("whatsapp", formatarWhatsapp(e.target.value))}
            aria-describedby="whatsapp-dica"
          />
          <p id="whatsapp-dica" className="text-sm text-muted-foreground">
            É por lá que a prévia chega.
          </p>
        </Campo>
        <Campo id="negocio" rotulo="Nome do negócio">
          <Input id="negocio" required value={dados.negocio} onChange={(e) => muda("negocio", e.target.value)} />
        </Campo>
        <Campo id="cidade" rotulo="Cidade e bairro">
          <Input
            id="cidade"
            required
            placeholder="Rio de Janeiro, Tijuca"
            value={dados.cidade}
            onChange={(e) => muda("cidade", e.target.value)}
          />
        </Campo>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-base font-medium">Onde o seu negócio aparece na internet?</legend>
        <p className="text-sm text-muted-foreground -mt-2">
          É daqui que a gente tira logo, fotos e informações para montar a prévia. Marque o que tiver.
        </p>
        <div className="space-y-3">
          {REDES_LISTA.map(({ chave, rotulo, dica }) => (
            <div key={chave} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`rede-${chave}`}
                  checked={marcadas.has(chave)}
                  onCheckedChange={(v) => alternaRede(chave, v === true)}
                />
                <Label htmlFor={`rede-${chave}`} className="font-normal text-base">
                  {rotulo}
                </Label>
              </div>
              {marcadas.has(chave) && (
                <Input
                  className="mt-3"
                  aria-label={`${rotulo}: endereço`}
                  placeholder={dica}
                  value={(dados.redes[chave] as string) || ""}
                  onChange={(e) => mudaRede(chave, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-3 px-3">
            <Checkbox
              id="rede-nenhuma"
              checked={Boolean(dados.redes.nenhuma)}
              onCheckedChange={(v) => {
                mudaRede("nenhuma", v === true);
                if (v === true) setMarcadas(new Set());
              }}
            />
            <Label htmlFor="rede-nenhuma" className="font-normal text-base">
              Ainda não tenho nenhuma
            </Label>
          </div>
        </div>
      </fieldset>

      <PerguntaSimNao
        id="sistema"
        rotulo="Precisa de agenda, pagamento online ou área do cliente?"
        valor={dados.precisa_sistema}
        onChange={(v) => muda("precisa_sistema", v)}
      />
      {dados.precisa_sistema === "sim" && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
          Isso é um sistema, não um site simples. Pode enviar normalmente: a gente vai chamar você no WhatsApp para
          marcar uma conversa antes de passar um valor.
        </p>
      )}

      <details className="group rounded-xl border border-border p-4" open={Boolean(dados.site_atual || dados.referencia)}>
        <summary className="cursor-pointer text-base font-medium list-none flex items-center justify-between">
          Quer adiantar mais alguma coisa? <span className="text-muted-foreground font-normal text-sm">(opcional)</span>
        </summary>
      <div className="grid sm:grid-cols-2 gap-5 mt-4">
        <Campo id="site_atual" rotulo="Site atual" opcional>
          <Input
            id="site_atual"
            placeholder="www.seunegocio.com.br"
            value={dados.site_atual || ""}
            onChange={(e) => muda("site_atual", e.target.value)}
          />
        </Campo>
        <Campo id="referencia" rotulo="Um site que você gosta" opcional>
          <Input
            id="referencia"
            placeholder="Para a gente entender o seu gosto"
            value={dados.referencia || ""}
            onChange={(e) => muda("referencia", e.target.value)}
          />
        </Campo>
      </div>

      </details>

      {/* Armadilha para robôs: invisível para pessoas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="empresa_site">Não preencha</label>
        <input
          id="empresa_site"
          tabIndex={-1}
          autoComplete="off"
          value={armadilha}
          onChange={(e) => setArmadilha(e.target.value)}
        />
      </div>

      {erro && (
        <p role="alert" className="text-destructive font-medium">
          {erro}
        </p>
      )}

      <div className="space-y-3">
        <Button type="submit" size="lg" disabled={enviando} className="w-full sm:w-auto rounded-xl font-semibold">
          {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />}
          {textoBotao}
        </Button>
        <p className="text-sm text-muted-foreground">
          Usamos seus dados só para montar a prévia e falar com você. Veja a{" "}
          <Link to="/privacidade" className="underline hover:text-foreground">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </form>
  );
};

export default FormularioPedido;
