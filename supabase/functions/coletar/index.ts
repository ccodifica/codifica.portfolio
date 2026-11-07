// Edge Function: coletar  (sem JWT: é chamada pelos sites monitorados)
//
// GET  → devolve o script do rastreador (2 KB). Instalação em qualquer site:
//        <script defer src="https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/coletar" data-site="CHAVE"></script>
// POST → recebe um evento { k, s, t, p, r, o, d, x } enviado pelo script (sendBeacon).
//
// Privacidade: sem cookie e sem guardar IP. A "sessão" é um número aleatório que
// vive só na aba (sessionStorage), então não precisa de aviso de cookies.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const URL_COLETA = "https://zhmhcyzsrihvigtelvux.supabase.co/functions/v1/coletar";
const TIPOS = ["pagina", "whatsapp", "telefone", "rota", "formulario", "erro"];
const ROBO = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|monitor|uptime/i;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

// Script do rastreador (vanilla JS, sem dependências)
const SCRIPT = `(function(){
var el=document.currentScript||document.querySelector('script[data-site]');if(!el)return;
var k=el.getAttribute('data-site');var u=${JSON.stringify(URL_COLETA)};
var h=location.hostname;if(!k||h==='localhost'||h==='127.0.0.1'||/^192\\.168\\./.test(h))return;
var s;try{s=sessionStorage.getItem('_cdf_s');if(!s){s=Math.random().toString(36).slice(2,12)+Date.now().toString(36);sessionStorage.setItem('_cdf_s',s)}}catch(e){s=Math.random().toString(36).slice(2,14)}
var d=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'celular':'computador';
function origem(){try{var q=new URLSearchParams(location.search);var utm=q.get('utm_source');if(utm)return utm.toLowerCase().slice(0,40);if(q.get('gclid'))return 'google_ads';if(q.get('fbclid'))return 'facebook';
var r=document.referrer?new URL(document.referrer).hostname.replace(/^www\\./,''):'';if(!r||r===h.replace(/^www\\./,''))return 'direto';
if(/google\\./.test(r))return 'google';if(/instagram\\./.test(r))return 'instagram';if(/facebook\\.|fb\\./.test(r))return 'facebook';if(/(^|\\.)(x|twitter|t)\\.(com|co)$/.test(r))return 'x';
if(/bing\\./.test(r))return 'bing';if(/linkedin\\./.test(r))return 'linkedin';if(/tiktok\\./.test(r))return 'tiktok';if(/whatsapp|wa\\.me/.test(r))return 'whatsapp';if(/youtube\\./.test(r))return 'youtube';return r.slice(0,40)}catch(e){return 'direto'}}
var o=origem();var ref='';try{ref=document.referrer?new URL(document.referrer).hostname:''}catch(e){}
function env(t,x){var b=JSON.stringify({k:k,s:s,t:t,p:location.pathname.slice(0,200),r:ref.slice(0,120),o:o,d:d,x:(x||'').slice(0,200)});
try{if(navigator.sendBeacon&&navigator.sendBeacon(u,b))return}catch(e){}try{fetch(u,{method:'POST',body:b,keepalive:true,mode:'no-cors'})}catch(e){}}
env('pagina');
var ult=location.pathname;function mudou(){if(location.pathname!==ult){ult=location.pathname;env('pagina')}}
var ps=history.pushState;history.pushState=function(){ps.apply(this,arguments);setTimeout(mudou,0)};addEventListener('popstate',mudou);
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;var l=a.href||'';
if(/wa\\.me|api\\.whatsapp\\.com|web\\.whatsapp\\.com|whatsapp:\\/\\//i.test(l))env('whatsapp',l);
else if(/^tel:/i.test(l))env('telefone',l);
else if(/google\\.[^/]+\\/maps|maps\\.google|goo\\.gl\\/maps|maps\\.app\\.goo\\.gl|waze\\.com/i.test(l))env('rota',l)},true);
document.addEventListener('submit',function(e){env('formulario',(e.target&&e.target.id)||'')},true);
var ne=0;addEventListener('error',function(e){if(ne++<3)env('erro',String((e&&e.message)||'erro'))});
})();`;

// Limite simples por sessão (por instância): evita que um script com defeito encha o banco
const contagem = new Map<string, { n: number; desde: number }>();
const dentroDoLimite = (sessao: string) => {
  const agora = Date.now();
  const c = contagem.get(sessao);
  if (!c || agora - c.desde > 60_000) {
    contagem.set(sessao, { n: 1, desde: agora });
    if (contagem.size > 5000) contagem.clear();
    return true;
  }
  return ++c.n <= 60;
};

// Chave → site (cache curto por instância)
const sites = new Map<string, { id: string | null; ate: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method === "GET") {
    return new Response(SCRIPT, { headers: { ...CORS, "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
  }
  if (req.method !== "POST") return new Response("método", { status: 405, headers: CORS });

  const vazio = new Response(null, { status: 204, headers: CORS });
  try {
    if (ROBO.test(req.headers.get("user-agent") || "")) return vazio;
    const e = JSON.parse(await req.text()) as Record<string, string>;
    const chave = String(e.k || "");
    const sessao = String(e.s || "").slice(0, 40);
    const tipo = String(e.t || "");
    if (!/^[0-9a-f]{18}$/.test(chave) || sessao.length < 6 || !TIPOS.includes(tipo) || !dentroDoLimite(sessao)) return vazio;

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    let site = sites.get(chave);
    if (!site || site.ate < Date.now()) {
      const { data } = await db.from("monitor_sites").select("id, ativo, rastreador_desde").eq("chave", chave).maybeSingle();
      site = { id: data?.ativo ? data.id : null, ate: Date.now() + 5 * 60_000 };
      sites.set(chave, site);
      if (data?.ativo && !data.rastreador_desde) await db.from("monitor_sites").update({ rastreador_desde: new Date().toISOString() }).eq("id", data.id);
    }
    if (!site.id) return vazio;

    await db.from("monitor_eventos").insert({
      site_id: site.id,
      sessao,
      tipo,
      pagina: String(e.p || "/").slice(0, 200),
      origem: String(e.o || "direto").slice(0, 40),
      referencia: String(e.r || "").slice(0, 120) || null,
      dispositivo: e.d === "celular" ? "celular" : "computador",
      detalhe: String(e.x || "").slice(0, 200) || null,
    });
  } catch (err) {
    console.error(err);
  }
  return vazio;
});
