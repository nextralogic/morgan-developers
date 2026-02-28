-- =============================================================
-- FULL SCHEMA SNAPSHOT — Morgan Developers Real Estate Platform
-- =============================================================
-- This migration reproduces the entire public schema from scratch.
--
-- USAGE (fresh Supabase project):
--   1. Copy this file to supabase/migrations/00000000000000_full_schema_snapshot.sql
--   2. Remove all other migration files from supabase/migrations/
--   3. Run: supabase db push
--
-- Alternatively, run directly via psql or the SQL Editor.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────────────

CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'buyer');
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'sold');
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'land');
CREATE TYPE public.lead_source AS ENUM ('website', 'referral');
CREATE TYPE public.lead_status AS ENUM ('new', 'in_progress', 'contacted', 'closed', 'archived');

-- ─────────────────────────────────────────────────────────────
-- 2. SEQUENCES
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.property_public_id_seq
  START WITH 1001
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ─────────────────────────────────────────────────────────────
-- 3. TABLES
-- ─────────────────────────────────────────────────────────────

-- profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- locations
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  parent_id uuid REFERENCES public.locations(id),
  province text,
  district text,
  municipality_or_city text,
  ward integer,
  area_name text,
  display_name text,
  search_key text
);

-- properties
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  type public.property_type NOT NULL DEFAULT 'house',
  status public.property_status NOT NULL DEFAULT 'draft',
  location_id uuid REFERENCES public.locations(id),
  created_by uuid,
  area_sqft numeric,
  area_unit text DEFAULT 'sq_feet',
  area_value numeric,
  is_deleted boolean NOT NULL DEFAULT false,
  view_count bigint NOT NULL DEFAULT 0,
  property_public_id integer NOT NULL DEFAULT nextval('public.property_public_id_seq') UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- property_images
CREATE TABLE public.property_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

-- amenities
CREATE TABLE public.amenities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text
);

-- property_amenities (junction)
CREATE TABLE public.property_amenities (
  property_id uuid NOT NULL REFERENCES public.properties(id),
  amenity_id uuid NOT NULL REFERENCES public.amenities(id),
  PRIMARY KEY (property_id, amenity_id)
);

-- leads
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text,
  property_id uuid REFERENCES public.properties(id),
  budget_range text,
  preferred_contact_time text,
  source public.lead_source NOT NULL DEFAULT 'website',
  status public.lead_status NOT NULL DEFAULT 'new',
  notes text,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- property_views
