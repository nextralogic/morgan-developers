
-- 1. Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'buyer');
CREATE TYPE public.property_type AS ENUM ('apartment', 'house', 'land');
CREATE TYPE public.property_status AS ENUM ('draft', 'published', 'sold');
CREATE TYPE public.lead_source AS ENUM ('website', 'referral');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Locations table (hierarchical)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.locations(id) ON DELETE SET NULL
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations are publicly readable" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  type property_type NOT NULL DEFAULT 'house',
  status property_status NOT NULL DEFAULT 'draft',
  description TEXT,
  area_sqft NUMERIC,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published properties" ON public.properties FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can do everything with properties" ON public.properties FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Property images
CREATE TABLE public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view property images" ON public.property_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage property images" ON public.property_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 7. Amenities
CREATE TABLE public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT
);
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are publicly readable" ON public.amenities FOR SELECT USING (true);
CREATE POLICY "Admins can manage amenities" ON public.amenities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 8. Property amenities junction
CREATE TABLE public.property_amenities (
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (property_id, amenity_id)
);
ALTER TABLE public.property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property amenities are publicly readable" ON public.property_amenities FOR SELECT USING (true);
CREATE POLICY "Admins can manage property amenities" ON public.property_amenities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 9. Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  budget_range TEXT,
  preferred_contact_time TEXT,
  source lead_source NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 10. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

CREATE POLICY "Public can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Admins can upload property images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update property images" ON storage.objects FOR UPDATE USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete property images" ON storage.objects FOR DELETE USING (bucket_id = 'property-images' AND public.has_role(auth.uid(), 'admin'));
