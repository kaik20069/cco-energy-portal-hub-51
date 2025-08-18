-- Add reativo_limite_rate column to energy_monthly_metrics table
ALTER TABLE public.energy_monthly_metrics 
ADD COLUMN reativo_limite_rate NUMERIC(5,3) DEFAULT 0.620;