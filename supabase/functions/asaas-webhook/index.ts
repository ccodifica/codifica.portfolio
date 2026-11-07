// Edge Function: asaas-webhook  (sem verificação de JWT: quem chama é o Asaas)
//
// URL cadastrada no Asaas (Integrações → Webhooks):
//   https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/asaas-webhook
// Eventos: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE,
//          PAYMENT_REFUNDED, PAYMENT_CREDIT_CARD_CAPTURE_REFUSED,
//          PAYMENT_REPROVED_BY_RISK_ANALYSIS, INVOICE_AUTHORIZED, INVOICE_ERROR.
//
// Implantação paga: pedido → pago, lançamento no Financeiro, comprovante por e-mail, nota.
// Mensalidade (assinatura): e-mail da cobrança, recibo, nota e aviso de atraso
//   (só enquanto a manutenção estiver ativa; transferida/cancelada não recebe nada).
// Cartão recusado: e-mail para o cliente tentar de novo e alerta para a equipe.
// Nota autorizada: PDF guardado no link do cliente e enviado por e-mail.
//
// Segurança: o corpo do aviso não é confiável. Pagamentos e notas são sempre
// consultados direto na API do Asaas (com a nossa chave) antes de qualquer gravação.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { NOTA, PRAZO_ENTREGA_DIAS, asaas, completarClienteFiscal, dataCurtaSP, desfazerEnvio, diaSP, marcarEnvio } from "../_shared/asaas.ts";
import { enviarEmail } from "../_shared/email.ts";
import { MSG } from "../_shared/mensagens.ts";

type Pagamento = {
  id: string;
  status: string;
  value: number;
  billingType: string;
  customer: string;
  dueDate: string;
  invoiceUrl?: string;
  externalReference?: string | null;
  paymentLink?: string | null;
  installment?: string | null;
  subscription?: string | null;
};
type Nota = { id: string; status: string; number?: string | null; pdfUrl?: string | null };
// deno-lint-ignore no-explicit-any
type Pedido = Record<string, any>;

