// Monitoramento dos sites (aba "Métricas" do painel). Só admin lê (RLS).
import { supabase } from "@/lib/supabase";

export const URL_RASTREADOR = "https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/coletar";
export const snippetRastreador = (chave: string) => `<script defer src="${URL_RASTREADOR}" data-site="${chave}"></script>`;

export interface MonitorEstado {
  no_ar: boolean;
  falhas_seguidas: number;
  desde: string;
  ultima_checagem: string | null;
  ultimo_status: number | null;
  ultimo_ms: number | null;
  dominio_expira: string | null;
}

export interface MonitorSite {
  id: string;
  nome: string;
  url: string;
  tipo: "site" | "sistema" | "codifica";
  cliente: string | null;
  pedido_id: string | null;
  chave: string;
  ativo: boolean;
  rastreador_desde: string | null;
  relatorio_ativo: boolean;
  relatorio_email: string | null;
  gsc_propriedade: string | null;
  gbp_local: string | null;
  observacao: string | null;
  created_at: string;
  estado: MonitorEstado | null;
}

export interface MonitorDia {
  site_id: string;
  dia: string;
  visitas: number;
  paginas_vistas: number;
  whatsapp: number;
  telefone: number;
  rota: number;
  formularios: number;
  erros: number;
  celular: number;
  origens: Record<string, number>;
  paginas: Record<string, number>;
  checagens: number;
  falhas: number;
  tempo_medio_ms: number | null;
}

export interface MonitorExterno {
  site_id: string;
  fonte: "pagespeed" | "gsc" | "gbp";
  periodo: string;
  dados: Record<string, unknown>;
  manual: boolean;
  coletado_em: string;
}

export interface MonitorRelatorio {
  site_id: string;
  mes: string;
  dados: Record<string, unknown>;
  enviado_em: string | null;
  enviado_para: string | null;
}

export interface MonitorChecagem {
  ok: boolean;
  status: number | null;
  ms: number | null;
  erro: string | null;
  created_at: string;
}

export interface MonitorEvento {
  tipo: string;
  pagina: string | null;
  origem: string | null;
  detalhe: string | null;
  sessao: string;
  dispositivo: string | null;
  created_at: string;
}

const falha = (e: { message?: string } | null) => new Error(e?.message || "Não foi possível carregar o monitoramento.");

export async function listarSitesMonitorados(): Promise<MonitorSite[]> {
  const { data, error } = await supabase.from("monitor_sites").select("*, estado:monitor_estado(*)").order("created_at");
  if (error) throw falha(error);
  return (data || []).map((s) => ({ ...s, estado: Array.isArray(s.estado) ? s.estado[0] || null : s.estado })) as MonitorSite[];
}

/** Resumos diários desde uma data (todos os sites). */
export async function listarDias(desde: string): Promise<MonitorDia[]> {
  const { data, error } = await supabase.from("monitor_dia").select("*").gte("dia", desde).order("dia");
  if (error) throw falha(error);
  return data as MonitorDia[];
}

/** Eventos crus desde um instante (para o "hoje", que ainda não foi resumido). */
export async function listarEventos(siteId: string | null, desde: string, tipo?: string): Promise<(MonitorEvento & { site_id: string })[]> {
  let q = supabase.from("monitor_eventos").select("site_id, tipo, pagina, origem, detalhe, sessao, dispositivo, created_at").gte("created_at", desde).order("created_at", { ascending: false }).limit(5000);
  if (siteId) q = q.eq("site_id", siteId);
  if (tipo) q = q.eq("tipo", tipo);
  const { data, error } = await q;
  if (error) throw falha(error);
  return data as (MonitorEvento & { site_id: string })[];
}

export async function listarChecagens(siteId: string, desde: string): Promise<MonitorChecagem[]> {
  const { data, error } = await supabase.from("monitor_checagens").select("ok, status, ms, erro, created_at").eq("site_id", siteId).gte("created_at", desde).order("created_at");
  if (error) throw falha(error);
  return data as MonitorChecagem[];
}

export async function listarExterno(siteId?: string): Promise<MonitorExterno[]> {
  let q = supabase.from("monitor_externo").select("*").order("periodo", { ascending: false }).limit(500);
  if (siteId) q = q.eq("site_id", siteId);
  const { data, error } = await q;
  if (error) throw falha(error);
  return data as MonitorExterno[];
}

export async function listarRelatorios(siteId: string): Promise<MonitorRelatorio[]> {
  const { data, error } = await supabase.from("monitor_relatorios").select("*").eq("site_id", siteId).order("mes", { ascending: false });
  if (error) throw falha(error);
  return data as MonitorRelatorio[];
}

export async function criarSiteMonitorado(campos: Pick<MonitorSite, "nome" | "url" | "tipo"> & Partial<MonitorSite>) {
  const { data, error } = await supabase.from("monitor_sites").insert(campos).select("*").single();
  if (error) throw new Error(error.message.includes("duplicate") ? "Esse endereço já está sendo monitorado." : error.message);
  return data as MonitorSite;
}

