
-- ============================================================
-- Performance indexes for property search
-- These composite indexes match the WHERE clauses used by
-- searchProperties() in propertySearchService.ts
-- ============================================================

-- 1. Main listing query: status filter + newest sort
CREATE INDEX IF NOT EXISTS idx_properties_status_created
  ON public.properties (status, created_at DESC);

-- 2. Status + type (common filter combo)
CREATE INDEX IF NOT EXISTS idx_properties_status_type
  ON public.properties (status, type);

-- 3. Status + price range queries
CREATE INDEX IF NOT EXISTS idx_properties_status_price
  ON public.properties (status, price);

-- 4. Status + area range queries
CREATE INDEX IF NOT EXISTS idx_properties_status_area
  ON public.properties (status, area_sqft);

-- 5. Status + location join (for location-filtered searches)
CREATE INDEX IF NOT EXISTS idx_properties_status_location
  ON public.properties (status, location_id, created_at DESC);

-- 6. Ensure property_public_id has a unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_public_id
  ON public.properties (property_public_id);

-- 7. Locations: cascading filter (province → district → municipality)
CREATE INDEX IF NOT EXISTS idx_locations_address
  ON public.locations (province, district, municipality_or_city);

-- 8. Locations: search_key for text matching
CREATE INDEX IF NOT EXISTS idx_locations_search_key
  ON public.locations (search_key);

-- 9. Locations: display_name for ILIKE queries (trigram would be ideal
--    but pg_trgm may not be enabled; btree still helps with prefix matches)
CREATE INDEX IF NOT EXISTS idx_locations_display_name
  ON public.locations (display_name);
