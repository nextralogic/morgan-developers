-- Fix public lead submission from property detail forms.
-- The client inserts leads without requiring SELECT on leads, and only admin/super_admin
-- should be able to view/manage leads.

-- Keep public lead creation, but scope it explicitly to anon/authenticated roles.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(name)) > 0
  AND char_length(trim(email)) > 2
  AND email ~* '^[^@]+@[^@]+\.[^@]+$'
);

-- Remove moderator access to leads (admin policy already includes super_admin through has_role).
DROP POLICY IF EXISTS "Moderators can view leads" ON public.leads;
DROP POLICY IF EXISTS "Moderators can update leads" ON public.leads;

-- Recreate admin policies explicitly.
DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

CREATE POLICY "Admins can view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
