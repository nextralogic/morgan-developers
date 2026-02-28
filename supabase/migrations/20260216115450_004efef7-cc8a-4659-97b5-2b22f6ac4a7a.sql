
-- Allow authenticated users to insert their own properties
CREATE POLICY "Users can create own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to update their own properties
CREATE POLICY "Users can update own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Allow authenticated users to view their own draft/sold properties
CREATE POLICY "Users can view own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Allow authenticated users to manage images on their own properties
CREATE POLICY "Users can insert own property images"
ON public.property_images
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can update own property images"
ON public.property_images
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete own property images"
ON public.property_images
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_id AND created_by = auth.uid()
  )
);

-- Allow authenticated users to manage amenities on their own properties
CREATE POLICY "Users can insert own property amenities"
ON public.property_amenities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete own property amenities"
ON public.property_amenities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = property_id AND created_by = auth.uid()
  )
);

-- Allow authenticated users to upload to property-images bucket
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');
