import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY devem estar definidas em .env.local"
  );
}

console.log("[supabase] init", {
  url: supabaseUrl,
  keyPrefix: supabaseKey.slice(0, 20) + "...",
  keyLength: supabaseKey.length,
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "codifica.auth",
  },
});

// Health check: garante que o domínio responde. Roda 1x no boot.
fetch(`${supabaseUrl}/auth/v1/health`, {
  headers: { apikey: supabaseKey },
})
  .then((r) => console.log("[supabase] health check", r.status))
  .catch((e) => console.error("[supabase] health check FAILED", e));

export const ATTACHMENTS_BUCKET = "attachments";
