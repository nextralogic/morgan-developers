import { supabase } from "@/integrations/supabase/client";
import { buildDisplayName, buildSearchKey, type NepalAddress } from "@/utils/nepalAddress";

export interface LocationRecord {
  id: string;
  province: string | null;
  district: string | null;
  municipality_or_city: string | null;
  ward: number | null;
  area_name: string | null;
  display_name: string | null;
}

/**
 * Upsert a location record. Returns the location id.
 * Uses the unique constraint on (province, district, municipality, ward, area_name).
 */
export async function upsertLocation(addr: NepalAddress): Promise<string> {
  const display_name = buildDisplayName(addr);
  const search_key = buildSearchKey(addr);
  const name = display_name; // legacy column, kept for compatibility

  // Try to find existing
  let query = supabase
    .from("locations")
    .select("id")
    .eq("province", addr.province)
    .eq("district", addr.district)
    .eq("municipality_or_city", addr.municipality_or_city);

  if (addr.ward) {
    query = query.eq("ward", addr.ward);
  } else {
    query = query.is("ward", null);
  }

  if (addr.area_name?.trim()) {
    query = query.eq("area_name", addr.area_name.trim());
  } else {
    query = query.is("area_name", null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  // Insert new
  const { data, error } = await supabase
    .from("locations")
    .insert({
      name,
      province: addr.province,
      district: addr.district,
      municipality_or_city: addr.municipality_or_city,
      ward: addr.ward || null,
      area_name: addr.area_name?.trim() || null,
      display_name,
      search_key,
    } as any)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Fetch a location record by ID */
export async function getLocationById(id: string): Promise<LocationRecord | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, province, district, municipality_or_city, ward, area_name, display_name")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as LocationRecord;
}
