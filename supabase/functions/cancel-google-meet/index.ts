// Edge Function: cancel-google-meet
//
// Deleta o evento no Google Calendar da Codifica.
// O Google notifica automaticamente os attendees por email do cancelamento.
//
// Payload esperado: { eventId: string }
// Retorno: { ok: true }

import { corsHeaders } from "../_shared/cors.ts";
import { getGoogleAccessToken } from "../_shared/google-auth.ts";

interface CancelPayload {
  eventId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventId } = (await req.json()) as CancelPayload;
    if (!eventId) {
      throw new Error("eventId é obrigatório");
    }

    const accessToken = await getGoogleAccessToken();

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // 410 Gone = evento já foi deletado antes → tratamos como sucesso (idempotente)
    if (!res.ok && res.status !== 410) {
      const text = await res.text();
      throw new Error(`Google Calendar API: ${res.status} ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
