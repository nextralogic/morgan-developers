-- Fixes from the 2026-10-08 security review.

-- 1. Lead notifications ---------------------------------------------------------
-- The browser picks a lead's id and then calls the lead-notification function,
-- which anyone holding the public key can call again and again with that id,
-- sending one email each time. notified_at lets the function claim a lead once,
-- so each lead sends at most one email.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Leads filed before this change were notified when they came in.
UPDATE public.leads SET notified_at = created_at WHERE notified_at IS NULL;

-- Leads from the public form arrive new and unhandled. Without these checks a
-- visitor could file a lead that is already archived or carries made-up notes.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(name)) > 0
  AND char_length(trim(email)) > 2
  AND email ~* '^[^@]+@[^@]+\.[^@]+$'
  AND status = 'new'
  AND notes IS NULL
  AND handled_by IS NULL
  AND notified_at IS NULL
);

-- 2. Photos and amenities of approved listings ----------------------------------
-- Owners may only edit a listing while it is a draft, but the photo and amenity
-- policies only checked ownership, so an owner could change the photos of a
-- published listing through the API without it being reviewed again.
DROP POLICY IF EXISTS "Users can insert own property images" ON public.property_images;
CREATE POLICY "Users can insert own property images"
ON public.property_images
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_images.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
));

DROP POLICY IF EXISTS "Users can update own property images" ON public.property_images;
CREATE POLICY "Users can update own property images"
ON public.property_images
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_images.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_images.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
));

DROP POLICY IF EXISTS "Users can delete own property images" ON public.property_images;
CREATE POLICY "Users can delete own property images"
ON public.property_images
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_images.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
));

DROP POLICY IF EXISTS "Users can insert own property amenities" ON public.property_amenities;
CREATE POLICY "Users can insert own property amenities"
ON public.property_amenities
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_amenities.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
));

DROP POLICY IF EXISTS "Users can delete own property amenities" ON public.property_amenities;
CREATE POLICY "Users can delete own property amenities"
ON public.property_amenities
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_amenities.property_id
    AND properties.created_by = auth.uid()
    AND properties.status = 'draft'
    AND properties.is_deleted = false
));

-- 3. Listing numbers ------------------------------------------------------------
-- property_public_id comes from a sequence, but a signed-in user could insert or
-- update their own draft with a number the sequence had not reached yet. When the
-- sequence got there, new listings would fail on the unique constraint, so a block
-- of such drafts could stop anyone creating listings.
CREATE OR REPLACE FUNCTION public.guard_property_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.property_public_id IS DISTINCT FROM OLD.property_public_id THEN
      RAISE EXCEPTION 'property_public_id cannot be changed';
    END IF;
  -- The column default has already taken its number from the sequence, so only a
  -- number set by hand can be above the last one the sequence handed out.
  ELSIF NEW.property_public_id > (SELECT last_value FROM public.property_public_id_seq) THEN
    RAISE EXCEPTION 'property_public_id is assigned automatically';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_property_public_id ON public.properties;
CREATE TRIGGER guard_property_public_id
  BEFORE INSERT OR UPDATE OF property_public_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_public_id();
