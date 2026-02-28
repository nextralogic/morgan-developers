
-- Create a sequence for property public IDs starting at 1001
CREATE SEQUENCE IF NOT EXISTS public.property_public_id_seq START WITH 1001;

-- Add property_public_id column with default from sequence
ALTER TABLE public.properties
  ADD COLUMN property_public_id integer NOT NULL DEFAULT nextval('public.property_public_id_seq');

-- Backfill any existing rows that might have default values (they already get filled by DEFAULT)
-- Add unique constraint
ALTER TABLE public.properties
  ADD CONSTRAINT properties_property_public_id_key UNIQUE (property_public_id);

-- Create index for fast lookups
CREATE INDEX idx_properties_property_public_id ON public.properties (property_public_id);
