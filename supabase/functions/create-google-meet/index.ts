// Edge Function: create-google-meet
//
// Cria um evento no Google Calendar da Codifica (com sala do Meet anexada).
// Chamada pelo frontend logo após inserir a reunião no Supabase.
//
// Payload esperado:
// {
//   data: "2026-05-20",        // YYYY-MM-DD
//   horario: "14:00",          // HH:mm
//   durationMinutes?: 30,      // default 30
//   topico: string,            // tópico da reunião (vai pra description)
//   clienteEmail: string,      // email do aluno (entra como attendee)
//   clienteNome: string,       // nome do aluno (vai pro summary)
//   participantesExtras: string[], // emails adicionais convidados pelo aluno
//   projectName?: string,      // nome do projeto (opcional, ajuda no summary)
// }
//
// Retorno:
// { meetLink: string, eventId: string }

import { corsHeaders } from "../_shared/cors.ts";
import {
  getCodificaOrganizerEmail,
  getGoogleAccessToken,
} from "../_shared/google-auth.ts";

interface CreatePayload {
  data: string;
  horario: string;
  durationMinutes?: number;
  topico: string;
  clienteEmail: string;
  clienteNome: string;
  participantesExtras?: string[];
  projectName?: string;
}

// Monta strings ISO no fuso de São Paulo (UTC-03, sem horário de verão atualmente).
// O Google aceita "2026-05-20T14:00:00" com timeZone="America/Sao_Paulo".
function buildDateTime(data: string, horario: string): string {
  return `${data}T${horario}:00`;
}

function addMinutes(horario: string, minutes: number): string {
  const [h, m] = horario.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60).toString().padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as CreatePayload;

    if (!payload.data || !payload.horario) {
      throw new Error("data e horario são obrigatórios");
    }
    if (!payload.clienteEmail || !isValidEmail(payload.clienteEmail)) {
      throw new Error("clienteEmail inválido");
    }

    const duration = payload.durationMinutes ?? 30;
    const endHorario = addMinutes(payload.horario, duration);
    const codificaEmail = getCodificaOrganizerEmail();

    const extras = (payload.participantesExtras ?? [])
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && isValidEmail(e));

    const attendeeEmails = new Set<string>([
      codificaEmail,
      payload.clienteEmail,
      ...extras,
    ]);
    const attendees = Array.from(attendeeEmails).map((email) => ({ email }));

    const summary = payload.projectName
      ? `Codifica × ${payload.clienteNome} — ${payload.projectName}`
      : `Codifica × ${payload.clienteNome}`;

    const description = payload.topico?.trim()
      ? `Tópico da reunião:\n\n${payload.topico}`
      : "Reunião agendada pelo Espaço do Cliente da Codifica.";

    const event = {
      summary,
      description,
      start: {
        dateTime: buildDateTime(payload.data, payload.horario),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: buildDateTime(payload.data, endHorario),
        timeZone: "America/Sao_Paulo",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };

    const accessToken = await getGoogleAccessToken();

    // sendUpdates=all → Google envia convite por email aos attendees
    // conferenceDataVersion=1 → necessário para criar a sala do Meet
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Calendar API: ${res.status} ${text}`);
    }

    const created = await res.json();
    const meetLink =
      created.hangoutLink ??
      created.conferenceData?.entryPoints?.find(
        (ep: { entryPointType?: string; uri?: string }) =>
          ep.entryPointType === "video"
      )?.uri;

    if (!meetLink) {
      throw new Error("Google criou o evento mas não devolveu o link do Meet");
    }

    return new Response(
      JSON.stringify({ meetLink, eventId: created.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
