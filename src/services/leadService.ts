import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { logAction } from "@/services/auditService";
import { ilikeAny } from "@/lib/postgrest";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LeadStatus = "new" | "in_progress" | "contacted" | "closed" | "archived";

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  budget_range: string | null;
  preferred_contact_time: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  handled_by: string | null;
  created_at: string;
  updated_at: string;
  property_id: string | null;
  // joined
  properties: {
    id: string;
    title: string;
    property_public_id: number;
  } | null;
}

export interface AdminLeadFilters {
  status?: LeadStatus;
  query?: string;
  page?: number;
  pageSize?: number;
}

/* ------------------------------------------------------------------ */
/*  Admin: fetch leads with filters & pagination                       */
/* ------------------------------------------------------------------ */

export async function fetchLeadsForAdmin(filters: AdminLeadFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("leads")
    .select(
      "id, name, email, phone, message, budget_range, preferred_contact_time, source, status, notes, handled_by, created_at, updated_at, property_id, properties(id, title, property_public_id)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.query) {
    // Search across name, email and phone
    query = query.or(ilikeAny(["name", "email", "phone"], filters.query.trim()));
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as unknown as LeadRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

/* ------------------------------------------------------------------ */
/*  Admin: update lead status + notes                                  */
/* ------------------------------------------------------------------ */

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  notes?: string | null,
  handledBy?: string | null
) {
  // Fetch current status for audit
  const { data: current } = await supabase
    .from("leads")
    .select("status, notes")
    .eq("id", leadId)
    .single();

  const patch: TablesUpdate<"leads"> = { status };
  if (notes !== undefined) patch.notes = notes;
  if (handledBy !== undefined) patch.handled_by = handledBy;

  const { error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (error) throw error;

  // Best-effort audit
  const action = notes !== undefined && current?.notes !== notes ? "note_update" : "status_change";
  logAction("lead", leadId, action, {
    previous_status: current?.status,
    new_status: status,
  });
}

/* ------------------------------------------------------------------ */
/*  Public: create a lead (called from LeadForm)                       */
/*  The submit-lead edge function checks the CAPTCHA token, saves the  */
/*  lead and emails the admin; the table takes no direct inserts.      */
/* ------------------------------------------------------------------ */

export async function createLead(payload: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  budget_range?: string;
  preferred_contact_time?: string;
  property_id?: string | null;
  turnstile_token: string | null;
}) {
  // invoke() reports failures in `error` rather than throwing.
  const { error } = await supabase.functions.invoke("submit-lead", { body: payload });
  if (error) throw error;
}
