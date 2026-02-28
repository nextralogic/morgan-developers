
-- ============================================================
-- property_views: tracks individual property page views
-- ============================================================
CREATE TABLE public.property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  user_id uuid,
  user_agent text,
  ip_hash text
);

-- Indexes for efficient aggregation
CREATE INDEX idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX idx_property_views_property_viewed ON public.property_views(property_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT a view (anonymous or authenticated)
CREATE POLICY "Anyone can log a view"
  ON public.property_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read views (for analytics)
CREATE POLICY "Admins can read views"
  ON public.property_views
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add view_count column to properties for fast reads (Option B)
ALTER TABLE public.properties ADD COLUMN view_count bigint NOT NULL DEFAULT 0;

-- RPC to atomically increment view count + insert view record
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
  -- Insert the view record
  INSERT INTO public.property_views (property_id, session_id, user_id, user_agent)
  VALUES (_property_id, _session_id, _user_id, _user_agent);

  -- Increment the cached count on properties
  UPDATE public.properties
  SET view_count = view_count + 1
  WHERE id = _property_id;
END;
$$;

-- Index on properties.view_count for "most viewed" queries
CREATE INDEX idx_properties_view_count ON public.properties(view_count DESC);
