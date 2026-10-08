-- Fixes from the third security review pass on 2026-10-08.

-- 1. Listing the photo bucket ---------------------------------------------------
-- Anyone with the public key could list every file in property-images, which
-- shows the photos of drafts and archived listings and every uploader's user id.
-- The bucket is public, so photo links keep working without this policy; owners
-- now see only their own folder, and admins see everything.
DROP POLICY IF EXISTS "Public can view property images" ON storage.objects;

CREATE POLICY "Users can view own storage images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view property images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));

-- 2. Photo rows of listings that aren't live ------------------------------------
-- Every photo row was readable, including those of drafts and archived listings.
-- A row is now visible to whoever can see its listing.
DROP POLICY IF EXISTS "Public can view property images" ON public.property_images;

CREATE POLICY "Photos are visible with their listing"
ON public.property_images
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.properties
  WHERE properties.id = property_images.property_id
));
