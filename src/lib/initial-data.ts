/**
 * Data the edge function embeds in the HTML for the first page view, so the
 * page can render straight away instead of fetching the same rows again.
 * Shared with the edge function, so this file has no imports.
 */
export const INITIAL_DATA_ID = "initial-data";

export function propertyDataKey(slug: string): string {
  return `property:${slug}`;
}

let embedded: Record<string, unknown> | null | undefined;

function readEmbedded(): Record<string, unknown> | null {
  if (embedded !== undefined) return embedded;
  embedded = null;
  const text = typeof document !== "undefined" ? document.getElementById(INITIAL_DATA_ID)?.textContent : null;
  if (text) {
    try {
      embedded = JSON.parse(text);
    } catch {
      embedded = null;
    }
  }
  return embedded;
}

/** Returns the embedded value for `key` once. Later calls get undefined, so client-side navigation always fetches. */
export function takeInitialData<T>(key: string): T | undefined {
  const data = readEmbedded();
  if (!data || !(key in data)) return undefined;
  const value = data[key] as T;
  delete data[key];
  return value;
}
