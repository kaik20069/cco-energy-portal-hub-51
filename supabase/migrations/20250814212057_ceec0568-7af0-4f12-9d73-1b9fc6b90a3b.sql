-- 1.1 Campo novo na Unidade
ALTER TABLE public.energy_units
  ADD COLUMN IF NOT EXISTS fornecedora_energia text;

-- 1.2 Índice único por (user_id, reference_label, unit_id) para permitir mesmo mês em UCs diferentes
-- (tenta remover índices antigos só por user_id+reference_label; são "inofensivos" se não existirem)
DROP INDEX IF EXISTS emm_user_ref_unique;
DROP INDEX IF EXISTS energy_monthly_metrics_user_reference_label_key;
CREATE UNIQUE INDEX IF NOT EXISTS emm_user_ref_unit_uniq
  ON public.energy_monthly_metrics(user_id, reference_label, unit_id);

-- 1.3 Opcional: índices auxiliares para filtros
CREATE INDEX IF NOT EXISTS eu_user_idx ON public.energy_units(user_id);
CREATE INDEX IF NOT EXISTS eu_fornec_idx ON public.energy_units(user_id, fornecedora_energia);
CREATE INDEX IF NOT EXISTS eu_distrib_idx ON public.energy_units(user_id, distribuidora);

-- 1.4 Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';