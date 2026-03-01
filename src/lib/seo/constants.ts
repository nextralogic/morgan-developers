/** Base URL for canonical links and sitemap. Set VITE_SITE_URL for production. */
const ENV_SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
const RUNTIME_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://example.com";

export const SITE_URL = (ENV_SITE_URL && ENV_SITE_URL.length > 0 ? ENV_SITE_URL : RUNTIME_ORIGIN).replace(/\/$/, "");

export const SITE_NAME = "Morgan Developers";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
