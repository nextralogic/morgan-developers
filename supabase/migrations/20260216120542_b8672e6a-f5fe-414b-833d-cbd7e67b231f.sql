
-- ============================================================
-- BACKEND HARDENING & COST OPTIMIZATION (retry without trigger)
-- ============================================================

-- 1. INDEXES for fast filtered/sorted queries on free tier
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties (status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties (type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties (price);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties (created_by);
CREATE INDEX IF NOT EXISTS idx_properties_location_id ON public.properties (location_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_status_created ON public.properties (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images (property_id);
CREATE INDEX IF NOT EXISTS idx_property_amenities_property_id ON public.property_amenities (property_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON public.locations (parent_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- 2. CONSTRAINTS for data integrity
ALTER TABLE public.properties ADD CONSTRAINT chk_properties_price_non_negative CHECK (price >= 0);
ALTER TABLE public.properties ADD CONSTRAINT chk_properties_area_positive CHECK (area_sqft IS NULL OR area_sqft > 0);
ALTER TABLE public.property_images ADD CONSTRAINT chk_images_display_order_non_negative CHECK (display_order >= 0);

-- 3. STORAGE HARDENING - 5MB limit, image-only MIME types
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'property-images';

-- Replace overly permissive upload policy with folder-scoped one
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;

CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own storage images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own storage images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. FIX LEADS INSERT POLICY - require valid name + email
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

CREATE POLICY "Anyone can submit a lead"
ON public.leads FOR INSERT
WITH CHECK (
  char_length(trim(name)) > 0
  AND char_length(trim(email)) > 2
  AND email ~* '^[^@]+@[^@]+\.[^@]+$'
);
