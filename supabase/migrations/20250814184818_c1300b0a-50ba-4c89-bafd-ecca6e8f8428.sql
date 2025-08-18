-- Habilitar RLS e políticas da tabela de unidades
ALTER TABLE public.energy_units ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para energy_units
CREATE POLICY IF NOT EXISTS eu_select ON public.energy_units
FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS eu_insert ON public.energy_units
FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS eu_update ON public.energy_units
FOR UPDATE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY IF NOT EXISTS eu_delete ON public.energy_units
FOR DELETE USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Garantir unicidade por cliente+codigo
CREATE UNIQUE INDEX IF NOT EXISTS energy_units_user_code_uniq
ON public.energy_units (user_id, code);