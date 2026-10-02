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
export async function supabaseRest<T>(
  query: string,
  options: { method?: "GET" | "HEAD"; count?: boolean } = {}
): Promise<RestResult<T> | null> {
  const baseUrl = env("VITE_SUPABASE_URL");
  const apiKey = env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!baseUrl || !apiKey) return null;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${query}`, {
      method: options.method ?? "GET",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(options.count ? { Prefer: "count=exact" } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = options.method === "HEAD" ? (null as T) : ((await response.json()) as T);
    return { data, headers: response.headers };
  } catch {
    return null;
  }
}

/** Total row count from a PostgREST Content-Range header such as "0-24/25" or "*\/0". */
export function parseTotalCount(headers: Headers): number | null {
  const range = headers.get("content-range");
  const total = range?.split("/")[1];
  if (!total || total === "*") return null;
  const count = parseInt(total, 10);
  return Number.isNaN(count) ? null : count;
}
