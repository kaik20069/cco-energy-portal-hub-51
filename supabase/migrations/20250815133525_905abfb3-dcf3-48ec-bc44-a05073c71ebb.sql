-- Add demanda contratada columns to energy_monthly_metrics
ALTER TABLE public.energy_monthly_metrics
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_ponta numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_fora numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw_reservado numeric(10,2) DEFAULT 0;