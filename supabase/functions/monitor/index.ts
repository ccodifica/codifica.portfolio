// Edge Function: monitor  (sem JWT no modo automático; o pg_cron chama)
//
// { modo: "checar" }     a cada 5 min: o site responde? quanto demora? avisa no Telegram se cair/voltar
// { modo: "diario" }     de madrugada: validade do domínio, PageSpeed (semanal), Search Console e Perfil da Empresa
// { modo: "relatorio" }  dia 1º: relatório do mês anterior por e-mail para cada cliente com relatório ligado
// { modo: "relatorio", site_id, mes, enviar } e { modo: "coletar_agora", site_id }
//                        chamadas manuais pelo painel: exigem login de admin
//
// Secrets opcionais (sem eles, a parte correspondente só não roda):
//   PAGESPEED_API_KEY                         chave da API do PageSpeed Insights
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET    (já existem, da agenda)
//   GOOGLE_METRICAS_REFRESH_TOKEN             autorização com Search Console + Perfil da Empresa
//   RESEND_API_KEY                            e-mails (já existe)

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { enviarEmail } from "../_shared/email.ts";
import { MSG } from "../_shared/mensagens.ts";

type Site = {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  cliente: string | null;
  ativo: boolean;
  relatorio_ativo: boolean;
  relatorio_email: string | null;
  gsc_propriedade: string | null;
  gbp_local: string | null;
};

const HORA = 3600_000;
const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const diaSP = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const telegram = (db: SupabaseClient, texto: string) => db.rpc("_telegram", { p_texto: texto }).then(() => undefined, () => undefined);

/** Roda em lotes para não abrir dezenas de conexões ao mesmo tempo. */
async function emLotes<T>(itens: T[], tamanho: number, fn: (x: T) => Promise<unknown>) {
  for (let i = 0; i < itens.length; i += tamanho) await Promise.allSettled(itens.slice(i, i + tamanho).map(fn));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  let corpo: { modo?: string; site_id?: string; mes?: string; enviar?: boolean } = {};
  try {
    corpo = await req.json();
  } catch {
    /* sem corpo */
  }

  try {
    // chamadas manuais (com site_id) só para admin logado
    if (corpo.site_id) {
      if (!(await eAdmin(db, req))) return responder({ erro: "sem_permissao" }, 401);
      const { data: site } = await db.from("monitor_sites").select("*").eq("id", corpo.site_id).maybeSingle();
      if (!site) return responder({ erro: "nao_encontrado" }, 404);
      if (corpo.modo === "relatorio") {
        const mes = /^\d{4}-\d{2}$/.test(corpo.mes || "") ? corpo.mes! : mesAnterior();
        return responder(await relatorioDoSite(db, site, mes, Boolean(corpo.enviar)));
      }
      if (corpo.modo === "coletar_agora") {
        await Promise.allSettled([checar(db, site), pagespeed(db, site), dominio(db, site, true), searchConsole(db, site), perfilEmpresa(db, site)]);
        return responder({ ok: true });
      }
      return responder({ erro: "modo" }, 400);
    }

    // modos automáticos: só o pg_cron, que manda a chave guardada no Vault
    const { data: chaveOk } = await db.rpc("cron_chave_valida", { p: req.headers.get("x-cron-chave") || "" });
    if (chaveOk !== true) return responder({ erro: "sem_permissao" }, 401);

    const { data } = await db.from("monitor_sites").select("*").eq("ativo", true);
    const sites = (data || []) as Site[];

    if (corpo.modo === "checar") {
      await emLotes(sites, 8, (s) => checar(db, s));
      return responder({ ok: true, sites: sites.length });
    }
    if (corpo.modo === "diario") {
      const segunda = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Sao_Paulo" }) === "Mon";
      await emLotes(sites, 4, async (s) => {
        await dominio(db, s, false);
        await searchConsole(db, s);
        await perfilEmpresa(db, s);
        if (segunda || !(await temPagespeedRecente(db, s.id))) await pagespeed(db, s);
      });
      return responder({ ok: true, sites: sites.length });
    }
    if (corpo.modo === "relatorio") {
      const mes = mesAnterior();
      let enviados = 0;
      for (const s of sites.filter((x) => x.relatorio_ativo && x.relatorio_email)) {
        const r = await relatorioDoSite(db, s, mes, true);
        if (r.enviado) enviados++;
      }
      if (enviados) await telegram(db, `📊 Relatórios de ${mes.split("-").reverse().join("/")} enviados para ${enviados} cliente${enviados > 1 ? "s" : ""}.`);
      return responder({ ok: true, enviados });
    }
    return responder({ erro: "modo" }, 400);
  } catch (e) {
    console.error(e);
    return responder({ erro: "falha" }, 500);
  }
});

