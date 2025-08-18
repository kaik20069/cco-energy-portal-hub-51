-- Create table for monthly energy metrics
create table if not exists public.energy_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  cod_instal text,
  n_relatorio text,
  reference_label text not null,
  distribuidora text,
  fatura_geral_rs numeric(14,2),
  bandeiras_rs numeric(14,2),
  fatura_livre_rs numeric(14,2),
  proinfa_rs numeric(14,2),
  mwh_total_gerador numeric(14,3),
  tarifa_energia_rs_mwh numeric(14,2),
  compra_energia_rs numeric(14,2),
  icms_energia_rs numeric(14,2),
  encargos_rs numeric(14,2),
  banco_trianon_rs numeric(14,2),
  gestao_cco_rs numeric(14,2),
  gestao_parceiro_rs numeric(14,2),
  economia_liquida_rs numeric(14,2),
  economia_liquida_pct numeric(8,5),
  desconto_fonte numeric(8,5) not null default 0,
  pis_rate numeric(8,5) not null default 0,
  cofins_rate numeric(8,5) not null default 0,
  icms_rate numeric(8,5) not null default 0,
  rdb_rate numeric(8,5) not null default 0,
  created_at timestamptz default now()
);

-- Uniqueness per customer + month label
alter table public.energy_monthly_metrics
  add constraint energy_monthly_metrics_user_month_unique unique (user_id, reference_label);

-- Enable RLS
alter table public.energy_monthly_metrics enable row level security;

-- Admin policy
create policy if not exists "Admins podem gerenciar todas as métricas"
  on public.energy_monthly_metrics
  for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Owner policies
create policy if not exists "Usuários podem ver seus próprios registros de energia"
  on public.energy_monthly_metrics
  for select
  using (auth.uid() = user_id);

create policy if not exists "Usuários podem inserir seus próprios registros de energia"
  on public.energy_monthly_metrics
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "Usuários podem atualizar seus próprios registros de energia"
  on public.energy_monthly_metrics
  for update
  using (auth.uid() = user_id);

create policy if not exists "Usuários podem deletar seus próprios registros de energia"
  on public.energy_monthly_metrics
  for delete
  using (auth.uid() = user_id);
