// Camada do Asaas: tudo que fala com o gateway fica aqui.
// Para trocar de gateway no futuro, só esta camada e as duas funções mudam.
//
// Secrets (Supabase → Edge Functions → Secrets), colados pela equipe:
//   ASAAS_API_KEY   chave da API ($aact_hmlg_... no sandbox, $aact_prod_... na conta real)
//   ASAAS_AMBIENTE  "sandbox" (padrão) ou "producao"
//   ASAAS_WEBHOOK_TOKEN  (opcional) o mesmo token cadastrado no webhook do Asaas

const AMBIENTE = Deno.env.get("ASAAS_AMBIENTE") === "producao" ? "producao" : "sandbox";
const BASE = AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

export class ErroAsaas extends Error {
  constructor(public status: number, public detalhe: unknown) {
    super(`asaas ${status}: ${JSON.stringify(detalhe)}`);
  }
}

export async function asaas<T = Record<string, unknown>>(caminho: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const chave = Deno.env.get("ASAAS_API_KEY");
  if (!chave) throw new ErroAsaas(500, "ASAAS_API_KEY não configurada");
  const r = await fetch(BASE + caminho, {
    method: init.method || "GET",
    headers: { "Content-Type": "application/json", "User-Agent": "codifica-site", access_token: chave },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : {};
  if (!r.ok) throw new ErroAsaas(r.status, dados);
  return dados as T;
}

// ---------------------------------------------------------------------------
// Preço (espelho de src/config/oferta.ts: manter os dois iguais)
// ---------------------------------------------------------------------------
const OFERTA = { precoPix: 597, precoCartao: 650, parcelasSemJuros: 3 };
const CARTAO = {
  parcelasMax: 12,
  taxaFixa: 0.49,
  taxa: (n: number) => (n === 1 ? 0.0199 : n <= 6 ? 0.0249 : 0.0299),
  antecipacaoMes: 0.016,
};

/** Valor da parcela e total para n parcelas (espelho de tabelaCartao em src/config/oferta.ts). */
export function opcaoCartao(precoCartao: number, n: number) {
  const n3 = OFERTA.parcelasSemJuros;
  if (n <= n3) return { parcelas: n, total: precoCartao };
  const liquido3 = precoCartao * (1 - CARTAO.taxa(n3) - (CARTAO.antecipacaoMes * (n3 + 1)) / 2) - CARTAO.taxaFixa;
  const bruto = (liquido3 + CARTAO.taxaFixa) / (1 - CARTAO.taxa(n) - (CARTAO.antecipacaoMes * (n + 1)) / 2);
  const valorParcela = Math.ceil((bruto / n) * 100) / 100;
  return { parcelas: n, total: Math.round(valorParcela * n * 100) / 100 };
}
export const PARCELAS_MAX = CARTAO.parcelasMax;
const BLACK_FRIDAY = { precoPix: 499, precoCartao: 567, ate: new Date("2026-11-30T23:59:59-03:00") };

/** Vale o preço do dia do aceite do contrato. */
export function precoDoPedido(contratoAceitoEm: string | null) {
  const dia = contratoAceitoEm ? new Date(contratoAceitoEm) : new Date();
  const promo = dia <= BLACK_FRIDAY.ate;
  return {
    pix: promo ? BLACK_FRIDAY.precoPix : OFERTA.precoPix,
    cartao: promo ? BLACK_FRIDAY.precoCartao : OFERTA.precoCartao,
  };
}

/** Data de hoje + n dias, no fuso de São Paulo (YYYY-MM-DD). */
export function diaSP(n = 0) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

// ---------------------------------------------------------------------------
// Nota fiscal (NFS-e) emitida pelo Asaas
// Serviço: código de tributação nacional 01.08.01 (páginas eletrônicas), o mesmo
// cadastrado como padrão em Notas Fiscais → Configurações no Asaas.
// Só emite na conta real (ASAAS_AMBIENTE=producao). No sandbox a doc do Asaas não
// garante que a nota é simulada, e o acesso ao Portal Nacional pode ser o real:
// uma nota de teste viraria NFS-e de verdade. Para testar no sandbox mesmo assim,
// ASAAS_NF_SANDBOX = "1". ASAAS_NF_DESLIGADA = "1" desliga em qualquer ambiente.
// MEI: imposto já pago no DAS, então ISS e retenções vão zerados.
// ---------------------------------------------------------------------------
export const NOTA = {
  ligada: () =>
    Deno.env.get("ASAAS_NF_DESLIGADA") !== "1" && (AMBIENTE === "producao" || Deno.env.get("ASAAS_NF_SANDBOX") === "1"),
  servicoCodigo: "01.08.01",
  servicoNome: "Planejamento, confecção, manutenção e atualização de páginas eletrônicas.",
  descricao:
    "Criação de site de uma página, adaptado para celular, e configuração do Perfil da Empresa no Google, com o 1º mês de hospedagem e manutenção.",
  descricaoMensalidade: "Manutenção mensal de site: hospedagem, domínio, atualização do Perfil da Empresa no Google e ajustes solicitados.",
  emitidaPor: "MEI 67.544.631/0001-42",
  impostos: { retainIss: false, iss: 0, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
};

export const soDigitos = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

export const MENSALIDADE = 49; // espelho de OFERTA.mensalidade
export const PRAZO_ENTREGA_DIAS = 7;

/** Data curta em pt-BR, ex.: "sáb, 14/11". */
export const dataCurtaSP = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).replace(".", "");

/** Cliente no Asaas: reaproveita o do pedido ou cria com os dados do aceite do contrato. */
// deno-lint-ignore no-explicit-any
export async function garantirCliente(db: any, p: Record<string, any>): Promise<string | null> {
  if (p.asaas_cliente_id) return p.asaas_cliente_id;
  const doc = soDigitos(p.contrato_documento);
  if (doc.length !== 11 && doc.length !== 14) return null;
  const cliente = await asaas<{ id: string }>("/customers", {
    method: "POST",
    body: {
      name: p.contrato_nome || p.nome,
      cpfCnpj: doc,
      email: p.email || undefined,
      mobilePhone: soDigitos(p.whatsapp) || undefined,
      ...enderecoFiscal(p),
      externalReference: p.id,
      notificationDisabled: true, // quem avisa o cliente são os nossos e-mails e a página
    },
  });
  await db.from("pedidos").update({ asaas_cliente_id: cliente.id }).eq("id", p.id);
  return cliente.id;
}

/** E-mail e endereço que a nota fiscal exige (o Asaas completa rua e bairro pelo CEP). */
// deno-lint-ignore no-explicit-any
export const enderecoFiscal = (p: Record<string, any>) =>
  p.contrato_cep ? { postalCode: p.contrato_cep, addressNumber: p.contrato_numero || "S/N", complement: p.contrato_complemento || undefined } : {};

/** Garante que o cliente no Asaas tem e-mail e endereço antes de pedir a nota. */
// deno-lint-ignore no-explicit-any
export async function completarClienteFiscal(p: Record<string, any>) {
  if (!p.asaas_cliente_id || !p.contrato_cep) return;
  await asaas(`/customers/${p.asaas_cliente_id}`, { method: "POST", body: { email: p.email || undefined, ...enderecoFiscal(p) } });
}

/** Registra um envio antes de mandar: devolve false se já foi enviado (não manda duas vezes). */
// deno-lint-ignore no-explicit-any
export async function marcarEnvio(db: any, pedidoId: string, tipo: string, destino: string | null, canal = "email"): Promise<boolean> {
  const { error } = await db.from("envios").insert({ pedido_id: pedidoId, tipo, destino, canal });
  if (!error) return true;
  if (error.code !== "23505") console.error("envios", error);
  return false;
}
// deno-lint-ignore no-explicit-any
export const desfazerEnvio = (db: any, pedidoId: string, tipo: string) => db.from("envios").delete().eq("pedido_id", pedidoId).eq("tipo", tipo);
