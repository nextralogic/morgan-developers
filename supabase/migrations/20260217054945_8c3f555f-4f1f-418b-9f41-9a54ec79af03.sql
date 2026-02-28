
-- Step 1: Add new columns to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS municipality_or_city text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS ward integer;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS area_name text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS search_key text;

-- Create indexes for filter queries
CREATE INDEX IF NOT EXISTS idx_locations_province ON public.locations (province);
CREATE INDEX IF NOT EXISTS idx_locations_district ON public.locations (district);
CREATE INDEX IF NOT EXISTS idx_locations_municipality ON public.locations (municipality_or_city);
CREATE INDEX IF NOT EXISTS idx_locations_search_key ON public.locations (search_key);
