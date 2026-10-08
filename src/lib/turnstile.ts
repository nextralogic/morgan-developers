/**
 * Cloudflare Turnstile, the CAPTCHA on the enquiry form. Nothing is loaded
 * until VITE_TURNSTILE_SITE_KEY is set, so the form works while the keys are
 * being set up.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptLoad: Promise<void> | null = null;

/** Loads Cloudflare's script once; a failed load can be retried. */
export function loadTurnstile(): Promise<void> {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}
