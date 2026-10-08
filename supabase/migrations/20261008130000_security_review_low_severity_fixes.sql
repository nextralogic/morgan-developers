-- Lower-severity fixes from the 2026-10-08 security review.

-- 4. View counting --------------------------------------------------------------
-- log_property_view counted a view for any property id, drafts and removed
-- listings included, and stored whatever user id and user agent the caller
-- passed. Visitors could also insert into property_views directly. Now only
-- published listings are counted, the viewer is whoever is signed in, and the
-- function is the only way in. _user_id stays in the signature so existing
-- clients keep working, but it is ignored.
CREATE OR REPLACE FUNCTION public.log_property_view(
  _property_id uuid,
  _session_id text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = _property_id AND status = 'published' AND is_deleted = false;

  IF FOUND THEN
    INSERT INTO public.property_views (property_id, session_id, user_id, user_agent)
    VALUES (_property_id, left(_session_id, 64), auth.uid(), left(_user_agent, 256));
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Anyone can log a view" ON public.property_views;

-- 5. Uploads --------------------------------------------------------------------
-- The app compresses photos to 200 KB before uploading them (the largest stored
-- file is 204 KB), but the bucket accepted 5 MB files and any signed-in user
-- could upload without limit, enough to fill the free plan's storage. Files are
-- now capped at 1 MB and each user's folder at 50 MB. Admins upload through
-- their own policy and are not capped.
UPDATE storage.buckets SET file_size_limit = 1048576 WHERE id = 'property-images';

DROP POLICY IF EXISTS "Authenticated users can upload to own folder" ON storage.objects;
CREATE POLICY "Authenticated users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    SELECT coalesce(sum((o.metadata->>'size')::bigint), 0)
    FROM storage.objects o
    WHERE o.bucket_id = 'property-images'
      AND o.name LIKE (auth.uid()::text || '/%')
  ) < 50 * 1024 * 1024
);

-- 6. Role checks ----------------------------------------------------------------
-- has_role can be called through the API, and it answered for any user id.
-- Listing owners' ids are public (properties.created_by), so anyone could find
-- out which of them are staff. Every policy passes auth.uid(), so it now only
-- answers for the signed-in caller.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(_user_id = auth.uid(), false) AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'super_admin')
        OR (_role = 'moderator' AND role IN ('admin', 'super_admin'))
        OR (_role = 'buyer' AND role IN ('moderator', 'admin', 'super_admin'))
      )
  )
$$;

-- 7. Audit log ------------------------------------------------------------------
-- Any signed-in user could add audit entries (in their own name) with any action
-- and details. Only moderators and admins change listings, leads and roles, so
-- only they write to it now.
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = performed_by
  AND public.has_role(auth.uid(), 'moderator'::public.app_role)
);