async function eAdmin(db: SupabaseClient, req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return false;
  const { data } = await db.auth.getUser(jwt);
  if (!data?.user) return false;
  const { data: perfil } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return perfil?.role === "admin";
}

const mesAnterior = () => {
  const [a, m] = diaSP().split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// Disponibilidade
// ---------------------------------------------------------------------------
async function checar(db: SupabaseClient, s: Site) {
  const inicio = Date.now();
  let ok = false;
  let status: number | null = null;
  let erro: string | null = null;
  try {
    const r = await fetch(s.url, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "CodificaMonitor/1.0 (+https://ccodifica.com.br)" } });
    status = r.status;
    ok = r.status < 400;
    await r.body?.cancel();
  } catch (e) {
    erro = String((e as Error).message || e).slice(0, 200);
  }
  const ms = Date.now() - inicio;
  await db.from("monitor_checagens").insert({ site_id: s.id, ok, status, ms: ok ? ms : null, erro });

  const { data: est } = await db.from("monitor_estado").select("*").eq("site_id", s.id).maybeSingle();
  const agora = new Date().toISOString();
  if (!est) {
    await db.from("monitor_estado").insert({ site_id: s.id, no_ar: ok, falhas_seguidas: ok ? 0 : 1, ultima_checagem: agora, ultimo_status: status, ultimo_ms: ok ? ms : null });
    return;
  }
  const falhas = ok ? 0 : (est.falhas_seguidas || 0) + 1;
  const campos: Record<string, unknown> = { falhas_seguidas: falhas, ultima_checagem: agora, ultimo_status: status, ultimo_ms: ok ? ms : est.ultimo_ms };
  // fora do ar só depois de 2 falhas seguidas (10 min), para não alarmar por uma oscilação
  if (est.no_ar && falhas >= 2) {
    campos.no_ar = false;
    campos.desde = agora;
    await telegram(db, `🔴 Fora do ar: ${s.nome}\n${s.url}\n${status ? `Resposta ${status}` : erro || "sem resposta"}`);
  } else if (!est.no_ar && ok) {
    const minutos = Math.round((Date.now() - new Date(est.desde).getTime()) / 60_000);
    campos.no_ar = true;
    campos.desde = agora;
    await telegram(db, `🟢 Voltou ao ar: ${s.nome} (ficou fora cerca de ${minutos} min)`);
  }
  await db.from("monitor_estado").update(campos).eq("site_id", s.id);
}

// ---------------------------------------------------------------------------
// Domínio: validade pelo RDAP (Registro.br para .br)
// ---------------------------------------------------------------------------
// .com.br, .net.br, .adv.br etc. têm 3 partes; o resto (.com, .br direto) tem 2
const SEGUNDO_NIVEL_BR = new Set(["com", "net", "org", "art", "blog", "eco", "edu", "gov", "ind", "inf", "med", "tur", "adv", "arq", "eng", "nom", "psc", "app", "dev", "log", "tec", "emp", "ong"]);
const dominioRegistravel = (url: string) => {
  const partes = new URL(url).hostname.replace(/^www\./, "").split(".");
  const tres = partes.length >= 3 && partes[partes.length - 1] === "br" && SEGUNDO_NIVEL_BR.has(partes[partes.length - 2]);
  return partes.slice(tres ? -3 : -2).join(".");
};

