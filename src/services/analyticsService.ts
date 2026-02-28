/**
 * Analytics Service
 * -----------------
 * - logPropertyView: logs a view with session-based deduplication (30 min window)
 * - getMostViewedProperties: fetches top properties by view_count
 *
 * Session ID is generated once per browser and stored in localStorage.
 * The debounce window (VIEW_COOLDOWN_MS) prevents duplicate logs for the
 * same property within 30 minutes. Adjust as needed.
 *
 * To extend analytics later:
 *   - Add new log functions (e.g., logSearch, logLeadSubmission)
 *   - Query property_views directly for time-series charts
 *   - Build admin-only aggregate views/functions
 */

import { supabase } from "@/integrations/supabase/client";

// --- Config ---
const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_KEY = "morgan_session_id";
const VIEW_LOG_KEY = "morgan_view_log";

// --- Helpers ---

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Returns true if this property was already logged within the cooldown window */
function wasRecentlyViewed(propertyId: string): boolean {
  try {
    const raw = sessionStorage.getItem(VIEW_LOG_KEY);
    const log: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastViewed = log[propertyId];
    if (lastViewed && Date.now() - lastViewed < VIEW_COOLDOWN_MS) return true;
    return false;
  } catch {
    return false;
  }
}

function markViewed(propertyId: string) {
  try {
    const raw = sessionStorage.getItem(VIEW_LOG_KEY);
    const log: Record<string, number> = raw ? JSON.parse(raw) : {};
    log[propertyId] = Date.now();
    sessionStorage.setItem(VIEW_LOG_KEY, JSON.stringify(log));
  } catch {
    // ignore storage errors
  }
}

// --- Public API ---

/**
 * Log a property view. Best-effort; failures are silently ignored.
 * Skips if the same property was viewed within the cooldown window.
 */
export async function logPropertyView(propertyId: string): Promise<void> {
  if (wasRecentlyViewed(propertyId)) return;

  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.rpc("log_property_view", {
      _property_id: propertyId,
      _session_id: sessionId,
      _user_id: user?.id ?? null,
      _user_agent: navigator.userAgent.slice(0, 256),
    });

    markViewed(propertyId);
  } catch {
    // best-effort; don't break the page
  }
}

export interface PropertyWithViewCount {
  id: string;
  title: string;
  price: number;
  type: string;
  status: string;
  view_count: number;
  property_public_id: number;
  area_sqft: number | null;
  locations: { name: string } | null;
  property_images: { image_url: string; is_primary: boolean }[];
}

/**
 * Fetch the most viewed published properties.
 */
export async function getMostViewedProperties(limit = 6): Promise<PropertyWithViewCount[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, price, type, status, view_count, property_public_id, area_sqft, locations(name), property_images(image_url, is_primary)")
    .eq("status", "published")
    .eq("is_deleted", false)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PropertyWithViewCount[];
}

/**
 * Fetch top viewed properties for admin (any status).
 */
export async function getAdminTopViewed(limit = 10): Promise<{ id: string; title: string; property_public_id: number; type: string; status: string; view_count: number }[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, title, property_public_id, type, status, view_count")
    .eq("is_deleted", false)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
