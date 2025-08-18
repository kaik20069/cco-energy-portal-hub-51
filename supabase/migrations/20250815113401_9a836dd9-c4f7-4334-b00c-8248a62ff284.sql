-- remover constraints/índices antigos que travam por usuário+mês
ALTER TABLE public.energy_monthly_metrics
  DROP CONSTRAINT IF EXISTS energy_monthly_metrics_user_month_unique,
  DROP CONSTRAINT IF EXISTS energy_monthly_metrics_user_reference_label_key;

DROP INDEX IF EXISTS emm_user_ref_unique;
DROP INDEX IF EXISTS energy_monthly_metrics_user_reference_label_key;

-- criar a unicidade correta (usuário + mês + unidade)
ALTER TABLE public.energy_monthly_metrics
  ADD CONSTRAINT emm_user_ref_unit_unique
  UNIQUE (user_id, reference_label, unit_id);

-- garantir índice para consultas por unit_id (se ainda não houver)
CREATE INDEX IF NOT EXISTS emm_unit_idx
  ON public.energy_monthly_metrics(unit_id);

-- recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';