/** WHOIS do Registro.br (porta 43): devolve a data de vencimento "AAAA-MM-DD". */
async function whoisBr(dom: string): Promise<string | null> {
  try {
    const conn = await Deno.connect({ hostname: "whois.registro.br", port: 43 });
    await conn.write(new TextEncoder().encode(`${dom}\r\n`));
    const partes: Uint8Array[] = [];
    const buf = new Uint8Array(4096);
    const limite = Date.now() + 10_000;
    while (Date.now() < limite) {
      const n = await conn.read(buf);
      if (n === null) break;
      partes.push(buf.slice(0, n));
    }
    conn.close();
    const texto = new TextDecoder().decode(new Uint8Array(partes.flatMap((p) => [...p])));
    const m = texto.match(/expires:\s*(\d{4})(\d{2})(\d{2})/i);
    if (!m) console.error("whois sem data", dom, texto.slice(0, 160));
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  } catch (e) {
    console.error("whois", dom, String(e));
    return null;
  }
}

async function dominio(db: SupabaseClient, s: Site, forcar: boolean) {
  const { data: est } = await db.from("monitor_estado").select("dominio_checado, dominio_avisado, dominio_expira").eq("site_id", s.id).maybeSingle();
  if (!forcar && est?.dominio_checado && Date.now() - new Date(est.dominio_checado).getTime() < 24 * HORA) return;
  const dom = dominioRegistravel(s.url);
  if (dom.endsWith("vercel.app") || dom.endsWith("netlify.app")) return;
  // Registro.br às vezes recusa servidores de fora do Brasil: tenta o rdap.org em seguida
  const fontes = dom.endsWith(".br") ? [`https://rdap.registro.br/domain/${dom}`, `https://rdap.org/domain/${dom}`] : [`https://rdap.org/domain/${dom}`];
  try {
    let j: { events?: { eventAction: string; eventDate: string }[] } | null = null;
    for (const fonte of fontes) {
      const r = await fetch(fonte, { signal: AbortSignal.timeout(15_000), redirect: "follow", headers: { Accept: "application/rdap+json, application/json", "User-Agent": "CodificaMonitor/1.0" } });
      if (r.ok) {
        j = await r.json();
        break;
      }
      console.error("rdap", fonte, r.status);
    }
    if (!j && dom.endsWith(".br")) {
      const venc = await whoisBr(dom);
      if (venc) j = { events: [{ eventAction: "expiration", eventDate: venc }] };
    }
    // Sem consulta possível daqui (o Registro.br bloqueia servidores de fora): usa a data
    // que o painel gravou consultando pelo navegador da equipe
    const exp = j ? (j.events || []).find((e: { eventAction: string }) => e.eventAction === "expiration")?.eventDate : est?.dominio_expira;
    const expira = exp ? String(exp).slice(0, 10) : null;
    const campos: Record<string, unknown> = j ? { dominio_expira: expira, dominio_checado: diaSP() } : {};
    if (expira) {
      const dias = Math.round((new Date(expira).getTime() - Date.now()) / (24 * HORA));
      const avisouRecente = est?.dominio_avisado && Date.now() - new Date(est.dominio_avisado).getTime() < 7 * 24 * HORA;
      if (dias <= 30 && !avisouRecente) {
        campos.dominio_avisado = diaSP();
        await telegram(db, `⏳ O domínio ${dom} (${s.nome}) vence em ${dias} dia${dias === 1 ? "" : "s"} (${expira.split("-").reverse().join("/")}). Renove para o site não sair do ar.`);
      }
    }
    if (Object.keys(campos).length) {
      const { error } = await db.from("monitor_estado").update(campos).eq("site_id", s.id);
      if (error) console.error("rdap gravar", error.message);
    }
  } catch (e) {
    console.error("rdap", dom, String(e));
  }
}

