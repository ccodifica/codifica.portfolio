import { supabase } from "@/lib/supabase";

// ============================================================================
// Wrapper das Edge Functions Supabase que falam com a Google Calendar API.
// Toda chamada à API do Google passa pelo backend (Edge Functions) — credenciais
// OAuth nunca entram no bundle do frontend.
// ============================================================================

export interface CreateMeetEventInput {
  data: string; // YYYY-MM-DD
  horario: string; // HH:mm
  durationMinutes?: number; // default 30 no backend
  topico: string;
  clienteEmail: string;
  clienteNome: string;
  participantesExtras: string[];
  projectName?: string;
}

export interface CreateMeetEventResult {
  meetLink: string;
  eventId: string;
}

export async function createGoogleMeetEvent(
  input: CreateMeetEventInput
): Promise<CreateMeetEventResult> {
  const { data, error } = await supabase.functions.invoke<
    CreateMeetEventResult | { error: string }
  >("create-google-meet", { body: input });

  if (error) throw error;
  if (!data) throw new Error("Edge function não retornou dados");
  if ("error" in data) throw new Error(data.error);
  return data;
}

export async function cancelGoogleMeetEvent(eventId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<
    { ok: true } | { error: string }
  >("cancel-google-meet", { body: { eventId } });

  if (error) throw error;
  if (data && "error" in data) throw new Error(data.error);
}
