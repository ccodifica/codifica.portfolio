// E-mails da Codifica pelo Resend (o mesmo domínio já usado no login).
//   Secret: RESEND_API_KEY   (sem ele, nenhum e-mail sai e nada quebra)
// Textos sem travessão, no tom da Codifica: direto e humano.

const REMETENTE = "Codifica <pedidos@ccodifica.com.br>";
const RESPONDER_PARA = "ccodifica@gmail.com";
export const SITE = "https://ccodifica.com.br";
export const linkPedido = (codigo: string) => `${SITE}/pedido/${codigo}`;
export const WHATSAPP = "https://wa.me/5521968947527"; // mesmo número de src/config/oferta.ts

export type Anexo = { filename: string; content: string }; // content em base64

export async function enviarEmail(para: string, assunto: string, html: string, anexos: Anexo[] = []): Promise<boolean> {
  const chave = Deno.env.get("RESEND_API_KEY");
  if (!chave || !para) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [para], reply_to: RESPONDER_PARA, subject: assunto, html, attachments: anexos.length ? anexos : undefined }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return r.ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: v % 1 ? 2 : 0 });
export const dataBR = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00-03:00` : iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Molde único: claro, legível no celular, com um botão principal. */
export function molde(o: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string }; tabela?: [string, string][]; rodape?: string }) {
  const linhas = (o.tabela || [])
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b6780">${esc(k)}</td><td style="padding:6px 0;text-align:right;color:#16131f;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f2f8;font-family:Inter,Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden">
<tr><td style="background:#0b0912;padding:20px 26px;color:#fff;font-size:20px;font-weight:700"><span style="color:#b18cff">&lt;&gt;</span> Codifica</td></tr>
<tr><td style="padding:28px 26px 8px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#16131f">${esc(o.titulo)}</h1>
${o.paragrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3d3950">${p}</p>`).join("")}
${linhas ? `<table role="presentation" width="100%" style="margin:6px 0 18px;border-top:1px solid #eee;border-bottom:1px solid #eee;font-size:14px">${linhas}</table>` : ""}
${o.botao ? `<p style="margin:8px 0 22px"><a href="${o.botao.url}" style="display:inline-block;background:#8b3df5;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:12px;font-size:15px">${esc(o.botao.texto)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 26px 24px;border-top:1px solid #f0eef5;font-size:12.5px;line-height:1.6;color:#8a8699">
${o.rodape ? `${o.rodape}<br>` : ""}Dúvidas? Responda este e-mail ou chame no <a href="${WHATSAPP}" style="color:#8b3df5">WhatsApp</a>.<br>
Codifica · CNPJ 67.544.631/0001-42 · Rio de Janeiro</td></tr>
</table></td></tr></table></body></html>`;
}

export const primeiroNome = (nome: string) => esc((nome || "").trim().split(/\s+/)[0] || "tudo bem");
