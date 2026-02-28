
-- Add new enum values (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator' AFTER 'admin';
