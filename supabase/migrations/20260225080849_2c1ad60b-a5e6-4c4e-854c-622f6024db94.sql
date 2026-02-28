
-- 1) Create lead_status enum
CREATE TYPE public.lead_status AS ENUM ('new', 'in_progress', 'contacted', 'closed', 'archived');

-- 2) Add new columns to leads
ALTER TABLE public.leads
  ADD COLUMN status public.lead_status NOT NULL DEFAULT 'new',
  ADD COLUMN notes text,
  ADD COLUMN handled_by uuid,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- 3) Backfill existing rows (already default 'new', but be explicit)
UPDATE public.leads SET status = 'new' WHERE status IS NULL;

-- 4) Indexes
CREATE INDEX idx_leads_status_created ON public.leads (status, created_at DESC);
CREATE INDEX idx_leads_property_id ON public.leads (property_id);

-- 5) Trigger to auto-update updated_at on leads
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
