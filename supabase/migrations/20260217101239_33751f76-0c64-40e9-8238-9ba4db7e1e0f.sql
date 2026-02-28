
-- Add area_unit and area_value columns to properties
ALTER TABLE public.properties
ADD COLUMN area_unit text DEFAULT 'sq_feet',
ADD COLUMN area_value numeric;

-- Backfill existing records that have area_sqft
UPDATE public.properties
SET area_unit = 'sq_feet', area_value = area_sqft
WHERE area_sqft IS NOT NULL AND area_value IS NULL;

-- Add validation trigger for non-negative area values
CREATE OR REPLACE FUNCTION public.validate_area_values()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.area_value IS NOT NULL AND NEW.area_value < 0 THEN
    RAISE EXCEPTION 'area_value must be >= 0';
  END IF;
  IF NEW.area_sqft IS NOT NULL AND NEW.area_sqft < 0 THEN
    RAISE EXCEPTION 'area_sqft must be >= 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_property_area
BEFORE INSERT OR UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.validate_area_values();
