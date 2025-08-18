-- Adicionar colunas relacionadas ao reativo na tabela energy_monthly_metrics
ALTER TABLE public.energy_monthly_metrics
  ADD COLUMN IF NOT EXISTS reativo_kvarh_ponta       numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_kvarh_fora        numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_kvarh_reservado   numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_limite_rate       numeric(5,3)  DEFAULT 0.620,
  ADD COLUMN IF NOT EXISTS reativo_excedente_kvarh   numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kvarh_excedente     numeric(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fator_potencia            numeric(6,4)  DEFAULT 1.0000;

-- Adicionar colunas de preços dos períodos reativo (para completude)
ALTER TABLE public.energy_monthly_metrics
  ADD COLUMN IF NOT EXISTS preco_kvarh_ponta         numeric(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kvarh_fora          numeric(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kvarh_reservado     numeric(12,6) DEFAULT 0;