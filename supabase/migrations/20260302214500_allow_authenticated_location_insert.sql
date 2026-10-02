-- Allow logged-in users to create location records while posting/editing properties.
-- This unblocks non-admin draft creation that currently fails on locations INSERT.

DROP POLICY IF EXISTS "Authenticated users can create locations" ON public.locations;

CREATE POLICY "Authenticated users can create locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (
  char_length(trim(coalesce(province, ''))) > 0
  AND char_length(trim(coalesce(district, ''))) > 0
  AND char_length(trim(coalesce(municipality_or_city, ''))) > 0
);
