-- 1) Extensão para UUID (se faltar)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Tabela de unidades (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.energy_units(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  nickname text,
  distribuidora text,
  UNIQUE (user_id, code)
);

-- 3) Colunas que faltam em energy_monthly_metrics
ALTER TABLE public.energy_monthly_metrics
  ADD COLUMN IF NOT EXISTS demanda_faturada_kw_ponta      numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_faturada_kw_fora       numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demanda_faturada_kw_reservado  numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kw_ponta                  numeric(14,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kw_fora                   numeric(14,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kw_reservado              numeric(14,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_kvarh_ponta             numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_kvarh_fora              numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_kvarh_reservado         numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reativo_excedente_kvarh         numeric(14,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kvarh_excedente           numeric(14,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fator_potencia                  numeric(6,4)  DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS unit_id                         uuid REFERENCES public.energy_units(id);

-- 4) RLS para units
ALTER TABLE public.energy_units ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas já existem antes de criar
DO $$
BEGIN
    -- Política de SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'energy_units' 
        AND policyname = 'eu_select'
    ) THEN
        CREATE POLICY eu_select ON public.energy_units
          FOR SELECT USING ( user_id = auth.uid() OR public.is_admin(auth.uid()) );
    END IF;

    -- Política de INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'energy_units' 
        AND policyname = 'eu_insert'
    ) THEN
        CREATE POLICY eu_insert ON public.energy_units
          FOR INSERT WITH CHECK ( user_id = auth.uid() OR public.is_admin(auth.uid()) );
    END IF;

    -- Política de UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'energy_units' 
        AND policyname = 'eu_update'
    ) THEN
        CREATE POLICY eu_update ON public.energy_units
          FOR UPDATE USING ( user_id = auth.uid() OR public.is_admin(auth.uid()) );
    END IF;

    -- Política de DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'energy_units' 
        AND policyname = 'eu_delete'
    ) THEN
        CREATE POLICY eu_delete ON public.energy_units
          FOR DELETE USING ( user_id = auth.uid() OR public.is_admin(auth.uid()) );
    END IF;
END
$$;

-- 5) Forçar o PostgREST a recarregar o schema (evita erro de "schema cache")
NOTIFY pgrst, 'reload schema';