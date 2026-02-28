import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  metadata: Record<string, unknown> | null;
  profiles: { full_name: string | null } | null;
}

export interface AuditLogFilters {
  entity_type?: string;
  action?: string;
  performed_by?: string;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/*  Log an action (best-effort, never throws)                          */
/* ------------------------------------------------------------------ */

export async function logAction(
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      performed_by: user.id,
      metadata: metadata ?? null,
    } as any);
  } catch (err) {
    console.warn("Audit log failed (non-critical):", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch audit logs (admin only)                                      */
/* ------------------------------------------------------------------ */

export async function fetchAuditLogs(filters: AuditLogFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("audit_logs")
    .select("*, profiles:performed_by(full_name)", { count: "exact" })
    .order("performed_at", { ascending: false })
    .range(from, to);

  if (filters.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }
  if (filters.action) {
    query = query.eq("action", filters.action);
  }
  if (filters.performed_by) {
    query = query.eq("performed_by", filters.performed_by);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as unknown as AuditLogRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}