export async function atualizarSiteMonitorado(id: string, campos: Partial<MonitorSite>) {
  const { estado: _e, ...resto } = campos;
  const { error } = await supabase.from("monitor_sites").update(resto).eq("id", id);
  if (error) throw falha(error);
}

export async function removerSiteMonitorado(id: string) {
  const { error } = await supabase.from("monitor_sites").delete().eq("id", id);
  if (error) throw falha(error);
}

/** Números do Perfil da Empresa digitados à mão (enquanto a API do Google não está liberada). */
export async function salvarPerfilManual(siteId: string, mes: string, dados: Record<string, number>) {
  const { error } = await supabase
    .from("monitor_externo")
    .upsert({ site_id: siteId, fonte: "gbp", periodo: mes, dados: { ...dados, de: `${mes}-01` }, manual: true, coletado_em: new Date().toISOString() }, { onConflict: "site_id,fonte,periodo" });
  if (error) throw falha(error);
}

/** Ações manuais na Edge Function (exigem login de admin). */
export async function acaoMonitor(corpo: { modo: "coletar_agora" | "relatorio"; site_id: string; mes?: string; enviar?: boolean }) {
  const { data, error } = await supabase.functions.invoke("monitor", { body: corpo });
  if (error || data?.erro) throw new Error("Não deu certo agora. Tente de novo em instantes.");
  return data as { ok?: boolean; dados?: Record<string, unknown>; enviado?: boolean };
}

/** Conexão com o Google (Search Console + Perfil da Empresa) pelo botão do painel. */
export type GoogleStatus = { conectado: boolean; email: string | null; em: string | null };
export type GoogleListas = {
  gsc: { propriedade: string; nivel: string }[] | { erro: string };
  gbp: { local: string; nome: string; conta: string }[] | { erro: string };
};
async function googleConectar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("google-conectar", { body: corpo });
  if (error || data?.erro) throw new Error(data?.erro === "nao_conectado" ? "Conecte o Google primeiro." : "Não deu certo agora. Tente de novo em instantes.");
  return data as T;
}
export const statusGoogle = () => googleConectar<GoogleStatus>({ acao: "status" });
export const listarGoogle = () => googleConectar<GoogleListas>({ acao: "listar" });
export const desconectarGoogle = () => googleConectar<{ ok: boolean }>({ acao: "desconectar" });
/** Leva para a tela de autorização do Google; ela volta para esta mesma página. */
export async function conectarGoogle() {
  const voltar = `${window.location.origin}${window.location.pathname}`;
  const { url } = await googleConectar<{ url: string }>({ acao: "iniciar", voltar });
  window.location.href = url;
}

/**
 * Vencimento do domínio consultado pelo navegador da equipe (o Registro.br bloqueia
 * os servidores do Supabase, que ficam fora do Brasil). Roda em segundo plano ao
 * abrir a aba, só para quem não foi checado nos últimos 7 dias.
 */
export async function atualizarDominios(sites: MonitorSite[]) {
  const SEGUNDO_NIVEL_BR = new Set(["com", "net", "org", "art", "blog", "eco", "edu", "gov", "ind", "inf", "med", "tur", "adv", "arq", "eng", "nom", "psc", "app", "dev", "log", "tec", "emp", "ong"]);
  const { data: estados } = await supabase.from("monitor_estado").select("site_id, dominio_checado");
  const checado = new Map((estados || []).map((e) => [e.site_id, e.dominio_checado as string | null]));
  for (const s of sites) {
    const ultima = checado.get(s.id);
    if (ultima && Date.now() - new Date(ultima).getTime() < 7 * 86400000) continue;
    try {
      const partes = new URL(s.url).hostname.replace(/^www\./, "").split(".");
      const tres = partes.length >= 3 && partes[partes.length - 1] === "br" && SEGUNDO_NIVEL_BR.has(partes[partes.length - 2]);
      const dom = partes.slice(tres ? -3 : -2).join(".");
      if (/vercel\.app$|netlify\.app$/.test(dom)) continue;
      const r = await fetch(dom.endsWith(".br") ? `https://rdap.registro.br/domain/${dom}` : `https://rdap.org/domain/${dom}`);
      if (!r.ok) continue;
      const j = await r.json();
      const exp = (j.events || []).find((e: { eventAction: string }) => e.eventAction === "expiration")?.eventDate;
      await supabase
        .from("monitor_estado")
        .update({ dominio_expira: exp ? String(exp).slice(0, 10) : null, dominio_checado: new Date().toISOString().slice(0, 10) })
        .eq("site_id", s.id);
    } catch {
      /* sem CORS ou fora do ar: tenta de novo na próxima abertura */
    }
  }
}

export const NOME_ORIGEM: Record<string, string> = {
  google: "Google",
  google_ads: "Anúncio no Google",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  whatsapp: "WhatsApp",
  direto: "Acesso direto",
  bing: "Bing",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};
export const nomeOrigem = (o: string) => NOME_ORIGEM[o] || o;
