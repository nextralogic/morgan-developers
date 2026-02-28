
-- Add FK from audit_logs.performed_by to profiles.id for join support
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES public.profiles(id);
