
-- ============================================================
-- Property workflow RLS updates
-- Buyers can only UPDATE their own DRAFT properties
-- Buyers CANNOT set status to 'published' or 'sold'
-- Admins retain full access
-- ============================================================

-- Drop existing buyer update policy (too permissive)
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;

-- Buyer UPDATE: own properties, only when current status = 'draft'
-- The WITH CHECK ensures they cannot set status to published/sold
CREATE POLICY "Users can update own draft properties"
ON public.properties
FOR UPDATE
USING (
  auth.uid() = created_by
  AND status = 'draft'::property_status
)
WITH CHECK (
  auth.uid() = created_by
  AND status = 'draft'::property_status
);

-- Drop and recreate INSERT policy to enforce draft-only creation
DROP POLICY IF EXISTS "Users can create own properties" ON public.properties;

CREATE POLICY "Users can create own draft properties"
ON public.properties
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND status = 'draft'::property_status
);
