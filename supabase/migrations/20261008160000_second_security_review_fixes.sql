-- Fixes from the second security review on 2026-10-08.

-- 1. Photos of approved listings ------------------------------------------------
-- Owners can't change the photo rows of a listing once it is approved, but they
-- could still change the pictures those rows show: delete a file and upload a new
-- one under the same name, overwrite it in place, upload a thumbnail that was
-- missing, or (through the API) point a photo at an image on their own server and
-- change it there. Each of these put unreviewed images on a live listing.

-- Where listing photos are served from. Change this if the project moves.
CREATE OR REPLACE FUNCTION public.listing_photos_base_url()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'https://gksaovhgxlxvogxsejkj.supabase.co/storage/v1/object/public/property-images/'::text
$$;

-- True when a file in the property-images bucket is a photo, or a photo's
-- thumbnail, of a listing its owner can no longer edit: anything but an active
-- draft. Runs as the table owner so it also sees listings the caller can't, such
-- as archived ones.
CREATE OR REPLACE FUNCTION public.listing_photo_locked(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_images pi
    JOIN public.properties p ON p.id = pi.property_id
    CROSS JOIN LATERAL (
      SELECT split_part(pi.image_url, '/storage/v1/object/public/property-images/', 2) AS path
    ) f
    WHERE NOT (p.status = 'draft' AND p.is_deleted = false)
      AND f.path <> ''
      AND _name IN (f.path, regexp_replace(f.path, '\.[a-z0-9]+$', '', 'i') || '-thumb.webp')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.listing_photo_locked(text) FROM PUBLIC, anon;

-- Uploads also stop at 500 files per user (see section 3).
DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT public.listing_photo_locked(name)
  AND (
    SELECT coalesce(sum((o.metadata->>'size')::bigint), 0) < 50 * 1024 * 1024 AND count(*) < 500
    FROM storage.objects o
    WHERE o.bucket_id = 'property-images'
      AND o.name LIKE (auth.uid()::text || '/%')
  )
);

DROP POLICY IF EXISTS "Users can delete own storage images" ON storage.objects;
CREATE POLICY "Users can delete own storage images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND NOT public.listing_photo_locked(name)
);

-- The app never overwrites or renames a photo file, and either would change the
-- picture on a live listing.
DROP POLICY IF EXISTS "Users can update own storage images" ON storage.objects;

-- Owners may only add photos that are files in this project's bucket, and the
-- file name can't contain anything that would make the address point elsewhere.
DROP POLICY IF EXISTS "Users can insert own property images" ON public.property_images;
CREATE POLICY "Users can insert own property images"
ON public.property_images
FOR INSERT
TO authenticated
WITH CHECK (
  starts_with(image_url, public.listing_photos_base_url())
  AND substr(image_url, char_length(public.listing_photos_base_url()) + 1)
      ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]*$'
  AND EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_images.property_id
      AND properties.created_by = auth.uid()
      AND properties.status = 'draft'
      AND properties.is_deleted = false
  )
);

-- The app replaces photo rows rather than editing them, and an edit could swap in
-- an address the insert rule above refuses.
DROP POLICY IF EXISTS "Users can update own property images" ON public.property_images;

-- 2. Listing dates and view counts ----------------------------------------------
-- Owners could create or edit a draft with any created_at or view_count. Once the
-- listing was approved, a date in the future kept it first in the latest
-- listings, and a made-up count put it in "Most viewed" on the home page.
CREATE OR REPLACE FUNCTION public.guard_property_server_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- API requests run as anon or authenticated. log_property_view runs as the
  -- table owner, so it can still count views.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.view_count := 0;
      NEW.created_at := now();
      NEW.updated_at := now();
    ELSE
      NEW.view_count := OLD.view_count;
      NEW.created_at := OLD.created_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_property_server_fields ON public.properties;
CREATE TRIGGER guard_property_server_fields
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_server_fields();

-- 3. Size limits ----------------------------------------------------------------
-- Any signed-up user could fill the free plan's 500 MB database, which then turns
-- read-only, with very long or very many drafts, photo rows or locations. The
-- limits are far above what the forms need.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_title_length CHECK (char_length(title) <= 200),
  ADD CONSTRAINT properties_description_length CHECK (char_length(description) <= 10000),
  ADD CONSTRAINT properties_area_unit_length CHECK (char_length(area_unit) <= 20),
  ADD CONSTRAINT properties_price_size CHECK (price < 1e13 AND scale(price) <= 30),
  ADD CONSTRAINT properties_area_value_size CHECK (area_value < 1e12 AND scale(area_value) <= 30),
  ADD CONSTRAINT properties_area_sqft_size CHECK (area_sqft < 1e15 AND scale(area_sqft) <= 30);

ALTER TABLE public.property_images
  ADD CONSTRAINT property_images_image_url_length CHECK (char_length(image_url) <= 2048);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_full_name_length CHECK (char_length(full_name) <= 200),
  ADD CONSTRAINT profiles_phone_length CHECK (char_length(phone) <= 40),
  ADD CONSTRAINT profiles_avatar_url_length CHECK (char_length(avatar_url) <= 2048);

-- A longer name from a sign-up is shortened rather than blocking the sign-up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, left(NEW.raw_user_meta_data ->> 'full_name', 200));
  RETURN NEW;
END;
$$;

-- Only admins save locations (owners' drafts don't), and admins have their own
-- policy, so this one only let anyone add rows.
DROP POLICY IF EXISTS "Authenticated users can create locations" ON public.locations;

-- Drafts per owner and photo rows per listing. The checks run once per statement,
-- so one request inserting many rows is counted too. Staff are not limited.
CREATE OR REPLACE FUNCTION public.limit_owner_drafts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'moderator')
     AND EXISTS (
       SELECT 1 FROM public.properties p
       WHERE p.created_by IN (SELECT created_by FROM new_rows) AND p.status = 'draft'
       GROUP BY p.created_by
       HAVING count(*) > 50
     ) THEN
    RAISE EXCEPTION 'An owner can have at most 50 draft listings';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS limit_owner_drafts ON public.properties;
CREATE TRIGGER limit_owner_drafts
  AFTER INSERT ON public.properties
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.limit_owner_drafts();

-- 100 rows, so a listing with up to 50 photos can still be edited: an edit saves
-- the new rows before it removes the old ones.
CREATE OR REPLACE FUNCTION public.limit_listing_photos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'moderator')
     AND EXISTS (
       SELECT 1 FROM public.property_images pi
       WHERE pi.property_id IN (SELECT property_id FROM new_rows)
       GROUP BY pi.property_id
       HAVING count(*) > 100
     ) THEN
    RAISE EXCEPTION 'A listing can have at most 100 photo rows';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS limit_listing_photos ON public.property_images;
CREATE TRIGGER limit_listing_photos
  AFTER INSERT ON public.property_images
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.limit_listing_photos();
