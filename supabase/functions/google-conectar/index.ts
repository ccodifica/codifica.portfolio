// Edge Function: google-conectar  (verify_jwt OFF: o Google volta aqui sem login)
//
// Botão "Conectar Google" da aba Métricas. Quem clica é um admin logado; ele
// autoriza na tela do Google e o token fica gravado em public.integracoes,
// sem ninguém precisar copiar token nenhum.
//
// POST { acao: "iniciar", voltar }   (admin) → { url } da tela de autorização do Google
// POST { acao: "status" }            (admin) → { conectado, email, em }
// POST { acao: "listar" }            (admin) → propriedades do Search Console e locais do Perfil
// POST { acao: "desconectar" }       (admin) → revoga e apaga o token
// GET  ?code=…&state=…               (Google) → troca o código pelo token e volta para o painel
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";

const URL_FUNCAO = "https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/google-conectar";
const ID = "google_metricas";
const ESCOPOS = ["openid", "email", "https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/business.manage"];
// só volta para o próprio painel (evita redirecionamento aberto)
const VOLTAS_OK = [/^https:\/\/(www\.)?ccodifica\.com\.br\//, /^http:\/\/(127\.0\.0\.1|localhost):\d+\//];

const responder = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const voltarPara = (url: string, resultado: string) => {
  const u = new URL(url);
  u.searchParams.set("aba", "metricas");
  u.searchParams.set("google", resultado);
  return Response.redirect(u.toString(), 302);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const segredo = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !segredo) return responder({ erro: "google_nao_configurado" }, 500);

  // volta do Google
  if (req.method === "GET") {
    const p = new URL(req.url).searchParams;
    const estado = p.get("state") || "";
    const { data: linha } = await db.from("integracoes").select("estado, estado_expira, voltar_para").eq("id", ID).maybeSingle();
    const voltar = linha?.voltar_para || "https://ccodifica.com.br/painel-codifica";
    if (!linha?.estado || linha.estado !== estado || new Date(linha.estado_expira).getTime() < Date.now()) return voltarPara(voltar, "expirou");
    await db.from("integracoes").update({ estado: null, estado_expira: null }).eq("id", ID);
    if (p.get("error") || !p.get("code")) return voltarPara(voltar, "cancelado");

    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: p.get("code")!, client_id: clientId, client_secret: segredo, redirect_uri: URL_FUNCAO, grant_type: "authorization_code" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.refresh_token) {
      console.error("google token", r.status, j.error, j.error_description);
      return voltarPara(voltar, "erro");
    }
    let email: string | null = null;
    try {
      // id_token veio direto do Google por HTTPS: só lemos o e-mail
      email = JSON.parse(atob(j.id_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || null;
    } catch {
      /* sem e-mail, segue */
    }
    await db
      .from("integracoes")
      .update({ refresh_token: j.refresh_token, conta_email: email, escopos: j.scope || ESCOPOS.join(" "), conectado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", ID);
    return voltarPara(voltar, "ok");
  }

  // ações do painel: só admin
  const admin = await adminLogado(db, req);
  if (!admin) return responder({ erro: "sem_permissao" }, 401);
  let corpo: { acao?: string; voltar?: string } = {};
  try {
    corpo = await req.json();
  } catch {
    /* sem corpo */
  }

  if (corpo.acao === "iniciar") {
    const voltar = String(corpo.voltar || "");
    if (!VOLTAS_OK.some((re) => re.test(voltar))) return responder({ erro: "voltar_invalido" }, 400);
    const estado = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await db
      .from("integracoes")
      .upsert({ id: ID, estado, estado_expira: new Date(Date.now() + 10 * 60_000).toISOString(), voltar_para: voltar, conectado_por: admin, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) return responder({ erro: "falha" }, 500);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: URL_FUNCAO,
      response_type: "code",
      scope: ESCOPOS.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state: estado,
    }).toString();
    return responder({ url: url.toString() });
  }

  const { data: linha } = await db.from("integracoes").select("refresh_token, conta_email, conectado_em, escopos").eq("id", ID).maybeSingle();

  if (corpo.acao === "status") {
    return responder({ conectado: Boolean(linha?.refresh_token), email: linha?.conta_email || null, em: linha?.conectado_em || null });
  }

  if (corpo.acao === "desconectar") {
    if (linha?.refresh_token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(linha.refresh_token)}`, { method: "POST" }).catch(() => undefined);
    await db.from("integracoes").update({ refresh_token: null, conta_email: null, escopos: null, conectado_em: null, updated_at: new Date().toISOString() }).eq("id", ID);
    return responder({ ok: true });
  }

  if (corpo.acao === "listar") {
    if (!linha?.refresh_token) return responder({ erro: "nao_conectado" }, 400);
    const token = await tokenAcesso(linha.refresh_token, clientId, segredo);
    if (!token) return responder({ erro: "token_invalido" }, 400);
    const h = { Authorization: `Bearer ${token}` };
    const [gsc, gbp] = await Promise.all([
      fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", { headers: h })
        .then(async (r) => (r.ok ? ((await r.json()).siteEntry || []).map((s: { siteUrl: string; permissionLevel: string }) => ({ propriedade: s.siteUrl, nivel: s.permissionLevel })) : { erro: `${r.status}` }))
        .catch(() => ({ erro: "rede" })),
      locaisPerfil(h),
    ]);
    return responder({ gsc, gbp });
  }

  return responder({ erro: "acao" }, 400);
});

async function adminLogado(db: SupabaseClient, req: Request): Promise<string | null> {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await db.auth.getUser(jwt);
  if (!data?.user) return null;
  const { data: perfil } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return perfil?.role === "admin" ? data.user.id : null;
}

async function tokenAcesso(refresh: string, id: string, segredo: string): Promise<string | null> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  if (!r.ok) return null;
  return (await r.json()).access_token || null;
}

/** Locais do Perfil da Empresa (só funciona depois que o Google libera o acesso à API). */
async function locaisPerfil(h: Record<string, string>) {
  try {
    const r = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: h });
    if (!r.ok) return { erro: `${r.status}` };
    const contas = ((await r.json()).accounts || []) as { name: string; accountName: string }[];
    const locais: { local: string; nome: string; conta: string }[] = [];
    for (const c of contas.slice(0, 10)) {
      const l = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${c.name}/locations?readMask=name,title&pageSize=100`, { headers: h });
      if (!l.ok) continue;
      for (const x of ((await l.json()).locations || []) as { name: string; title: string }[]) locais.push({ local: x.name, nome: x.title, conta: c.accountName });
    }
    return locais;
  } catch {
    return { erro: "rede" };
  }
}
