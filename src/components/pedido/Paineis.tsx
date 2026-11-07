import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, Copy, ExternalLink, FileText, Globe, Hammer, Loader2, Lock, MessageCircle, Palette, PenLine, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SeloBlackFriday } from "@/components/oferta/Base";
import FormularioPedido from "@/components/oferta/FormularioPedido";
import TextoContrato from "@/components/oferta/TextoContrato";
import { CONTRATO_VERSAO } from "@/config/contrato";
import { CARTAO, CONTRATADA, HORARIO, OFERTA, tabelaCartao, PARCELAS_TEXTO, PRAZO_SITE, RODADAS, brl, dataCurta, dataHora, linkWhatsapp, prazoPrevia, precoAtual } from "@/config/oferta";
import { registrar } from "@/lib/metricas";
import {
  CobrancaGerada,
  FormaPagamentoSite,
  PedidoPublico,
  REDES_LISTA,
  aceitarContrato,
  avaliarPedido,
  cancelarManutencao,
  confirmarPedido,
  gerarPagamento,
  responderPrevia,
  verPedido,
} from "@/lib/pedidos";
import {
  ArquivosEntrega,
  Bloco,
  CabecalhoEtapa,
  EnvioArquivos,
  ListaPagamentos,
  Selo,
  dataBR,
  dataDaEtapa,
  mascararWhatsapp,
  mensagemPedido,
  useDocumentos,
} from "./Comuns";

type Props = { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void; atual: boolean };

const Erro = ({ texto }: { texto: string }) =>
  texto ? (
    <p role="alert" className="text-destructive text-sm mt-3">
      {texto}
    </p>
  ) : null;

const Item = ({ icone: Icone, titulo, texto }: { icone: typeof Check; titulo: string; texto: string }) => (
  <div className="flex gap-3">
    <div className="w-10 h-10 rounded-xl bg-primary/12 bg-primary/10 text-primary grid place-items-center shrink-0">
      <Icone className="w-5 h-5" aria-hidden />
    </div>
    <div>
      <p className="font-semibold text-foreground">{titulo}</p>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  </div>
);

/** Deixa claro que a equipe já sabe e está trabalhando: o cliente não precisa avisar. */
const JaAvisados = ({ texto }: { texto: string }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/[0.07] px-5 py-4">
    <span className="w-9 h-9 rounded-full bg-success text-white grid place-items-center shrink-0">
      <Check className="w-5 h-5" aria-hidden />
    </span>
    <div>
      <p className="font-semibold text-foreground">{texto}</p>
      <p className="text-sm text-muted-foreground">Você não precisa nos chamar. Se quiser falar com a gente, o WhatsApp está aqui do lado.</p>
    </div>
  </div>
);

const BotaoZap = ({ pedido, texto, children = "Falar no WhatsApp", grande = false }: { pedido: PedidoPublico; texto: string; children?: ReactNode; grande?: boolean }) => (
  <Button asChild variant="outline" size={grande ? "lg" : "default"} className="rounded-xl">
    <a href={linkWhatsapp(mensagemPedido(pedido, texto))} target="_blank" rel="noopener noreferrer" onClick={() => registrar("clique_whatsapp", "pedido")}>
      <MessageCircle className="w-4 h-4 mr-2" aria-hidden />
      {children}
    </a>
  </Button>
);

