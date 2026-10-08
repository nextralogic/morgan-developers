-- Enquiries now go through the submit-lead edge function, which checks a
-- Cloudflare Turnstile CAPTCHA before saving them. The public insert policy
-- would let a script skip that check by writing to the table directly, so it
-- goes. The function saves with the service key, which bypasses row level
-- security, so the length limits move onto the table itself.
--
-- Apply this only once the site that calls submit-lead is live: older pages
-- insert into leads directly and fail after this.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT leads_email_length CHECK (char_length(email) <= 254),
  ADD CONSTRAINT leads_phone_length CHECK (char_length(phone) <= 40),
  ADD CONSTRAINT leads_message_length CHECK (char_length(message) <= 5000),
  ADD CONSTRAINT leads_budget_range_length CHECK (char_length(budget_range) <= 100),
  ADD CONSTRAINT leads_preferred_contact_time_length CHECK (char_length(preferred_contact_time) <= 50);