// ---------------------------------------------------------------------------
// PageSpeed Insights (celular): desempenho, SEO, acessibilidade e boas práticas
// ---------------------------------------------------------------------------
async function temPagespeedRecente(db: SupabaseClient, siteId: string) {
  const { data } = await db.from("monitor_externo").select("coletado_em").eq("site_id", siteId).eq("fonte", "pagespeed").order("coletado_em", { ascending: false }).limit(1);
  return Boolean(data?.[0] && Date.now() - new Date(data[0].coletado_em).getTime() < 7 * 24 * HORA);
}

async function pagespeed(db: SupabaseClient, s: Site) {
  const chave = Deno.env.get("PAGESPEED_API_KEY");
  const q = new URLSearchParams({ url: s.url, strategy: "mobile", locale: "pt_BR" });
  for (const c of ["performance", "seo", "accessibility", "best-practices"]) q.append("category", c);
  if (chave) q.set("key", chave);
  try {
    const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(90_000) });
    if (!r.ok) return console.error("pagespeed", s.url, r.status, (await r.text()).slice(0, 200));
    const j = await r.json();
    const cat = j.lighthouseResult?.categories || {};
    const aud = j.lighthouseResult?.audits || {};
    const nota = (k: string) => (cat[k]?.score == null ? null : Math.round(cat[k].score * 100));
    const campo = j.loadingExperience?.metrics || {};
    const dados = {
      desempenho: nota("performance"),
      seo: nota("seo"),
      acessibilidade: nota("accessibility"),
      boas_praticas: nota("best-practices"),
      lcp_ms: Math.round(aud["largest-contentful-paint"]?.numericValue || 0) || null,
      cls: aud["cumulative-layout-shift"]?.numericValue ?? null,
      tbt_ms: Math.round(aud["total-blocking-time"]?.numericValue || 0),
      inp_campo_ms: campo.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      lcp_campo_ms: campo.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
    };
    await db.from("monitor_externo").upsert({ site_id: s.id, fonte: "pagespeed", periodo: diaSP(), dados, coletado_em: new Date().toISOString() }, { onConflict: "site_id,fonte,periodo" });
  } catch (e) {
    console.error("pagespeed", s.url, e);
  }
}

// ---------------------------------------------------------------------------
// Google: Search Console e Perfil da Empresa (mesmo token OAuth)
// ---------------------------------------------------------------------------
let tokenCache: { valor: string; ate: number } | null = null;
async function tokenGoogle(db: SupabaseClient): Promise<string | null> {
  // token gravado pelo botão "Conectar Google" do painel (função google-conectar)
  const { data: integ } = await db.from("integracoes").select("refresh_token").eq("id", "google_metricas").maybeSingle();
  const refresh = integ?.refresh_token || Deno.env.get("GOOGLE_METRICAS_REFRESH_TOKEN");
  const id = Deno.env.get("GOOGLE_CLIENT_ID");
  const segredo = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!refresh || !id || !segredo) return null;
  if (tokenCache && tokenCache.ate > Date.now()) return tokenCache.valor;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  if (!r.ok) {
    console.error("google token", r.status, await r.text());
    return null;
  }
  const j = await r.json();
  tokenCache = { valor: j.access_token, ate: Date.now() + (j.expires_in - 120) * 1000 };
  return tokenCache.valor;
}

const inicioDoMes = (d = diaSP()) => `${d.slice(0, 7)}-01`;

