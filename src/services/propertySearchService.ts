import { supabase } from "@/integrations/supabase/client";

// ─── Search filter model ────────────────────────────────────────────────────

export type PropertySearchFilters = {
  query?: string;
  type?: "apartment" | "house" | "land";
  status?: "published" | "draft" | "sold";
  minPrice?: number;
  maxPrice?: number;
  minAreaSqft?: number;
  maxAreaSqft?: number;
  province?: string;
  district?: string;
  municipalityOrCity?: string;
  sort?: "newest" | "price_low" | "price_high" | "area_large";
  page?: number;
  pageSize?: number;
};

// ─── Result type ────────────────────────────────────────────────────────────

export interface PropertyImage {
  image_url: string;
  is_primary: boolean;
}

export interface PropertyLocation {
  id: string;
  display_name: string | null;
  province: string | null;
  district: string | null;
  municipality_or_city: string | null;
}

export interface PropertyWithLocation {
  id: string;
  property_public_id: number;
  title: string;
  price: number;
  type: "apartment" | "house" | "land";
  status: "draft" | "published" | "sold";
  description: string | null;
  area_sqft: number | null;
  area_value: number | null;
  area_unit: string | null;
  created_at: string;
  updated_at: string;
  location_id: string | null;
  created_by: string | null;
  locations: PropertyLocation | null;
  property_images: PropertyImage[];
}

export interface SearchResult {
  data: PropertyWithLocation[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 48;

// ─── Normalise filters (defensive) ─────────────────────────────────────────

function normalise(filters: PropertySearchFilters): PropertySearchFilters {
  const f = { ...filters };

  f.page = Math.max(1, f.page ?? DEFAULT_PAGE);
  f.pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, f.pageSize ?? DEFAULT_PAGE_SIZE));
  f.status = f.status ?? "published";

  // Swap impossible ranges
  if (f.minPrice != null && f.maxPrice != null && f.minPrice > f.maxPrice) {
    [f.minPrice, f.maxPrice] = [f.maxPrice, f.minPrice];
  }
  if (f.minAreaSqft != null && f.maxAreaSqft != null && f.minAreaSqft > f.maxAreaSqft) {
    [f.minAreaSqft, f.maxAreaSqft] = [f.maxAreaSqft, f.minAreaSqft];
  }

  return f;
}

// ─── Main search function ───────────────────────────────────────────────────

export async function searchProperties(
  rawFilters: PropertySearchFilters
): Promise<SearchResult> {
  const filters = normalise(rawFilters);
  const { page, pageSize } = filters as Required<Pick<PropertySearchFilters, "page" | "pageSize">>;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query
  let query = supabase
    .from("properties")
    .select(
      "*, locations(id, display_name, province, district, municipality_or_city), property_images(image_url, is_primary)",
      { count: "exact" }
    )
    .eq("status", filters.status!)
    .eq("is_deleted", false);

  // ── Type filter
  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  // ── Price range
  if (filters.minPrice != null && filters.minPrice > 0) {
    query = query.gte("price", filters.minPrice);
  }
  if (filters.maxPrice != null) {
    query = query.lte("price", filters.maxPrice);
  }

  // ── Area range
  if (filters.minAreaSqft != null && filters.minAreaSqft > 0) {
    query = query.gte("area_sqft", filters.minAreaSqft);
  }
  if (filters.maxAreaSqft != null) {
    query = query.lte("area_sqft", filters.maxAreaSqft);
  }

  // ── Location filters
  // PostgREST embedded filters (e.g. locations.province=eq.X) only filter the
  // nested object, NOT the parent row. So we must resolve matching location IDs
  // first, then filter properties by location_id.
  if (filters.province || filters.district || filters.municipalityOrCity) {
    let locQuery = supabase.from("locations").select("id");
    if (filters.province) locQuery = locQuery.eq("province", filters.province);
    if (filters.district) locQuery = locQuery.eq("district", filters.district);
    if (filters.municipalityOrCity) locQuery = locQuery.eq("municipality_or_city", filters.municipalityOrCity);

    const { data: matchingLocs } = await locQuery.limit(500);
    const locIds = matchingLocs?.map((l) => l.id) ?? [];

    if (locIds.length > 0) {
      query = query.in("location_id", locIds);
    } else {
      // No locations match — return empty result immediately
      return { data: [], totalCount: 0, page, pageSize };
    }
  }

  // ── Free-text search
  // PostgREST doesn't support .or() across parent and embedded/joined tables,
  // so we first find matching location IDs, then use an OR of title ILIKE + location_id IN.
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim();
    const pattern = `%${q}%`;

    // Find location IDs matching the search term
    const { data: matchingLocations } = await supabase
      .from("locations")
      .select("id")
      .or(`display_name.ilike.${pattern},search_key.ilike.${pattern},name.ilike.${pattern}`)
      .limit(100);

    const locationIds = matchingLocations?.map((l) => l.id) ?? [];

    if (locationIds.length > 0) {
      // Search title OR matching locations
      query = query.or(`title.ilike.${pattern},location_id.in.(${locationIds.join(",")})`);
    } else {
      // No location matches — just search title
      query = query.ilike("title", pattern);
    }
  }

  // ── Sorting
  switch (filters.sort ?? "newest") {
    case "price_low":
      query = query.order("price", { ascending: true });
      break;
    case "price_high":
      query = query.order("price", { ascending: false });
      break;
    case "area_large":
      query = query.order("area_sqft", { ascending: false, nullsFirst: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // ── Pagination
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const totalCount = count ?? 0;

  // If page is beyond results, return empty gracefully
  return {
    data: (data as unknown as PropertyWithLocation[]) ?? [],
    totalCount,
    page,
    pageSize,
  };
}

// ─── URL param helpers ──────────────────────────────────────────────────────

/** Parse URLSearchParams into PropertySearchFilters */
export function filtersFromParams(params: URLSearchParams): PropertySearchFilters {
  const str = (key: string) => params.get(key) || undefined;
  const num = (key: string) => {
    const v = params.get(key);
    return v ? Number(v) : undefined;
  };

  return {
    query: str("q"),
    type: str("type") as PropertySearchFilters["type"],
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    minAreaSqft: num("minArea"),
    maxAreaSqft: num("maxArea"),
    province: str("province"),
    district: str("district"),
    municipalityOrCity: str("municipality"),
    sort: (str("sort") as PropertySearchFilters["sort"]) ?? "newest",
    page: num("page") ?? 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

/** Build URLSearchParams from filters (only non-default values) */
export function filtersToParams(filters: PropertySearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.query) p.set("q", filters.query);
  if (filters.type) p.set("type", filters.type);
  if (filters.minPrice && filters.minPrice > 0) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice && filters.maxPrice < 50_000_000) p.set("maxPrice", String(filters.maxPrice));
  if (filters.minAreaSqft && filters.minAreaSqft > 0) p.set("minArea", String(filters.minAreaSqft));
  if (filters.maxAreaSqft) p.set("maxArea", String(filters.maxAreaSqft));
  if (filters.province) p.set("province", filters.province);
  if (filters.district) p.set("district", filters.district);
  if (filters.municipalityOrCity) p.set("municipality", filters.municipalityOrCity);
  if (filters.sort && filters.sort !== "newest") p.set("sort", filters.sort);
  if (filters.page && filters.page > 1) p.set("page", String(filters.page));
  return p;
}
