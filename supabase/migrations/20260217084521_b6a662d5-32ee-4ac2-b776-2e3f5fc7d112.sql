-- Allow owners to delete their own properties
CREATE POLICY "Users can delete own properties"
ON public.properties
FOR DELETE
USING (auth.uid() = created_by);

-- Allow owners to delete their own property images (cascade cleanup)
-- (Admin already has ALL policy)
