// Edge Function: rotinas  (sem JWT; chamada de hora em hora pelo pg_cron)
//
// 1) Mensalidade: cria a assinatura no Asaas para quem está no ar com manutenção
//    ativa (1ª cobrança um mês depois da publicação) e cancela a assinatura de
//    quem cancelou ou teve a manutenção transferida.
// 2) Lembretes por e-mail (das 9h às 20h) para quem parou no meio do caminho:
//    prévia pronta sem resposta (2 dias), prévia aprovada sem contrato (1 dia),
//    contrato aceito sem pagamento (1 e 3 dias).
// 3) Resumo diário no Telegram às 9h com quem parou e só tem WhatsApp.
//
// Tudo é idempotente (tabela 'envios'): rodar duas vezes não manda nada repetido.

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { MENSALIDADE, asaas, desfazerEnvio, diaSP, garantirCliente, marcarEnvio, precoDoPedido } from "../_shared/asaas.ts";
import { enviarEmail } from "../_shared/email.ts";
import { MSG } from "../_shared/mensagens.ts";

// deno-lint-ignore no-explicit-any
type Pedido = Record<string, any>;
const HORA = 3600 * 1000;
const PAINEL = "https://ccodifica.com.br/painel-codifica";

const horaSP = () => Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
const telegram = (db: SupabaseClient, texto: string) => db.rpc("_telegram", { p_texto: texto }).then(() => undefined, () => undefined);

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  // só o pg_cron chama: ele manda a chave guardada no Vault
  const { data: chaveOk } = await db.rpc("cron_chave_valida", { p: req.headers.get("x-cron-chave") || "" });
  if (chaveOk !== true) return new Response(JSON.stringify({ erro: "sem_permissao" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const feito: string[] = [];
  try {
    feito.push(await assinaturas(db));
  } catch (e) {
    console.error("assinaturas", e);
  }
  const h = horaSP();
  try {
    if (h >= 9 && h < 20) feito.push(await lembretes(db));
  } catch (e) {
    console.error("lembretes", e);
  }
  try {
    if (h === 9) feito.push(await resumoDiario(db));
  } catch (e) {
    console.error("resumo", e);
  }
  return new Response(JSON.stringify({ ok: true, feito }), { headers: { "Content-Type": "application/json" } });
});

/** Quando cada pedido entrou no status atual (pedido_eventos). */
async function desdeDoStatus(db: SupabaseClient, pedidos: Pedido[]) {
  const mapa = new Map<string, number>();
  if (!pedidos.length) return mapa;
  const { data } = await db
    .from("pedido_eventos")
    .select("pedido_id, para_status, created_at")
    .in("pedido_id", pedidos.map((p) => p.id))
    .order("created_at", { ascending: true });
  for (const p of pedidos) {
    const ev = (data || []).filter((e) => e.pedido_id === p.id && e.para_status === p.status).pop();
    mapa.set(p.id, new Date(ev?.created_at || p.updated_at || p.created_at).getTime());
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// 1) Assinaturas da manutenção
// ---------------------------------------------------------------------------
async function assinaturas(db: SupabaseClient) {
  let criadas = 0;
  let canceladas = 0;

  const { data: semAssinatura } = await db.from("pedidos").select("*").eq("status", "no_ar").eq("manutencao_status", "ativa").is("asaas_assinatura_id", null);
  const desde = await desdeDoStatus(db, semAssinatura || []);
  for (const p of semAssinatura || []) {
    const cliente = await garantirCliente(db, p);
    if (!cliente) continue; // sem CPF/CNPJ do contrato (pedido antigo): a equipe resolve à mão
    // 1º mês incluso: primeira cobrança um mês depois da publicação (no mínimo daqui a 3 dias)
    const publicado = new Date(desde.get(p.id) || Date.now());
    const venc = new Date(publicado);
    venc.setMonth(venc.getMonth() + 1);
    const vencimento = new Date(Math.max(venc.getTime(), Date.now() + 3 * 24 * HORA));
    const ass = await asaas<{ id: string }>("/subscriptions", {
      method: "POST",
      body: {
        customer: cliente,
        billingType: "UNDEFINED", // o cliente escolhe Pix, boleto ou cartão a cada mês
        value: MENSALIDADE,
        nextDueDate: vencimento.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }),
        cycle: "MONTHLY",
        description: `Codifica · Manutenção mensal do site · ${p.negocio}`,
        externalReference: p.id,
      },
    });
    await db.from("pedidos").update({ asaas_assinatura_id: ass.id }).eq("id", p.id);
    criadas++;
  }

  // Manutenção cancelada ou transferida: encerra a assinatura (e as cobranças futuras)
  const { data: canceladosComAssinatura } = await db.from("pedidos").select("id, negocio, asaas_assinatura_id").eq("manutencao_status", "cancelada").not("asaas_assinatura_id", "is", null);
  for (const p of canceladosComAssinatura || []) {
    try {
      await asaas(`/subscriptions/${p.asaas_assinatura_id}`, { method: "DELETE" });
    } catch (e) {
      console.error("cancelar assinatura", p.id, e);
      continue;
    }
    await db.from("pedidos").update({ asaas_assinatura_id: null }).eq("id", p.id);
    await telegram(db, `🛑 Manutenção encerrada: ${p.negocio}. A mensalidade no Asaas foi cancelada.`);
    canceladas++;
  }
  return `assinaturas: ${criadas} criadas, ${canceladas} canceladas`;
}

// ---------------------------------------------------------------------------
// 2) Lembretes por e-mail
// ---------------------------------------------------------------------------
async function lembretes(db: SupabaseClient) {
  const { data } = await db.from("pedidos").select("*").in("status", ["previa_pronta", "aprovado", "contrato_aceito"]).not("email", "is", null);
  const pedidos = (data || []).filter((p) => p.pagamento_status !== "pago");
  const desde = await desdeDoStatus(db, pedidos);
  let enviados = 0;

  const mandar = async (p: Pedido, tipo: string, m: { assunto: string; html: string }) => {
    if (!(await marcarEnvio(db, p.id, tipo, p.email))) return;
    if (await enviarEmail(p.email, m.assunto, m.html)) enviados++;
    else await desfazerEnvio(db, p.id, tipo);
  };

  for (const p of pedidos) {
    const horas = (Date.now() - (desde.get(p.id) || Date.now())) / HORA;
    if (p.status === "previa_pronta" && horas >= 48) await mandar(p, "lembrete_previa", MSG.lembretePrevia(p as never));
    if (p.status === "aprovado" && horas >= 24) await mandar(p, "lembrete_contrato", MSG.lembreteContrato(p as never));
    if (p.status === "contrato_aceito") {
      const preco = precoDoPedido(p.contrato_aceito_em);
      const promoAte = new Date(p.contrato_aceito_em || Date.now()) <= new Date("2026-11-30T23:59:59-03:00") ? "30/11" : null;
      const pixGerado = Boolean(p.asaas_cobrancas?.pix?.id);
      if (horas >= 24) await mandar(p, "lembrete_pagamento_1", MSG.lembretePagamento(p as never, { segundo: false, pixGerado, precoPix: preco.pix, promoAte }));
      if (horas >= 72) await mandar(p, "lembrete_pagamento_2", MSG.lembretePagamento(p as never, { segundo: true, pixGerado, precoPix: preco.pix, promoAte }));
    }
  }
  return `lembretes: ${enviados} enviados`;
}

// ---------------------------------------------------------------------------
// 3) Resumo diário no Telegram: quem parou e só dá para chamar no WhatsApp
// ---------------------------------------------------------------------------
async function resumoDiario(db: SupabaseClient) {
  const hoje = diaSP(0);
  const { data: jaFoi } = await db.from("envios").select("id").is("pedido_id", null).eq("tipo", `resumo:${hoje}`).limit(1);
  if (jaFoi?.length) return "resumo já enviado";

  const { data } = await db.from("pedidos").select("*").in("status", ["recebido", "mudanca_pedida", "previa_pronta", "aprovado", "contrato_aceito"]);
  const pedidos = (data || []).filter((p) => p.pagamento_status !== "pago");
  const desde = await desdeDoStatus(db, pedidos);
  const ROTULO: Record<string, string> = {
    recebido: "esperando a prévia (nossa vez)",
    mudanca_pedida: "pediu mudança na prévia (nossa vez)",
    previa_pronta: "não respondeu a prévia",
    aprovado: "aprovou e não assinou o contrato",
    contrato_aceito: "assinou e não pagou",
  };
  const linhas = pedidos
    .map((p) => ({ p, dias: Math.floor((Date.now() - (desde.get(p.id) || Date.now())) / (24 * HORA)) }))
    .filter(({ p, dias }) => (["recebido", "mudanca_pedida"].includes(p.status) ? dias >= 1 : dias >= 2))
    .map(({ p, dias }) => `• ${p.negocio}: ${ROTULO[p.status]} há ${dias} dia${dias === 1 ? "" : "s"}${p.email ? "" : " (sem e-mail)"} · wa.me/55${String(p.whatsapp || "").replace(/\D/g, "")}`);

  await db.from("envios").insert({ pedido_id: null, tipo: `resumo:${hoje}`, canal: "telegram" });
  if (!linhas.length) return "resumo: nada parado";
  await telegram(db, `☀️ Bom dia! Pedidos parados que pedem um oi:\n\n${linhas.join("\n")}\n\n${PAINEL}`);
  return `resumo: ${linhas.length} pedidos`;
}
