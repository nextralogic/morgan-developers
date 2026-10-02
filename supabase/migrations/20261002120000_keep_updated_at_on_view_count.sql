-- View tracking increments properties.view_count on every page view, which was
-- also bumping updated_at through the generic trigger. updated_at feeds the
-- sitemap lastmod and listing dateModified, so it should only change when the
-- listing itself changes.

CREATE OR REPLACE FUNCTION public.update_properties_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'view_count' - 'updated_at') = (to_jsonb(OLD) - 'view_count' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_properties_updated_at();
