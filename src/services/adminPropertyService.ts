import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/services/auditService";

export interface AdminPropertyFilters {
  query?: string;
  status?: "draft" | "published" | "sold";
  type?: "apartment" | "house" | "land";
  isDeleted?: boolean; // undefined = all, true = deleted only, false = active only
  page?: number;
  pageSize?: number;
}

export interface AdminPropertyRow {
  id: string;
  property_public_id: number;
  title: string;
  type: string;
  price: number;
  status: string;
  is_deleted: boolean;
  created_at: string;
  created_by: string | null;
  locations: { display_name: string | null } | null;
  profiles: { full_name: string | null } | null;
}

export async function fetchAdminProperties(filters: AdminPropertyFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("properties")
    .select(
      "id, property_public_id, title, type, price, status, is_deleted, created_at, created_by, locations(display_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.isDeleted !== undefined) {
    query = query.eq("is_deleted", filters.isDeleted);
  }
  if (filters.query) {
    const q = filters.query.trim();
    const numericId = parseInt(q, 10);
    if (!isNaN(numericId) && String(numericId) === q) {
      query = query.eq("property_public_id", numericId);
    } else {
      query = query.ilike("title", `%${q}%`);
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as unknown as AdminPropertyRow[],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

export async function updatePropertyStatus(
  propertyId: string,
  newStatus: "draft" | "published" | "sold"
) {
  // Fetch current status for audit metadata
  const { data: current } = await supabase
    .from("properties")
    .select("status, title")
    .eq("id", propertyId)
    .single();

  const { error } = await supabase
    .from("properties")
    .update({ status: newStatus as any })
    .eq("id", propertyId);
  if (error) throw error;

  // Best-effort audit log
  const action = newStatus === "published" ? "publish" : newStatus === "draft" ? "unpublish" : "status_change";
  logAction("property", propertyId, action, {
    previous_status: current?.status,
    new_status: newStatus,
    title: current?.title,
  });
}

/** Soft-delete a property (set is_deleted = true) */
export async function archiveProperty(propertyId: string) {
  const { data: current } = await supabase
    .from("properties")
    .select("title")
    .eq("id", propertyId)
    .single();

  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: true } as any)
    .eq("id", propertyId);
  if (error) throw error;

  logAction("property", propertyId, "archive", { title: current?.title });
}

/** Restore a soft-deleted property */
export async function restoreProperty(propertyId: string) {
  const { data: current } = await supabase
    .from("properties")
    .select("title")
    .eq("id", propertyId)
    .single();

  const { error } = await supabase
    .from("properties")
    .update({ is_deleted: false } as any)
    .eq("id", propertyId);
  if (error) throw error;

  logAction("property", propertyId, "restore", { title: current?.title });
}
