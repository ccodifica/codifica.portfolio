import { supabase } from "@/lib/supabase";

/**
 * Métricas do funil.
 *
 * Camada 1 (sempre ligada): eventos anônimos gravados no Supabase. Sem cookie
 * e sem dado pessoal: só um id de sessão aleatório no sessionStorage, que some
 * quando a aba fecha.
 *
 * Camada 2 (só com consentimento): Microsoft Clarity, com mapas de calor e
 * gravações de sessão. Carregado apenas se CLARITY_ID estiver preenchido e o
 * visitante aceitar.
 */

export const CLARITY_ID = "z9lqozv5bh"; // projeto "Codifica" em clarity.microsoft.com (vazio = desligado)

export type EventoSite =
  | "visita_oferta"
  | "visita_como_funciona"
  | "visita_contrato"
  | "visita_comecar"
  | "form_inicio"
  | "form_erro"
  | "form_enviado"
  | "clique_whatsapp"
  | "clique_comecar"
  | "pedido_aberto"
  | "previa_aberta"
  | "clique_pagar"
  | "clique_projeto"
  | "video_play"
  | "video_fim";

const CHAVES_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "nicho"] as const;

const ler = (k: string) => {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* navegação privada: segue sem guardar */
  }
};

export const sessao = () => {
  let s = ler("codifica.sessao");
  if (!s) {
    s = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    gravar("codifica.sessao", s);
  }
  return s;
};

/** Guarda a campanha da primeira página visitada na sessão (ex.: link do anúncio). */
export const capturarUtm = () => {
  if (ler("codifica.utm")) return;
  const q = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  CHAVES_UTM.forEach((k) => {
    const v = q.get(k);
    if (v) utm[k] = v.slice(0, 80);
  });
  gravar("codifica.utm", JSON.stringify(utm));
};

export const utmDaSessao = (): Record<string, string> => {
  try {
    return JSON.parse(ler("codifica.utm") || "{}");
  } catch {
    return {};
  }
};

const dispositivo = () => (window.matchMedia("(max-width: 768px)").matches ? "celular" : "computador");

const jaRegistrados = new Set<string>();

/** Registra um evento. `unico` evita duplicar o mesmo evento na mesma sessão. */
export function registrar(evento: EventoSite, detalhe = "", unico = false) {
  const chave = `${evento}|${detalhe}`;
  if (unico && (jaRegistrados.has(chave) || ler(`codifica.ev.${chave}`))) return;
  jaRegistrados.add(chave);
  if (unico) gravar(`codifica.ev.${chave}`, "1");
  supabase
    .rpc("registrar_evento", {
      p_sessao: sessao(),
      p_evento: evento,
      p_pagina: window.location.pathname.replace(/\/pedido\/[^/]+/, "/pedido/:codigo"),
      p_detalhe: detalhe,
      p_utm: utmDaSessao(),
      p_dispositivo: dispositivo(),
    })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) console.warn("[metricas]", error.message);
    });
  if (window.clarity) window.clarity("event", evento);
}

// ---------------------------------------------------------------------------
// Clarity (só com consentimento)
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export type Consentimento = "aceito" | "recusado" | null;

export const lerConsentimento = (): Consentimento => {
  try {
    return localStorage.getItem("codifica.consentimento") as Consentimento;
  } catch {
    return null;
  }
};

export const salvarConsentimento = (c: Exclude<Consentimento, null>) => {
  try {
    localStorage.setItem("codifica.consentimento", c);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  if (c === "aceito") carregarClarity();
};

export function carregarClarity() {
  if (!CLARITY_ID || window.clarity) return;
  const fila: unknown[][] = [];
  window.clarity = (...args: unknown[]) => fila.push(args);
  (window.clarity as unknown as { q: unknown[][] }).q = fila;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(s);
}