// ---------------------------------------------------------------------------
// 1. Pedido
// ---------------------------------------------------------------------------
export const PainelPedido = ({ pedido, onAtualiza }: Props) => {
  if (pedido.status === "pre_cadastro") {
    return (
      <>
        <CabecalhoEtapa
          numero={1}
          titulo="Confira seus dados"
          texto="Já preenchemos com o que você mandou. Corrija se precisar e complete onde o negócio aparece na internet."
          selo={<Selo tipo="sua-vez">Sua vez</Selo>}
        />
        <Bloco>
          <FormularioPedido inicial={pedido} textoBotao="Está certo, pode montar a prévia" onEnviar={async (dados) => onAtualiza(await confirmarPedido(pedido.codigo, dados))} />
        </Bloco>
      </>
    );
  }
  const redes = REDES_LISTA.filter((r) => pedido.redes?.[r.chave]);
  return (
    <>
      <CabecalhoEtapa numero={1} titulo="Pedido recebido" texto={`Enviado em ${dataBR(pedido.created_at, true)}.`} selo={<Selo tipo="ok">Concluída</Selo>} />
      <div className="space-y-5">
        <Bloco>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {[
              ["Nome", pedido.nome],
              ["WhatsApp", mascararWhatsapp(pedido.whatsapp)],
              ["Negócio", pedido.negocio],
              ["Cidade e bairro", pedido.cidade],
            ].map(([r, v]) => (
              <div key={r}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{r}</dt>
                <dd className="text-foreground font-medium">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Onde o negócio aparece</dt>
              <dd className="flex flex-wrap gap-2">
                {redes.length ? (
                  redes.map((r) => (
                    <span key={r.chave} className="text-sm rounded-full border border-border px-3 py-1">
                      {r.rotulo}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Ainda não tem redes</span>
                )}
              </dd>
            </div>
          </dl>
        </Bloco>
        {pedido.status !== "no_ar" && pedido.status !== "cancelado" && <EnvioArquivos pedido={pedido} onAtualiza={onAtualiza} />}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// 2. Prévia
// ---------------------------------------------------------------------------
const ComoFuncionaPrevia = () => (
  <Bloco>
    <h3 className="text-lg font-semibold mb-4">Como funciona a prévia</h3>
    <div className="grid sm:grid-cols-3 gap-5">
      <Item icone={Palette} titulo="1. A gente monta" texto="A primeira parte do seu site, com o seu material, para você ver estilo, cores e textos." />
      <Item icone={MessageCircle} titulo="2. Você recebe" texto={`Aqui neste link e no seu WhatsApp, em até ${OFERTA.prazoPreviaHoras} horas úteis.`} />
      <Item icone={Check} titulo="3. Você decide" texto={`Aprova ou pede ${OFERTA.mudancasNaPrevia} mudança grátis. Só paga se aprovar.`} />
    </div>
  </Bloco>
);

const AprovarPrevia = ({ pedido, onAtualiza, viuSoNoZap = false }: { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void; viuSoNoZap?: boolean }) => {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const aprovar = async () => {
    setErro("");
    setEnviando(true);
    try {
      registrar("clique_comecar", viuSoNoZap ? "aprovou_previa_vista_no_whatsapp" : "aprovou_previa");
      onAtualiza(await responderPrevia(pedido.codigo, true, ""));
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  };
  if (!confirmando)
    return (
      <Button size="lg" className="rounded-xl font-semibold" onClick={() => setConfirmando(true)}>
        <Check className="w-5 h-5 mr-2" aria-hidden /> Aprovar a prévia
      </Button>
    );
  return (
    <div className="rounded-xl border border-primary/50 bg-primary/10 p-4 w-full">
      <p className="font-semibold mb-1">Confirmar a aprovação?</p>
      <p className="text-sm text-muted-foreground mb-3">
        Com a prévia aprovada, o próximo passo é o contrato. Depois do pagamento você ainda tem {RODADAS} no site completo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-xl" disabled={enviando} onClick={aprovar}>
          {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Sim, aprovo a prévia
        </Button>
        <Button variant="ghost" className="rounded-xl" disabled={enviando} onClick={() => setConfirmando(false)}>
          Voltar
        </Button>
      </div>
      <Erro texto={erro} />
    </div>
  );
};

export const PainelPrevia = ({ pedido, onAtualiza, atual }: Props) => {
  const s = pedido.status;
  const [pedindoMudanca, setPedindoMudanca] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const podeMudar = pedido.mudancas_usadas < OFERTA.mudancasNaPrevia;

  useEffect(() => {
    if (s === "previa_pronta") registrar("previa_aberta", String(pedido.mudancas_usadas), true);
  }, [s, pedido.mudancas_usadas]);

  // Concluída: prévia aprovada
  if (!atual) {
    const porZap = pedido.previa_aprovada_por === "admin_whatsapp";
    return (
      <>
        <CabecalhoEtapa
          numero={2}
          titulo="Prévia aprovada"
          texto={pedido.previa_aprovada_em ? `Aprovada em ${dataBR(pedido.previa_aprovada_em, true)}${porZap ? ", pelo WhatsApp" : ", aqui pelo site"}.` : undefined}
          selo={<Selo tipo="ok">Concluída</Selo>}
        />
        <Bloco className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-muted-foreground">
            A prévia é a base do seu site. Depois do pagamento você ainda tem {RODADAS} no site completo.
          </p>
          {pedido.previa_url && (
            <Button asChild variant="outline" className="rounded-xl shrink-0">
              <a href={pedido.previa_url} target="_blank" rel="noopener noreferrer">
                Ver a prévia <ExternalLink className="w-4 h-4 ml-2" aria-hidden />
              </a>
            </Button>
          )}
        </Bloco>
      </>
    );
  }

  // Esperando a prévia (montando ou ajustando)
  if (s === "recebido" || s === "mudanca_pedida") {
    const prazo = s === "recebido" ? prazoPrevia(new Date(dataDaEtapa(pedido, "recebido") || pedido.created_at)) : null;
    return (
      <>
        <CabecalhoEtapa
          numero={2}
          titulo={s === "recebido" ? "Estamos montando a sua prévia" : "Estamos ajustando a sua prévia"}
          texto={
            s === "recebido"
              ? `Ela chega aqui e no seu WhatsApp ${mascararWhatsapp(pedido.whatsapp)}. Contamos ${OFERTA.prazoPreviaHoras} horas úteis (${HORARIO.texto}).`
              : "A nova versão aparece aqui e avisamos você no WhatsApp."
          }
          selo={<Selo tipo="nossa-vez">Nossa vez</Selo>}
        />
        <div className="space-y-5">
          <JaAvisados texto={s === "recebido" ? "A equipe já recebeu o seu pedido e está montando a prévia." : "A equipe já recebeu o seu pedido de mudança e está ajustando a prévia."} />
          {prazo && (
            <Bloco className="relative overflow-hidden border-primary/40">
              <div aria-hidden className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <CalendarClock className="w-7 h-7" aria-hidden />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sua prévia chega até</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground first-letter:uppercase">{dataHora(prazo)}</p>
                </div>
              </div>
            </Bloco>
          )}
          {s === "mudanca_pedida" && pedido.mudanca_texto && (
            <Bloco>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">O que você pediu</p>
              <p className="text-foreground">“{pedido.mudanca_texto}”</p>
            </Bloco>
          )}
          <EnvioArquivos pedido={pedido} onAtualiza={onAtualiza} destaque={s === "recebido"} />
          <ComoFuncionaPrevia />
          <Bloco className="border-dashed">
            <h3 className="text-lg font-semibold mb-1">Já recebeu a prévia pelo WhatsApp?</h3>
            <p className="text-sm text-muted-foreground mb-4">Se você já viu e gostou, pode aprovar por aqui também.</p>
            <div className="flex flex-wrap gap-3">
              <AprovarPrevia pedido={pedido} onAtualiza={onAtualiza} viuSoNoZap />
              <BotaoZap pedido={pedido} texto="Tenho uma dúvida sobre a prévia." grande />
            </div>
          </Bloco>
        </div>
      </>
    );
  }

  // Prévia pronta
  const responderMudanca = async () => {
    setErro("");
    if (!texto.trim()) {
      setErro("Conte o que você quer mudar.");
      return;
    }
    setEnviando(true);
    try {
      onAtualiza(await responderPrevia(pedido.codigo, false, texto));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <CabecalhoEtapa
        numero={2}
        titulo={
          <>
            Sua prévia está pronta <Sparkles className="inline w-7 h-7 text-primary -mt-1" aria-hidden />
          </>
        }
        texto="É a primeira parte do seu site, para você ver o estilo. Veja com calma e nos diga o que achou."
        selo={<Selo tipo="sua-vez">Sua vez</Selo>}
      />
      <div className="space-y-5">
        {pedido.previa_url && (
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-[0_30px_80px_-40px_rgba(139,61,245,0.6)]">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
              <span className="flex gap-1.5" aria-hidden>
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground bg-background/60 rounded-md px-3 py-1">{pedido.previa_url.replace(/^https?:\/\//, "")}</span>
              <a href={pedido.previa_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline shrink-0">
                Tela cheia <ExternalLink className="w-4 h-4" aria-hidden />
              </a>
            </div>
            <iframe src={pedido.previa_url} title="Prévia do site" className="w-full h-[62vh] bg-white" />
          </div>
        )}

        <Bloco>
          <div className="grid sm:grid-cols-3 gap-5 mb-6">
            <Item icone={Palette} titulo="Estilo e cores" texto="Veja se o jeito do site combina com o seu negócio." />
            <Item icone={PenLine} titulo={`${OFERTA.mudancasNaPrevia} mudança grátis`} texto="Quer trocar algo agora? É só pedir aqui ou no WhatsApp." />
            <Item icone={Wand2} titulo="Mais ajustes depois" texto={`Depois do pagamento você ainda tem ${RODADAS} no site completo.`} />
          </div>
          {!pedindoMudanca ? (
            <div className="flex flex-wrap gap-3">
              <AprovarPrevia pedido={pedido} onAtualiza={onAtualiza} />
              <BotaoZap pedido={pedido} texto="Vi a prévia e queria conversar." grande />
              {podeMudar && (
                <Button size="lg" variant="ghost" className="rounded-xl" onClick={() => setPedindoMudanca(true)}>
                  <PenLine className="w-4 h-4 mr-2" aria-hidden /> Pedir uma mudança
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="mudanca" className="text-base">
                O que você quer mudar?
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">Seja específico: cor, foto, texto, ordem das seções…</p>
              <Textarea id="mudanca" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
              <div className="flex flex-wrap gap-3 mt-4">
                <Button className="rounded-xl" disabled={enviando} onClick={responderMudanca}>
                  {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enviar pedido de mudança
                </Button>
                <Button variant="ghost" className="rounded-xl" onClick={() => setPedindoMudanca(false)}>
                  Voltar
                </Button>
              </div>
              <Erro texto={erro} />
            </div>
          )}
        </Bloco>
        <p className="text-sm text-muted-foreground">Prefere responder pelo WhatsApp? Sem problema: a gente registra por aqui.</p>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// 3. Contrato
// ---------------------------------------------------------------------------
export const PainelContrato = ({ pedido, onAtualiza, atual }: Props) => {
  const [nome, setNome] = useState(pedido.contrato_nome || pedido.nome);
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState(pedido.email || "");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [concorda, setConcorda] = useState(false);
  /** Mostra rua e bairro do CEP, para o cliente conferir (ViaCEP, público e gratuito). */
  const buscarCep = (d: string) =>
    fetch(`https://viacep.com.br/ws/${d}/json/`)
      .then((r) => r.json())
      .then((j) => setEndereco(j.erro ? "CEP não encontrado. Confira os números." : [j.logradouro, j.bairro, `${j.localidade}/${j.uf}`].filter(Boolean).join(", ")))
      .catch(() => setEndereco(""));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [lendo, setLendo] = useState(false);
  const preco = precoAtual(pedido.contrato_aceito_em ? new Date(pedido.contrato_aceito_em) : new Date());

  if (!atual) {
    return (
      <>
        <CabecalhoEtapa
          numero={3}
          titulo="Contrato aceito"
          texto={`Aceito por ${pedido.contrato_nome || pedido.nome} em ${dataBR(pedido.contrato_aceito_em, true)} (versão ${pedido.contrato_versao}).`}
          selo={<Selo tipo="ok">Concluída</Selo>}
        />
        <Bloco>
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setLendo((v) => !v)}>
              <FileText className="w-4 h-4 mr-2" aria-hidden /> {lendo ? "Esconder o contrato" : "Ler o contrato"}
            </Button>
            <Button asChild variant="ghost" className="rounded-xl">
              <Link to="/contrato" target="_blank">
                Abrir em outra aba <ExternalLink className="w-4 h-4 ml-2" aria-hidden />
              </Link>
            </Button>
          </div>
          {lendo && (
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-border p-4 md:p-6">
              <TextoContrato compacto />
            </div>
          )}
        </Bloco>
      </>
    );
  }

  const aceitar = async () => {
    setErro("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErro("Confira o e-mail.");
    if (cep.replace(/\D/g, "").length !== 8) return setErro("Confira o CEP (8 números).");
    if (!numero.trim()) return setErro("Informe o número do endereço (ou S/N).");
    if (!concorda) return setErro("Marque que você leu e concorda com o contrato.");
    setEnviando(true);
    try {
      onAtualiza(await aceitarContrato(pedido.codigo, nome, documento, CONTRATO_VERSAO, email.trim().toLowerCase(), { cep, numero, complemento }));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <CabecalhoEtapa numero={3} titulo="Prévia aprovada! Agora, o contrato" texto="Leia com calma. Depois do aceite vem o pagamento, e começamos o site completo." selo={<Selo tipo="sua-vez">Sua vez</Selo>} />
      <div className="space-y-5">
        <Bloco className="border-primary/40">
          <h3 className="font-semibold mb-4">O que você está contratando</h3>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-foreground/90">
            {[
              <>
                <strong>{brl(preco.pix)} no Pix ou boleto</strong>, ou a partir de {brl(preco.cartao)} no cartão, em até {CARTAO.parcelasMax}x
                {preco.promo && <SeloBlackFriday className="ml-2 align-middle" />}
              </>,
              <>Site completo em até {PRAZO_SITE} depois do pagamento</>,
              <>Perfil do Google completo: fotos, horário e serviços</>,
              <>1º mês de hospedagem e manutenção incluso</>,
              <>Depois, {brl(OFERTA.mensalidade)}/mês. Cancele quando quiser, sem multa</>,
              <>Desistiu em até 7 dias depois de pagar? Devolvemos tudo</>,
            ].map((t, i) => (
              <div key={i} className="flex gap-2">
                <Check className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </Bloco>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Contrato completo</p>
          <div className="max-h-[42vh] overflow-y-auto rounded-2xl border border-border bg-card/70 p-5 md:p-7">
            <TextoContrato compacto />
          </div>
        </div>
        <Bloco>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div className="space-y-2">
              <Label htmlFor="contrato-nome">Nome completo ou razão social</Label>
              <Input id="contrato-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-doc">CPF ou CNPJ</Label>
              <Input id="contrato-doc" inputMode="numeric" value={documento} onChange={(e) => setDocumento(e.target.value.replace(/[^\d./-]/g, "").slice(0, 18))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contrato-email">E-mail</Label>
              <Input id="contrato-email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <p className="text-sm text-muted-foreground">Para receber a nota fiscal e entrar na sua área quando quiser, com um código no e-mail.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrato-cep">CEP</Label>
              <Input
                id="contrato-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
                  if (d.length === 8) buscarCep(d);
                  else setEndereco("");
                }}
              />
              {endereco && <p className="text-sm text-muted-foreground">{endereco}</p>}
            </div>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
              <div className="space-y-2">
                <Label htmlFor="contrato-numero">Número</Label>
                <Input id="contrato-numero" value={numero} onChange={(e) => setNumero(e.target.value.slice(0, 20))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrato-compl">
                  Complemento <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input id="contrato-compl" value={complemento} onChange={(e) => setComplemento(e.target.value.slice(0, 80))} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2 -mt-2">O endereço vai só na nota fiscal, que a prefeitura exige.</p>
          </div>
          <div className="flex items-start gap-3 mb-5">
            <Checkbox id="concorda" checked={concorda} onCheckedChange={(v) => setConcorda(v === true)} />
            <Label htmlFor="concorda" className="font-normal leading-relaxed">
              Li e concordo com o contrato (versão {CONTRATO_VERSAO}).
            </Label>
          </div>
          <Button size="lg" className="rounded-xl font-semibold" disabled={enviando} onClick={aceitar}>
            {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Aceitar e ir para o pagamento
          </Button>
          <Erro texto={erro} />
        </Bloco>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// 4. Pagamento
// ---------------------------------------------------------------------------
export const PainelPagamento = ({ pedido, onAtualiza, atual }: Props) => {
  const preco = precoAtual(pedido.contrato_aceito_em ? new Date(pedido.contrato_aceito_em) : new Date());
  const docs = useDocumentos(pedido.codigo, !atual);

  if (!atual) {
    return (
      <>
        <CabecalhoEtapa numero={4} titulo="Pagamento confirmado" texto={pedido.pago_em ? `Confirmado em ${dataBR(pedido.pago_em, true)}.` : undefined} selo={<Selo tipo="ok">Concluída</Selo>} />
        <Bloco>
          <h3 className="text-lg font-semibold mb-1">Seus pagamentos</h3>
          <p className="text-sm text-muted-foreground mb-4">O recibo sai na hora. A nota fiscal aparece aqui assim que for emitida.</p>
          <ListaPagamentos pedido={pedido} docs={docs} />
        </Bloco>
      </>
    );
  }

  return (
    <>
      <CabecalhoEtapa numero={4} titulo="Pagamento" texto="Contrato aceito. Falta só o pagamento para começarmos o seu site completo." selo={<Selo tipo="sua-vez">Sua vez</Selo>} />
      <div className="rounded-2xl border border-primary/40 bg-card/70 overflow-hidden">
        {/* O que está sendo pago: a própria prévia do cliente faz o papel da "foto do produto" */}
        <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-border bg-background/40">
          {pedido.previa_url ? (
            <div className="relative w-28 h-[76px] shrink-0 overflow-hidden rounded-lg border border-border bg-white" aria-hidden>
              <iframe
                src={pedido.previa_url}
                title="Miniatura da prévia"
                tabIndex={-1}
                loading="lazy"
                className="absolute left-0 top-0 w-[1280px] h-[870px] origin-top-left scale-[0.0875] pointer-events-none"
              />
            </div>
          ) : (
            <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <Globe className="w-6 h-6" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Você está contratando</p>
            <p className="font-semibold text-foreground line-clamp-2">Site + Perfil do Google · {pedido.negocio}</p>
            <p className="text-sm text-muted-foreground">Site completo em até {PRAZO_SITE} · 1º mês de manutenção incluso</p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-4xl font-bold">{brl(preco.pix)}</p>
            <span className="text-lg font-medium text-muted-foreground">no Pix ou boleto</span>
            {preco.promo && <SeloBlackFriday />}
          </div>
          <p className="text-muted-foreground">
            ou {brl(preco.cartao)} no cartão, {PARCELAS_TEXTO}
          </p>
          {preco.promo && (
            <p className="text-sm text-muted-foreground mt-1">
              Preço de Black Friday até {preco.ate}. Depois, {brl(OFERTA.precoPix)} no Pix.
            </p>
          )}
          <p className="inline-flex items-center gap-2 text-sm text-foreground mt-3">
            <Check className="w-4 h-4 text-success" aria-hidden /> Sem taxa extra: o valor é esse.
          </p>

          <Checkout pedido={pedido} onAtualiza={onAtualiza} precoPix={preco.pix} precoCartao={preco.cartao} />

          {/* Garantia logo abaixo do botão: tira o risco de quem ainda está em dúvida */}
          <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/[0.07] px-4 py-3 mt-5">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm">
              <strong className="text-foreground">Garantia de 7 dias.</strong>{" "}
              <span className="text-muted-foreground">Desistiu em até 7 dias depois de pagar? Devolvemos o valor integral. Está no contrato.</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 sm:px-6 py-4 border-t border-border bg-background/40 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-success" aria-hidden /> Pagamento seguro e criptografado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-success" aria-hidden /> Recibo e nota fiscal aqui no seu link
          </span>
          <span>Processado pelo Asaas</span>
          {CONTRATADA.cnpj && <span>Codifica · CNPJ {CONTRATADA.cnpj}</span>}
        </div>
      </div>
    </>
  );
};

/**
 * Checkout: o cliente escolhe a forma, a cobrança é criada no Asaas e a página
 * acompanha sozinha até o pagamento cair (sem precisar mandar comprovante).
 */
const Checkout = ({ pedido, onAtualiza, precoPix, precoCartao }: { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void; precoPix: number; precoCartao: number }) => {
  const [forma, setForma] = useState<FormaPagamentoSite>("pix");
  const [parcelas, setParcelas] = useState(OFERTA.parcelasSemJuros);
  const opcoes = tabelaCartao(precoCartao);
  const opcao = opcoes[parcelas - 1];
  const [cobranca, setCobranca] = useState<CobrancaGerada | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Confere o pedido de tempos em tempos: quando o Asaas confirmar, a página avança sozinha
  useEffect(() => {
    if (!cobranca) return;
    const conferir = async () => {
      try {
        const p = await verPedido(pedido.codigo);
        if (p && p.status !== pedido.status) onAtualiza(p);
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    };
    const id = window.setInterval(conferir, 5000);
    const aoVoltar = () => document.visibilityState === "visible" && conferir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [cobranca, pedido.codigo, pedido.status, onAtualiza]);

  const escolher = (f: FormaPagamentoSite) => {
    setForma(f);
    setErro("");
    if (cobranca?.forma !== f) setCobranca(null);
  };

  const gerar = async () => {
    setErro("");
    setGerando(true);
    // o cartão abre numa aba nova: abre já (antes do await) para o navegador não bloquear
    const aba = forma === "cartao" ? window.open("", "_blank") : null;
    try {
      const c = await gerarPagamento(pedido.codigo, forma, forma === "cartao" ? parcelas : 1);
      setCobranca(c);
      registrar("clique_pagar", forma);
      if (c.forma === "cartao") {
        if (aba) aba.location.href = c.url;
        else window.location.href = c.url;
      } else if (c.forma === "boleto") {
        aba?.close();
      }
    } catch (e) {
      aba?.close();
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const copiar = (texto: string) =>
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });

  const ROTULO_BOTAO: Record<FormaPagamentoSite, string> = {
    pix: `Gerar Pix de ${brl(precoPix)}`,
    boleto: `Gerar boleto de ${brl(precoPix)}`,
    cartao: parcelas === 1 ? `Pagar ${brl(opcao.total)} no cartão` : `Pagar em ${parcelas}x de ${brl(opcao.valorParcela)}`,
  };

  return (
    <>
      <FormasPagamento escolhida={forma} onEscolher={escolher} />

      {forma === "cartao" && !cobranca && (
        <div className="mb-5 max-w-sm">
          <Label htmlFor="parcelas" className="text-sm">
            Em quantas vezes?
          </Label>
          <select
            id="parcelas"
            value={parcelas}
            onChange={(e) => setParcelas(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {opcoes.map((o) => (
              <option key={o.parcelas} value={o.parcelas}>
                {o.parcelas}x de {brl(o.valorParcela)}
                {o.semJuros ? " sem juros" : ` (total ${brl(o.total)})`}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {opcao.semJuros
              ? `Até ${OFERTA.parcelasSemJuros}x sem juros: o total é ${brl(opcao.total)}.`
              : `Total de ${brl(opcao.total)} em ${parcelas}x. Para pagar menos, escolha até ${OFERTA.parcelasSemJuros}x sem juros.`}
          </p>
        </div>
      )}

      {pedido.pagamento_status === "aguardando" && !cobranca && (
        <p className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 mb-4 text-sm">Estamos aguardando a confirmação do seu pagamento. Boletos levam de 1 a 3 dias úteis para compensar.</p>
      )}

      {!cobranca && (
        <Button size="lg" className="w-full sm:w-auto rounded-xl font-semibold" disabled={gerando} onClick={gerar}>
          {gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> : <Lock className="w-4 h-4 mr-2" aria-hidden />}
          {ROTULO_BOTAO[forma]}
        </Button>
      )}
      <Erro texto={erro} />

      {cobranca?.forma === "pix" && (
        <div className="rounded-2xl border border-[#32BCAD]/50 bg-[#32BCAD]/[0.06] p-5 flex flex-col sm:flex-row gap-5 items-center">
          <img src={`data:image/png;base64,${cobranca.qr}`} alt="QR Code do Pix" className="w-48 h-48 rounded-xl bg-white p-2 shrink-0" />
          <div className="w-full min-w-0">
            <p className="font-semibold text-foreground mb-1">Pix de {brl(cobranca.valor)}</p>
            <p className="text-sm text-muted-foreground mb-3">Abra o app do seu banco e leia o QR Code, ou use o Pix copia e cola.</p>
            <Button variant="outline" className="w-full rounded-xl mb-3" onClick={() => copiar(cobranca.copiaECola)}>
              {copiado ? <Check className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiado ? "Código copiado" : "Copiar código Pix"}
            </Button>
            <AguardandoConfirmacao texto="Assim que o Pix cair, esta página avança sozinha. Não precisa mandar comprovante." />
          </div>
        </div>
      )}

      {cobranca?.forma === "boleto" && (
        <div className="rounded-2xl border border-border p-5">
          <p className="font-semibold text-foreground mb-1">Boleto de {brl(cobranca.valor)}</p>
          <p className="text-sm text-muted-foreground mb-4">Vence em 3 dias. Depois de pago, leva de 1 a 3 dias úteis para compensar, e a gente começa assim que cair.</p>
          <Button asChild size="lg" className="w-full sm:w-auto rounded-xl font-semibold mb-4">
            <a href={cobranca.url} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-2" aria-hidden /> Abrir o boleto
            </a>
          </Button>
          <AguardandoConfirmacao texto="Quando o boleto compensar, esta página avança sozinha." />
        </div>
      )}

      {cobranca?.forma === "cartao" && (
        <div className="rounded-2xl border border-border p-5">
          <p className="font-semibold text-foreground mb-1">Pagamento com cartão</p>
          <p className="text-sm text-muted-foreground mb-4">
            Abrimos a página segura do Asaas numa aba nova: {cobranca.parcelas > 1 ? `${cobranca.parcelas}x, total de ${brl(cobranca.valor)}` : brl(cobranca.valor)}.
          </p>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-xl font-semibold mb-4">
            <a href={cobranca.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" aria-hidden /> Abrir a página de pagamento
            </a>
          </Button>
          <AguardandoConfirmacao texto="Pagou? Pode voltar para esta aba: ela avança sozinha quando o cartão for aprovado." />
        </div>
      )}
    </>
  );
};

const AguardandoConfirmacao = ({ texto }: { texto: string }) => (
  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
    <span className="relative flex w-2.5 h-2.5 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-success" />
    </span>
    {texto}
  </p>
);

/** Formas de pagamento com as marcas que o cliente reconhece (Pix e bandeiras). */
const FormasPagamento = ({ escolhida, onEscolher }: { escolhida: FormaPagamentoSite; onEscolher: (f: FormaPagamentoSite) => void }) => {
  const classe = (f: FormaPagamentoSite) =>
    `rounded-xl border px-3 py-3 text-center transition-colors ${
      escolhida === f ? (f === "pix" ? "border-[#32BCAD] bg-[#32BCAD]/[0.10] ring-1 ring-[#32BCAD]" : "border-primary bg-primary/10 ring-1 ring-primary") : "border-border hover:border-primary/50"
    }`;
  return (
  <div className="grid grid-cols-3 gap-2 my-6" role="radiogroup" aria-label="Forma de pagamento">
    <button type="button" role="radio" aria-checked={escolhida === "pix"} onClick={() => onEscolher("pix")} className={classe("pix")}>
      <div className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <g fill="#32BCAD">
            <path d="M12 2.5 7.6 6.9a3 3 0 0 1 2.1.9L12 10.1l2.3-2.3a3 3 0 0 1 2.1-.9Z" />
            <path d="M12 21.5l4.4-4.4a3 3 0 0 1-2.1-.9L12 13.9l-2.3 2.3a3 3 0 0 1-2.1.9Z" />
            <path d="M6.1 8.4 2.5 12l3.6 3.6h1.5a1.9 1.9 0 0 0 1.3-.6L11.2 12.7a1.1 1.1 0 0 0 0-1.4L8.9 9a1.9 1.9 0 0 0-1.3-.6Z" />
            <path d="M17.9 8.4h-1.5a1.9 1.9 0 0 0-1.3.6l-2.3 2.3a1.1 1.1 0 0 0 0 1.4l2.3 2.3a1.9 1.9 0 0 0 1.3.6h1.5l3.6-3.6Z" />
          </g>
        </svg>
        Pix
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">aprovado na hora</p>
    </button>
    <button type="button" role="radio" aria-checked={escolhida === "boleto"} onClick={() => onEscolher("boleto")} className={classe("boleto")}>
      <p className="font-semibold text-foreground">Boleto</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">1 a 3 dias úteis</p>
    </button>
    <button type="button" role="radio" aria-checked={escolhida === "cartao"} onClick={() => onEscolher("cartao")} className={classe("cartao")}>
      <p className="font-semibold text-foreground">Cartão</p>
      <div className="flex flex-wrap items-center justify-center gap-1 mt-1" aria-label="Visa, Mastercard e Elo">
        <span className="shrink-0 rounded bg-white px-1 text-[9px] font-extrabold italic leading-4 text-[#1a1f71]">VISA</span>
        <span className="relative shrink-0 inline-flex h-4 w-6 rounded bg-white" aria-hidden>
          <span className="absolute left-[3px] top-[3px] h-2.5 w-2.5 rounded-full bg-[#eb001b]" />
          <span className="absolute right-[3px] top-[3px] h-2.5 w-2.5 rounded-full bg-[#f79e1b] mix-blend-multiply" />
        </span>
        <span className="shrink-0 rounded bg-black px-1 text-[9px] font-bold leading-4 text-white border border-white/20">elo</span>
      </div>
    </button>
  </div>
  );
};

// ---------------------------------------------------------------------------
// 5. Produção
// ---------------------------------------------------------------------------
export const PainelProducao = ({ pedido, onAtualiza, atual }: Props) => {
  if (!atual) {
    return (
      <>
        <CabecalhoEtapa numero={5} titulo="Produção concluída" texto={`O site foi publicado em ${dataBR(dataDaEtapa(pedido, "no_ar"), true)}.`} selo={<Selo tipo="ok">Concluída</Selo>} />
        <Bloco>
          <p className="text-muted-foreground">Site completo, Perfil do Google e revisão com você: tudo feito.</p>
        </Bloco>
      </>
    );
  }
  const prazo = dataCurta(new Date(new Date(pedido.pago_em || Date.now()).getTime() + OFERTA.prazoEntregaDias * 86400000));
  const PASSOS = [
    { icone: Hammer, titulo: "Montando o site completo", texto: "Todas as seções, com o seu material." },
    { icone: Globe, titulo: "Completando o Perfil do Google", texto: "Fotos, horário, serviços e link do site." },
    { icone: PenLine, titulo: `Revisão com você (${RODADAS})`, texto: "Antes de publicar, você vê tudo e pede ajustes." },
    { icone: Sparkles, titulo: "Publicação no ar", texto: "No seu domínio, aparecendo no Google." },
  ];
  return (
    <>
      <CabecalhoEtapa numero={5} titulo="Seu site está em produção" texto={`Pagamento confirmado. O site completo fica pronto até ${prazo}.`} selo={<Selo tipo="nossa-vez">Nossa vez</Selo>} />
      <div className="space-y-5">
        <JaAvisados texto="A equipe já foi avisada do pagamento e começou o seu site completo." />
        <Bloco>
          <ol className="space-y-5">
            {PASSOS.map(({ icone: Icone, titulo, texto }, i) => (
              <li key={titulo} className="flex gap-4">
                <div className={`w-10 h-10 rounded-full grid place-items-center shrink-0 ${i < 2 ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}>
                  <Icone className="w-5 h-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {titulo} {i < 2 && <span className="text-xs font-medium text-primary ml-1">em andamento</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </Bloco>
        <EnvioArquivos pedido={pedido} onAtualiza={onAtualiza} />
        <div className="flex flex-wrap gap-3">
          <BotaoZap pedido={pedido} texto="Tenho uma dúvida sobre o site." />
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// 6. No ar
// ---------------------------------------------------------------------------
const CartaoManutencao = ({ pedido, onAtualiza }: { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void }) => {
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  if (pedido.manutencao_status === "cancelada") {
    return (
      <Bloco>
        <h3 className="text-lg font-semibold mb-1">Manutenção cancelada</h3>
        <p className="text-muted-foreground mb-4">
          {pedido.manutencao_cancelada_em && `Cancelada em ${dataBR(pedido.manutencao_cancelada_em)}. `}
          Vamos combinar pelo WhatsApp a transferência do domínio, do Perfil do Google e dos arquivos. Os arquivos e as
          instruções também ficam aqui, para você baixar quando quiser.
        </p>
        <BotaoZap pedido={pedido} texto="Cancelei a manutenção e queria combinar a transferência.">
          Combinar a transferência
        </BotaoZap>
      </Bloco>
    );
  }
  const confirmar = async () => {
    setErro("");
    setEnviando(true);
    try {
      onAtualiza(await cancelarManutencao(pedido.codigo, motivo));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Bloco>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-lg font-semibold">Manutenção mensal</h3>
        <Selo tipo="ok">Ativa</Selo>
      </div>
      <p className="text-muted-foreground mb-4">
        {brl(OFERTA.mensalidade)}/mês a partir do 2º mês: cuidamos do site e do seu Perfil do Google, e ajustes são pedidos pelo
        WhatsApp. Cancele quando quiser, sem multa.
      </p>
      {!cancelando ? (
        <div className="flex flex-wrap gap-2">
          <BotaoZap pedido={pedido} texto="Queria pedir um ajuste no site.">
            Pedir um ajuste
          </BotaoZap>
          <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => setCancelando(true)}>
            Cancelar a manutenção
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm">
            Sem a manutenção, transferimos o domínio, o Perfil do Google e os arquivos para você, sem custo. A hospedagem e o
            domínio passam a ser pagos por você direto a um provedor. O mês já pago vale até o fim.
          </p>
          <Label htmlFor="motivo-cancelamento" className="text-sm">
            Quer contar o motivo? <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Textarea id="motivo-cancelamento" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="destructive" className="rounded-xl" disabled={enviando} onClick={confirmar}>
              {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar cancelamento
            </Button>
            <Button variant="ghost" className="rounded-xl" onClick={() => setCancelando(false)}>
              Manter a manutenção
            </Button>
          </div>
          <Erro texto={erro} />
        </div>
      )}
    </Bloco>
  );
};

/** Avaliação: pedida quando o site vai ao ar (vira depoimento se o cliente autorizar). */
const Avaliacao = ({ pedido, onAtualiza }: { pedido: PedidoPublico; onAtualiza: (p: PedidoPublico) => void }) => {
  const feita = pedido.avaliacao;
  const [nota, setNota] = useState(feita?.nota || 0);
  const [passando, setPassando] = useState(0);
  const [comentario, setComentario] = useState(feita?.comentario || "");
  const [publicar, setPublicar] = useState(true);
  const [editando, setEditando] = useState(!feita);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async () => {
    setErro("");
    if (!nota) return setErro("Escolha de 1 a 5 estrelas.");
    setEnviando(true);
    try {
      onAtualiza(await avaliarPedido(pedido.codigo, nota, comentario, publicar));
      setEditando(false);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  if (!editando && feita) {
    return (
      <Bloco className="border-amber-400/40 bg-amber-400/[0.05]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-foreground">Obrigado pela avaliação!</p>
            <p className="text-amber-300 text-xl tracking-widest" aria-label={`${feita.nota} de 5 estrelas`}>
              {"★".repeat(feita.nota)}
              <span className="text-muted-foreground/40">{"★".repeat(5 - feita.nota)}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setEditando(true)}>
            Editar
          </Button>
        </div>
      </Bloco>
    );
  }

  return (
    <Bloco className="border-amber-400/40 bg-amber-400/[0.05]">
      <h3 className="text-lg font-semibold mb-1">Como foi fazer o site com a Codifica?</h3>
      <p className="text-sm text-muted-foreground mb-4">Leva 30 segundos e ajuda muito a gente a crescer.</p>
      <div className="flex gap-1 mb-4" role="radiogroup" aria-label="Nota de 1 a 5" onMouseLeave={() => setPassando(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setPassando(n)}
            onClick={() => setNota(n)}
            className={`text-4xl leading-none transition-transform hover:scale-110 ${n <= (passando || nota) ? "text-amber-300" : "text-muted-foreground/30"}`}
          >
            ★
          </button>
        ))}
      </div>
      <Label htmlFor="avaliacao-texto" className="text-sm">
        Quer contar como foi? <span className="text-muted-foreground font-normal">(opcional)</span>
      </Label>
      <Textarea id="avaliacao-texto" rows={3} className="mt-1 mb-3" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="O que você achou do site e do atendimento?" />
      <div className="flex items-start gap-3 mb-4">
        <Checkbox id="avaliacao-publicar" checked={publicar} onCheckedChange={(v) => setPublicar(v === true)} />
        <Label htmlFor="avaliacao-publicar" className="font-normal text-sm leading-relaxed">
          Pode mostrar minha avaliação no site da Codifica, com o nome do meu negócio.
        </Label>
      </div>
      <Button className="rounded-xl" disabled={enviando} onClick={enviar}>
        {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enviar avaliação
      </Button>
      <Erro texto={erro} />
    </Bloco>
  );
};

export const PainelNoAr = ({ pedido, onAtualiza }: Props) => {
  const docs = useDocumentos(pedido.codigo, true);
  return (
    <>
      <CabecalhoEtapa
        numero={6}
        titulo="Seu site está no ar! 🎉"
        texto={`Publicado em ${dataBR(dataDaEtapa(pedido, "no_ar"))}. Agora é com o Google: quem procura o seu serviço já encontra você.`}
        selo={<Selo tipo="ok">Concluída</Selo>}
      />
      <div className="space-y-5">
        {pedido.site_url && (
          <Bloco className="relative overflow-hidden border-success/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div aria-hidden className="absolute -left-10 -bottom-16 w-56 h-56 rounded-full bg-success/15 blur-3xl" />
            <div className="relative">
              <p className="text-sm text-muted-foreground">Seu endereço</p>
              <p className="text-xl font-bold text-foreground break-all">{pedido.site_url.replace(/^https?:\/\//, "")}</p>
            </div>
            <Button asChild size="lg" className="rounded-xl font-semibold relative shrink-0">
              <a href={pedido.site_url} target="_blank" rel="noopener noreferrer">
                Abrir meu site <ExternalLink className="w-4 h-4 ml-2" aria-hidden />
              </a>
            </Button>
          </Bloco>
        )}
        <Avaliacao pedido={pedido} onAtualiza={onAtualiza} />
        <CartaoManutencao pedido={pedido} onAtualiza={onAtualiza} />
        <ArquivosEntrega pedido={pedido} docs={docs} />
      </div>
    </>
  );
};
