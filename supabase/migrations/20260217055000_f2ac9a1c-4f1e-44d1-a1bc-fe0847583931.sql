
-- Now add unique constraint on the clean table
CREATE UNIQUE INDEX locations_address_unique
ON public.locations (
  COALESCE(province, ''),
  COALESCE(district, ''),
  COALESCE(municipality_or_city, ''),
  COALESCE(ward, 0),
  COALESCE(area_name, '')
);

-- Drop old columns that are no longer needed (parent_id, name were for old hierarchy)
-- Keep parent_id and name for now as they exist in types.ts (read-only), but they'll be unused
