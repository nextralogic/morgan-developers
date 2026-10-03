/**
 * Minimal read-only Supabase REST client for edge functions. Uses the public
 * anon key, so row level security applies exactly as it does in the browser.
 */

const REQUEST_TIMEOUT_MS = 2500;

export interface RestResult<T> {
  data: T;
  headers: Headers;
}

function env(name: string): string | undefined {
  return Netlify.env.get(name)?.trim() || undefined;
}

export function getSiteUrl(requestUrl: URL): string {
  return (env("VITE_SITE_URL") ?? requestUrl.origin).replace(/\/$/, "");
}

/** Returns null on any failure so callers can fall back to the plain page. */
export async function supabaseRest<T>(query: string): Promise<RestResult<T> | null> {
  const baseUrl = env("VITE_SUPABASE_URL");
  const apiKey = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!baseUrl || !apiKey) return null;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${query}`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return { data: (await response.json()) as T, headers: response.headers };
  } catch {
    return null;
  }
}