/** Search Console: totais do mês corrente e as 10 buscas que mais trouxeram cliques. */
async function searchConsole(db: SupabaseClient, s: Site) {
  if (!s.gsc_propriedade) return;
  const token = await tokenGoogle(db);
  if (!token) return;
  // os dados do Search Console chegam com ~2 dias de atraso
  const fim = diaSP(new Date(Date.now() - 2 * 24 * HORA));
  const ini = inicioDoMes(fim);
  const api = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(s.gsc_propriedade)}/searchAnalytics/query`;
  const consulta = (corpo: unknown) =>
    fetch(api, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).then(async (r) => {
      if (!r.ok) throw new Error(`gsc ${r.status} ${(await r.text()).slice(0, 200)}`);
      return r.json();
    });
  try {
    const [total, buscas] = await Promise.all([
      consulta({ startDate: ini, endDate: fim, dataState: "all" }),
      consulta({ startDate: ini, endDate: fim, dimensions: ["query"], rowLimit: 10, dataState: "all" }),
    ]);
    const t = total.rows?.[0] || {};
    const dados = {
      de: ini,
      ate: fim,
      cliques: t.clicks || 0,
      impressoes: t.impressions || 0,
      ctr: t.ctr || 0,
      posicao: t.position || null,
      buscas: (buscas.rows || []).map((r: { keys: string[]; clicks: number; impressions: number; position: number }) => ({
        termo: r.keys[0],
        cliques: r.clicks,
        impressoes: r.impressions,
        posicao: Math.round(r.position * 10) / 10,
      })),
    };
    await db.from("monitor_externo").upsert({ site_id: s.id, fonte: "gsc", periodo: ini.slice(0, 7), dados, coletado_em: new Date().toISOString() }, { onConflict: "site_id,fonte,periodo" });
  } catch (e) {
    console.error("gsc", s.url, e);
  }
}

/** Perfil da Empresa: buscas, visualizações, ligações, rotas e cliques no site do mês corrente. */
async function perfilEmpresa(db: SupabaseClient, s: Site) {
  if (!s.gbp_local) return;
  const token = await tokenGoogle(db);
  if (!token) return;
  const fim = diaSP(new Date(Date.now() - 24 * HORA));
  const ini = inicioDoMes(fim);
  const [a1, m1, d1] = ini.split("-").map(Number);
  const [a2, m2, d2] = fim.split("-").map(Number);
  const METRICAS = [
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
    "CALL_CLICKS",
    "WEBSITE_CLICKS",
    "BUSINESS_DIRECTION_REQUESTS",
    "BUSINESS_CONVERSATIONS",
  ];
  const q = new URLSearchParams({
    "dailyRange.startDate.year": String(a1),
    "dailyRange.startDate.month": String(m1),
    "dailyRange.startDate.day": String(d1),
    "dailyRange.endDate.year": String(a2),
    "dailyRange.endDate.month": String(m2),
    "dailyRange.endDate.day": String(d2),
  });
  for (const m of METRICAS) q.append("dailyMetrics", m);
  const local = s.gbp_local.replace(/^locations\//, "");
  try {
    const r = await fetch(`https://businessprofileperformance.googleapis.com/v1/locations/${local}:fetchMultiDailyMetricsTimeSeries?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return console.error("gbp", s.url, r.status, (await r.text()).slice(0, 200));
    const j = await r.json();
    const soma: Record<string, number> = {};
    for (const serie of j.multiDailyMetricTimeSeries || []) {
      for (const d of serie.dailyMetricTimeSeries || []) {
        const total = (d.timeSeries?.datedValues || []).reduce((acc: number, v: { value?: string }) => acc + Number(v.value || 0), 0);
        soma[d.dailyMetric] = (soma[d.dailyMetric] || 0) + total;
      }
    }
    const dados = {
      de: ini,
      ate: fim,
      visualizacoes: (soma.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) + (soma.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) + (soma.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (soma.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0),
      no_maps: (soma.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) + (soma.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0),
      ligacoes: soma.CALL_CLICKS || 0,
      cliques_site: soma.WEBSITE_CLICKS || 0,
      rotas: soma.BUSINESS_DIRECTION_REQUESTS || 0,
      conversas: soma.BUSINESS_CONVERSATIONS || 0,
    };
    await db.from("monitor_externo").upsert({ site_id: s.id, fonte: "gbp", periodo: ini.slice(0, 7), dados, manual: false, coletado_em: new Date().toISOString() }, { onConflict: "site_id,fonte,periodo" });
  } catch (e) {
    console.error("gbp", s.url, e);
  }
}

