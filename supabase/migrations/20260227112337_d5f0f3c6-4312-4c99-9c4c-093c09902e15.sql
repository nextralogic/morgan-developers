
-- Update has_role for hierarchical role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
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

-- user_roles RLS
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Moderator policies for properties
CREATE POLICY "Moderators can view all properties"
ON public.properties FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update properties"
ON public.properties FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'))
WITH CHECK (has_role(auth.uid(), 'moderator'));

-- Moderator policies for leads
CREATE POLICY "Moderators can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'));

-- Moderator read access to audit_logs
CREATE POLICY "Moderators can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'));

-- Admins/moderators can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'));
