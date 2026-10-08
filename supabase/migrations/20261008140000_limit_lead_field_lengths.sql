-- Public lead submissions had no size limits, so anyone could file enquiries
-- megabytes long without signing in, filling the free plan's database and
-- sending huge notification emails. These limits are far above anything the
-- enquiry form needs, and the form enforces the same ones.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(trim(name)) > 0
  AND char_length(name) <= 200
  AND char_length(trim(email)) > 2
  AND char_length(email) <= 254
  AND email ~* '^[^@]+@[^@]+\.[^@]+$'
  AND coalesce(char_length(phone), 0) <= 40
  AND coalesce(char_length(message), 0) <= 5000
  AND coalesce(char_length(budget_range), 0) <= 100
  AND coalesce(char_length(preferred_contact_time), 0) <= 50
  AND status = 'new'
  AND notes IS NULL
  AND handled_by IS NULL
  AND notified_at IS NULL
);