CREATE TABLE public.property_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  session_id text,
  user_id uuid,
  user_agent text,
  ip_hash text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NOT NULL REFERENCES public.profiles(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- ─────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ─────────────────────────────────────────────────────────────

-- audit_logs
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs USING btree (performed_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs USING btree (performed_by);

-- leads
CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at DESC);
CREATE INDEX idx_leads_property_id ON public.leads USING btree (property_id);
CREATE INDEX idx_leads_status_created ON public.leads USING btree (status, created_at DESC);

-- locations
CREATE INDEX idx_locations_address ON public.locations USING btree (province, district, municipality_or_city);
CREATE INDEX idx_locations_display_name ON public.locations USING btree (display_name);
CREATE INDEX idx_locations_district ON public.locations USING btree (district);
CREATE INDEX idx_locations_municipality ON public.locations USING btree (municipality_or_city);
CREATE INDEX idx_locations_parent_id ON public.locations USING btree (parent_id);
CREATE INDEX idx_locations_province ON public.locations USING btree (province);
CREATE INDEX idx_locations_search_key ON public.locations USING btree (search_key);
CREATE UNIQUE INDEX locations_address_unique ON public.locations USING btree (
  COALESCE(province, ''),
  COALESCE(district, ''),
  COALESCE(municipality_or_city, ''),
  COALESCE(ward, 0),
  COALESCE(area_name, '')
);

-- properties
CREATE INDEX idx_properties_created_at ON public.properties USING btree (created_at DESC);
CREATE INDEX idx_properties_created_by ON public.properties USING btree (created_by);
CREATE INDEX idx_properties_location_id ON public.properties USING btree (location_id);
CREATE INDEX idx_properties_price ON public.properties USING btree (price);
CREATE INDEX idx_properties_property_public_id ON public.properties USING btree (property_public_id);
CREATE INDEX idx_properties_status ON public.properties USING btree (status);
CREATE INDEX idx_properties_status_area ON public.properties USING btree (status, area_sqft);
CREATE INDEX idx_properties_status_created ON public.properties USING btree (status, created_at DESC);
CREATE INDEX idx_properties_status_location ON public.properties USING btree (status, location_id, created_at DESC);
CREATE INDEX idx_properties_status_not_deleted ON public.properties USING btree (status, is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_properties_status_price ON public.properties USING btree (status, price);
CREATE INDEX idx_properties_status_type ON public.properties USING btree (status, type);
CREATE INDEX idx_properties_type ON public.properties USING btree (type);
CREATE INDEX idx_properties_view_count ON public.properties USING btree (view_count DESC);

-- property_amenities
CREATE INDEX idx_property_amenities_property_id ON public.property_amenities USING btree (property_id);

-- property_images
CREATE INDEX idx_property_images_property_id ON public.property_images USING btree (property_id);

-- property_views
CREATE INDEX idx_property_views_property_id ON public.property_views USING btree (property_id);
CREATE INDEX idx_property_views_property_viewed ON public.property_views USING btree (property_id, viewed_at DESC);

-- user_roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Hierarchical role check (super_admin ⊇ admin ⊇ moderator ⊇ buyer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Area validation trigger function
CREATE OR REPLACE FUNCTION public.validate_area_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.area_value IS NOT NULL AND NEW.area_value < 0 THEN
    RAISE EXCEPTION 'area_value must be >= 0';
  END IF;
  IF NEW.area_sqft IS NOT NULL AND NEW.area_sqft < 0 THEN
    RAISE EXCEPTION 'area_sqft must be >= 0';
  END IF;
  RETURN NEW;
END;
$$;

-- Log a property view (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_property_view(
  _property_id uuid,
  _session_id text DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.property_views (property_id, session_id, user_id, user_agent)
  VALUES (_property_id, _session_id, _user_id, _user_agent);

  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = _property_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Auto-create profile on auth.users INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on properties
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Validate area values on properties
CREATE TRIGGER validate_property_area
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_area_values();

-- Auto-update updated_at on leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- === profiles ===
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'moderator'));

-- === user_roles ===
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- === properties ===
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published properties"
  ON public.properties FOR SELECT
  USING (status = 'published' AND is_deleted = false);

CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT
  USING (auth.uid() = created_by AND is_deleted = false);

CREATE POLICY "Users can create own draft properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = created_by AND status = 'draft');

CREATE POLICY "Users can update own draft properties"
  ON public.properties FOR UPDATE
  USING (auth.uid() = created_by AND status = 'draft' AND is_deleted = false)
  WITH CHECK (auth.uid() = created_by AND status = 'draft' AND is_deleted = false);

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE
  USING (auth.uid() = created_by AND is_deleted = false);

CREATE POLICY "Moderators can view all properties"
  ON public.properties FOR SELECT
  USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update properties"
  ON public.properties FOR UPDATE
  USING (has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can do everything with properties"
  ON public.properties FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- === property_images ===
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view property images"
  ON public.property_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage property images"
  ON public.property_images FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own property images"
  ON public.property_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_images.property_id
      AND properties.created_by = auth.uid()
  ));

CREATE POLICY "Users can update own property images"
  ON public.property_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_images.property_id
      AND properties.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete own property images"
  ON public.property_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_images.property_id
      AND properties.created_by = auth.uid()
  ));

-- === amenities ===
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are publicly readable"
  ON public.amenities FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage amenities"
  ON public.amenities FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- === property_amenities ===
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property amenities are publicly readable"
  ON public.property_amenities FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage property amenities"
  ON public.property_amenities FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own property amenities"
  ON public.property_amenities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_amenities.property_id
      AND properties.created_by = auth.uid()
  ));

CREATE POLICY "Users can delete own property amenities"
  ON public.property_amenities FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = property_amenities.property_id
      AND properties.created_by = auth.uid()
  ));

-- === leads ===
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT
  WITH CHECK (
    char_length(TRIM(BOTH FROM name)) > 0
    AND char_length(TRIM(BOTH FROM email)) > 2
    AND email ~* '^[^@]+@[^@]+\.[^@]+$'
  );

CREATE POLICY "Admins can view leads"
  ON public.leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads"
  ON public.leads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view leads"
  ON public.leads FOR SELECT
  USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can update leads"
  ON public.leads FOR UPDATE
  USING (has_role(auth.uid(), 'moderator'));

-- === property_views ===
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a view"
  ON public.property_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read views"
  ON public.property_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- === audit_logs ===
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (has_role(auth.uid(), 'moderator'));

-- ─────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET & POLICIES
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Admins can upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update property images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete property images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own storage images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own storage images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND (storage.foldername(name))[1] = auth.uid()::text);
