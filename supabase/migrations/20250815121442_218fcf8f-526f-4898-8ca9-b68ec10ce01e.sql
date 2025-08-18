-- Add contracted demand fields to energy_units table
ALTER TABLE public.energy_units
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_ponta     numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_fora      numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_reservado numeric(14,3) DEFAULT 0;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';