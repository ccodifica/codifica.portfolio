// Edge Function: asaas-pagamento
//
// Chamada pela página do pedido quando o cliente escolhe como pagar.
// Payload: { codigo: string, forma: "pix" | "boleto" | "cartao", parcelas?: 1..12 }
// Retorno:
//   pix    → { forma, valor, qr (PNG base64), copiaECola, expiraEm }
//   boleto → { forma, valor, url }
//   cartao → { forma, valor, url, parcelas }   (url = página segura do Asaas)
//
// Reaproveita a cobrança em aberto (o cliente pode abrir a página várias vezes
// sem gerar cobranças duplicadas). Só funciona depois do aceite do contrato.
// O valor do cartão vem da tabela de parcelas (opcaoCartao), nunca do navegador.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { ErroAsaas, PARCELAS_MAX, asaas, diaSP, garantirCliente, opcaoCartao, precoDoPedido } from "../_shared/asaas.ts";

type Forma = "pix" | "boleto" | "cartao";
type Pagamento = { id: string; status: string; value: number; bankSlipUrl?: string; invoiceUrl?: string };
const ABERTO = ["PENDING", "OVERDUE"];

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return responder({ erro: "metodo" }, 405);

  try {
    const { codigo, forma, parcelas: parcelasPedidas } = (await req.json()) as { codigo?: string; forma?: Forma; parcelas?: number };
    if (!codigo || !/^[0-9a-f]{32}$/.test(codigo) || !["pix", "boleto", "cartao"].includes(forma || "")) {
      return responder({ erro: "dados_invalidos" }, 400);
    }
    const parcelas = forma === "cartao" ? Math.trunc(Number(parcelasPedidas) || 1) : 1;
    if (parcelas < 1 || parcelas > PARCELAS_MAX) return responder({ erro: "dados_invalidos" }, 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: p, error } = await db.from("pedidos").select("*").eq("codigo", codigo).maybeSingle();
    if (error) throw error;
    if (!p) return responder({ erro: "nao_encontrado" }, 404);
    if (p.status !== "contrato_aceito" || p.pagamento_status === "pago") return responder({ erro: "etapa_invalida" }, 409);

    const preco = precoDoPedido(p.contrato_aceito_em);
    const valor = forma === "cartao" ? opcaoCartao(preco.cartao, parcelas).total : preco.pix;
    const cobrancas = (p.asaas_cobrancas || {}) as Record<string, Record<string, unknown>>;
    const descricao = `Codifica · Site + Perfil do Google · ${p.negocio}`;
    const salvar = async (campos: Record<string, unknown>) => {
      const { error: e } = await db.from("pedidos").update(campos).eq("id", p.id);
      if (e) throw e;
    };

    // Cliente no Asaas (dados do aceite do contrato)
    const clienteId = await garantirCliente(db, p);
    if (!clienteId) return responder({ erro: "documento_invalido" }, 409);

    // Reaproveita a cobrança em aberto, se a forma, o valor e as parcelas forem os mesmos
    let pagamento: Pagamento | null = null;
    const anterior = cobrancas[forma!];
    if (anterior?.id && anterior.valor === valor && (anterior.parcelas ?? 1) === parcelas) {
      try {
        const pg = await asaas<Pagamento>(`/payments/${anterior.id}`);
        if (ABERTO.includes(pg.status)) pagamento = pg;
      } catch {
        pagamento = null;
      }
    }
    if (!pagamento) {
      const corpo: Record<string, unknown> = {
        customer: clienteId,
        billingType: forma === "pix" ? "PIX" : forma === "boleto" ? "BOLETO" : "CREDIT_CARD",
        dueDate: diaSP(3),
        description: descricao,
        externalReference: p.id,
      };
      if (forma === "cartao" && parcelas > 1) {
        corpo.installmentCount = parcelas;
        corpo.totalValue = valor;
      } else {
        corpo.value = valor;
      }
      pagamento = await asaas<Pagamento>("/payments", { method: "POST", body: corpo });
      await salvar({
        asaas_cobrancas: {
          ...cobrancas,
          [forma!]: { id: pagamento.id, valor, parcelas, url: pagamento.bankSlipUrl || pagamento.invoiceUrl || null },
        },
      });
    }

    if (forma === "boleto") return responder({ forma, valor, url: pagamento.bankSlipUrl || pagamento.invoiceUrl });
    if (forma === "cartao") return responder({ forma, valor, url: pagamento.invoiceUrl, parcelas });

    const qr = await asaas<{ encodedImage: string; payload: string; expirationDate: string }>(`/payments/${pagamento.id}/pixQrCode`);
    return responder({ forma, valor, qr: qr.encodedImage, copiaECola: qr.payload, expiraEm: qr.expirationDate });
  } catch (e) {
    console.error(e);
    const status = e instanceof ErroAsaas ? 502 : 500;
    return responder({ erro: "falha_pagamento" }, status);
  }
});