// ---------------------------------------------------------------------------
// Relatório mensal
// ---------------------------------------------------------------------------
type Resumo = { visitas: number; paginas: number; whatsapp: number; telefone: number; rota: number; formularios: number; celular: number; checagens: number; falhas: number; origens: Record<string, number> };

async function resumoDoMes(db: SupabaseClient, siteId: string, mes: string): Promise<Resumo> {
  const ini = `${mes}-01`;
  const [a, m] = mes.split("-").map(Number);
  const fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const { data } = await db.from("monitor_dia").select("*").eq("site_id", siteId).gte("dia", ini).lte("dia", fim);
  const r: Resumo = { visitas: 0, paginas: 0, whatsapp: 0, telefone: 0, rota: 0, formularios: 0, celular: 0, checagens: 0, falhas: 0, origens: {} };
  for (const d of data || []) {
    r.visitas += d.visitas;
    r.paginas += d.paginas_vistas;
    r.whatsapp += d.whatsapp;
    r.telefone += d.telefone;
    r.rota += d.rota;
    r.formularios += d.formularios;
    r.celular += d.celular;
    r.checagens += d.checagens;
    r.falhas += d.falhas;
    for (const [o, n] of Object.entries(d.origens || {})) r.origens[o] = (r.origens[o] || 0) + Number(n);
  }
  return r;
}

async function relatorioDoSite(db: SupabaseClient, s: Site, mes: string, enviar: boolean) {
  const [a, m] = mes.split("-").map(Number);
  const anterior = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
  const [atual, antes] = await Promise.all([resumoDoMes(db, s.id, mes), resumoDoMes(db, s.id, anterior)]);
  const externo = async (fonte: string, periodo?: string) => {
    let q = db.from("monitor_externo").select("dados, periodo").eq("site_id", s.id).eq("fonte", fonte);
    q = periodo ? q.eq("periodo", periodo) : q.lte("periodo", `${mes}-31`).order("periodo", { ascending: false }).limit(1);
    const { data } = await q;
    return data?.[0]?.dados || null;
  };
  const [ps, gsc, gbp] = await Promise.all([externo("pagespeed"), externo("gsc", mes), externo("gbp", mes)]);
  const dados = {
    mes,
    site: { nome: s.nome, url: s.url },
    atual,
    anterior: antes,
    disponibilidade: atual.checagens ? Math.round((1 - atual.falhas / atual.checagens) * 1000) / 10 : null,
    pagespeed: ps,
    search_console: gsc,
    perfil_empresa: gbp,
  };
  await db.from("monitor_relatorios").upsert({ site_id: s.id, mes: `${mes}-01`, dados }, { onConflict: "site_id,mes" });

  let enviado = false;
  if (enviar && s.relatorio_email) {
    const { data: rel } = await db.from("monitor_relatorios").select("enviado_em").eq("site_id", s.id).eq("mes", `${mes}-01`).maybeSingle();
    if (!rel?.enviado_em) {
      const msg = MSG.relatorio(s, dados);
      enviado = await enviarEmail(s.relatorio_email, msg.assunto, msg.html);
      if (enviado) await db.from("monitor_relatorios").update({ enviado_em: new Date().toISOString(), enviado_para: s.relatorio_email }).eq("site_id", s.id).eq("mes", `${mes}-01`);
    }
  }
  return { dados, enviado };
}
