// Troca o refresh_token (vitalício) por um access_token (1h) do Google.
// Lê as 3 credenciais dos secrets do Supabase Edge Function:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function getGoogleAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google OAuth secrets ausentes (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)"
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao renovar access_token do Google: ${res.status} ${text}`);
  }

  const data = (await res.json()) as TokenResponse;
  return data.access_token;
}

export function getCodificaOrganizerEmail(): string {
  const email = Deno.env.get("CODIFICA_ORGANIZER_EMAIL");
  if (!email) {
    throw new Error("CODIFICA_ORGANIZER_EMAIL ausente nos secrets");
  }
  return email;
}
