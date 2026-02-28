
-- =====================================================================
-- Soft Delete: add is_deleted flag to properties
-- =====================================================================

-- 1. Add column (default false for all existing rows)
ALTER TABLE public.properties
  ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;

-- 2. Composite index for public queries (status + is_deleted)
CREATE INDEX idx_properties_status_not_deleted
  ON public.properties (status, is_deleted)
  WHERE is_deleted = false;

-- 3. Update RLS policies to include is_deleted
-- Public: only see published AND not deleted
DROP POLICY IF EXISTS "Public can view published properties" ON public.properties;
CREATE POLICY "Public can view published properties"
  ON public.properties FOR SELECT
  USING (status = 'published'::property_status AND is_deleted = false);

-- Buyers: can only see their own non-deleted properties
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT TO authenticated
  USING (auth.uid() = created_by AND is_deleted = false);

-- Buyers: can only update own draft non-deleted properties
DROP POLICY IF EXISTS "Users can update own draft properties" ON public.properties;
CREATE POLICY "Users can update own draft properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND status = 'draft'::property_status AND is_deleted = false)
  WITH CHECK (auth.uid() = created_by AND status = 'draft'::property_status AND is_deleted = false);

-- Buyers: can only delete own non-deleted properties
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE TO authenticated
  USING (auth.uid() = created_by AND is_deleted = false);

-- Admin policy stays unchanged (has_role check, full access including deleted)
-- No change needed for "Admins can do everything with properties"
-- No change needed for "Users can create own draft properties"