const ok = (msg: string) => new Response(JSON.stringify({ ok: true, msg }), { headers: { "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FORMA: Record<string, string> = { PIX: "pix", BOLETO: "boleto", CREDIT_CARD: "cartao" };
const PAGOU = ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"];
const EVENTOS_PAGAMENTO = [
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED",
  "PAYMENT_REPROVED_BY_RISK_ANALYSIS",
];
const EVENTOS_NOTA = ["INVOICE_AUTHORIZED", "INVOICE_ERROR"];

const telegram = (db: SupabaseClient, texto: string) => db.rpc("_telegram", { p_texto: texto }).then(() => undefined, () => undefined);

/** Manda o e-mail uma vez só por (pedido, tipo). */
async function emailUnico(db: SupabaseClient, p: Pedido, tipo: string, m: { assunto: string; html: string }, anexos: { filename: string; content: string }[] = []) {
  if (!p.email) return;
  if (!(await marcarEnvio(db, p.id, tipo, p.email))) return;
  const foi = await enviarEmail(p.email, m.assunto, m.html, anexos);
  if (!foi) await desfazerEnvio(db, p.id, tipo); // tenta de novo no próximo aviso
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");

  const token = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (token && req.headers.get("asaas-access-token") !== token) return new Response("token", { status: 401 });

  let evento: { event?: string; payment?: { id?: string }; invoice?: { id?: string } };
  try {
    evento = await req.json();
  } catch {
    return ok("corpo inválido");
  }
  const tipo = evento.event || "";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  try {
    if (EVENTOS_PAGAMENTO.includes(tipo) && evento.payment?.id) return await tratarPagamento(db, tipo, evento.payment.id);
    if (EVENTOS_NOTA.includes(tipo) && evento.invoice?.id) return await tratarNota(db, evento.invoice.id);
    return ok("ignorado");
  } catch (e) {
    console.error(e);
    // erro nosso: devolve 500 para o Asaas tentar de novo mais tarde
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
});

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------
async function acharPedido(db: SupabaseClient, pg: Pagamento): Promise<Pedido | null> {
  if (pg.externalReference && UUID.test(pg.externalReference)) {
    const { data } = await db.from("pedidos").select("*").eq("id", pg.externalReference).maybeSingle();
    if (data) return data;
  }
  if (pg.subscription) {
    const { data } = await db.from("pedidos").select("*").eq("asaas_assinatura_id", pg.subscription).maybeSingle();
    if (data) return data;
  }
  if (pg.paymentLink) {
    const { data } = await db.from("pedidos").select("*").eq("asaas_cobrancas->cartao->>link_id", pg.paymentLink).maybeSingle();
    if (data) return data;
  }
  return null;
}

async function tratarPagamento(db: SupabaseClient, tipo: string, id: string) {
  const pg = await asaas<Pagamento>(`/payments/${id}`);
  const p = await acharPedido(db, pg);
  if (!p) return ok("pagamento sem pedido");
  const mensalidade = Boolean(pg.subscription);
  const manutencaoAtiva = p.manutencao_status === "ativa";

  switch (tipo) {
    case "PAYMENT_CREATED":
      // nova mensalidade gerada pela assinatura: manda o link para pagar
      if (mensalidade && manutencaoAtiva && pg.invoiceUrl) {
        await emailUnico(db, p, `cobranca:${pg.id}`, MSG.cobrancaMensal(p as never, { valor: pg.value, vencimento: pg.dueDate, url: pg.invoiceUrl }));
      }
      return ok("criada");

    case "PAYMENT_OVERDUE":
      if (mensalidade && manutencaoAtiva && pg.status === "OVERDUE" && pg.invoiceUrl) {
        await emailUnico(db, p, `atraso:${pg.id}`, MSG.atraso(p as never, { valor: pg.value, vencimento: pg.dueDate, url: pg.invoiceUrl }));
        if (await marcarEnvio(db, p.id, `atraso_equipe:${pg.id}`, null, "telegram")) {
          await telegram(db, `⏰ Mensalidade em atraso: ${p.negocio} (venceu ${pg.dueDate.split("-").reverse().join("/")}). O cliente já recebeu um e-mail.`);
        }
      }
      return ok("atraso");

    case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
    case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
      await emailUnico(db, p, `cartao_recusado:${pg.id}`, MSG.cartaoRecusado(p as never));
      if (await marcarEnvio(db, p.id, `cartao_recusado_equipe:${pg.id}`, null, "telegram")) {
        await telegram(db, `💳 Cartão recusado: ${p.negocio}. Mandamos um e-mail sugerindo Pix ou outro cartão. Talvez valha um oi no WhatsApp: ${p.whatsapp}`);
      }
      return ok("cartao recusado");

    case "PAYMENT_REFUNDED":
      if (pg.status === "REFUNDED") {
        if (!mensalidade) await db.from("pedidos").update({ pagamento_status: "estornado" }).eq("id", p.id);
        await telegram(db, `↩️ Pagamento estornado no Asaas: ${p.negocio}`);
      }
      return ok("estorno");
  }

  // PAYMENT_CONFIRMED / PAYMENT_RECEIVED
  if (!PAGOU.includes(pg.status)) return ok(`status ${pg.status}`);
  return mensalidade ? await mensalidadePaga(db, p, pg) : await implantacaoPaga(db, p, pg);
}

async function implantacaoPaga(db: SupabaseClient, p: Pedido, pg: Pagamento) {
  // Cartão parcelado: um lançamento só, com o valor total e o número de parcelas
  let chave = pg.id;
  let valor = pg.value;
  let parcelas = 1;
  if (pg.installment) {
    const parc = await asaas<{ id: string; value: number; installmentCount: number }>(`/installments/${pg.installment}`);
    chave = parc.id;
    valor = parc.value;
    parcelas = parc.installmentCount || 1;
  }
  const forma = FORMA[pg.billingType] || "outro";

  const { error: erroLanc } = await db.from("lancamentos").insert({
    tipo: "site",
    pedido_id: p.id,
    cliente: p.negocio,
    descricao: "Site + Perfil do Google",
    valor,
    forma,
    parcelas: Math.min(Math.max(parcelas, 1), 12),
    recebido_em: diaSP(0),
    asaas_pagamento_id: chave,
  });
  // 23505 = já registrado (aviso repetido): segue sem duplicar
  if (erroLanc && erroLanc.code !== "23505") throw erroLanc;

  if (p.status === "contrato_aceito") {
    // o gatilho do banco avisa a equipe no Telegram
    const { error } = await db
      .from("pedidos")
      .update({ status: "pago", pagamento_status: "pago", pago_em: new Date().toISOString() })
      .eq("id", p.id)
      .eq("status", "contrato_aceito");
    if (error) throw error;
  }

  // Comprovante primeiro; a nota vai em outro e-mail quando a prefeitura autorizar
  const prazo = dataCurtaSP(new Date(Date.now() + PRAZO_ENTREGA_DIAS * 86400000));
  await emailUnico(db, p, "recibo", MSG.recibo(p as never, { valor, forma, parcelas, data: diaSP(0) }, prazo));

  await pedirNota(db, pg, chave, valor, p, "site");
  return ok("pago");
}

async function mensalidadePaga(db: SupabaseClient, p: Pedido, pg: Pagamento) {
  const competencia = `${pg.dueDate.slice(0, 7)}-01`;
  const forma = FORMA[pg.billingType] || "outro";
  const { error } = await db.from("lancamentos").insert({
    tipo: "manutencao",
    pedido_id: p.id,
    cliente: p.negocio,
    descricao: "Manutenção mensal",
    valor: pg.value,
    forma,
    parcelas: 1,
    recebido_em: diaSP(0),
    competencia,
    asaas_pagamento_id: pg.id,
  });
  if (error && error.code !== "23505") throw error;
  await emailUnico(db, p, `recibo:${pg.id}`, MSG.reciboMensalidade(p as never, { valor: pg.value, forma, competencia }));
  await pedirNota(db, pg, pg.id, pg.value, p, "manutencao");
  return ok("mensalidade paga");
}

/** Pede a NFS-e ao Asaas uma única vez por lançamento. */
async function pedirNota(db: SupabaseClient, pg: Pagamento, chave: string, valor: number, p: Pedido, tipo: "site" | "manutencao") {
  const negocio = String(p.negocio);
  if (!NOTA.ligada()) return;

  const { data: lanc } = await db.from("lancamentos").select("id, asaas_nota_id, nota_path").eq("asaas_pagamento_id", chave).maybeSingle();
  if (!lanc || lanc.asaas_nota_id || lanc.nota_path) return;

  try {
    await completarClienteFiscal(p);
    const nota = await asaas<Nota>("/invoices", {
      method: "POST",
      body: {
        ...(pg.installment ? { installment: pg.installment } : { payment: pg.id }),
        serviceDescription: tipo === "site" ? NOTA.descricao : NOTA.descricaoMensalidade,
        observations: `Codifica · ${negocio}`,
        value: valor,
        deductions: 0,
        effectiveDate: diaSP(0),
        municipalServiceCode: NOTA.servicoCodigo,
        municipalServiceName: NOTA.servicoNome,
        taxes: NOTA.impostos,
      },
    });
    await db.from("lancamentos").update({ asaas_nota_id: nota.id, nota_status: "solicitada" }).eq("id", lanc.id);
    // Antecipa a emissão (sem isso o Asaas só processa no lote do dia)
    await asaas(`/invoices/${nota.id}/authorize`, { method: "POST" }).catch((e) => console.error("authorize", e));
  } catch (e) {
    console.error("nota", e);
    await db.from("lancamentos").update({ nota_status: "erro" }).eq("id", lanc.id);
    await telegram(db, `⚠️ Não consegui pedir a nota fiscal de ${negocio} no Asaas. Emita pelo painel do Asaas.`);
  }
}

// ---------------------------------------------------------------------------
// Nota fiscal
// ---------------------------------------------------------------------------
async function tratarNota(db: SupabaseClient, id: string) {
  const nota = await asaas<Nota>(`/invoices/${id}`);
  const { data: lanc } = await db.from("lancamentos").select("id, cliente, pedido_id, nota_path").eq("asaas_nota_id", nota.id).maybeSingle();
  if (!lanc) return ok("nota sem lançamento");

  if (nota.status === "ERROR") {
    await db.from("lancamentos").update({ nota_status: "erro" }).eq("id", lanc.id);
    await telegram(db, `⚠️ A prefeitura recusou a nota fiscal de ${lanc.cliente}. Veja o motivo no painel do Asaas.`);
    return ok("nota com erro");
  }
  if (nota.status !== "AUTHORIZED" || !nota.pdfUrl) return ok(`nota ${nota.status}`);

  const pdf = await fetch(nota.pdfUrl);
  if (!pdf.ok) throw new Error(`pdf ${pdf.status}`);
  const bytes = new Uint8Array(await pdf.arrayBuffer());

  if (!lanc.nota_path) {
    // Copia o PDF para o nosso bucket privado (o cliente baixa logado, pelo link pessoal)
    const path = `notas/${lanc.id}/nfse-${nota.number || nota.id}.pdf`;
    const { error: erroUp } = await db.storage.from("documentos").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (erroUp) throw erroUp;
    await db
      .from("lancamentos")
      .update({ nota_path: path, nota_numero: nota.number || null, nota_emitida_por: NOTA.emitidaPor, nota_emitida_em: diaSP(0), nota_status: "emitida" })
      .eq("id", lanc.id);
    await telegram(db, `🧾 Nota fiscal emitida: ${lanc.cliente}${nota.number ? ` (nº ${nota.number})` : ""}. Já está no link do cliente.`);
  }

  // E-mail com a nota em anexo
  if (lanc.pedido_id) {
    const { data: p } = await db.from("pedidos").select("*").eq("id", lanc.pedido_id).maybeSingle();
    if (p) {
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      await emailUnico(db, p, `nota:${nota.id}`, MSG.nota(p as never, nota.number || null), [
        { filename: `nota-fiscal-codifica${nota.number ? `-${nota.number}` : ""}.pdf`, content: btoa(bin) },
      ]);
    }
  }
  return ok("nota guardada");
}
