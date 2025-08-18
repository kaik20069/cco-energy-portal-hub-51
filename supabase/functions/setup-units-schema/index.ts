import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create energy_units table if not exists
    const createUnitsTable = `
      create table if not exists public.energy_units(
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null references public.profiles(id) on delete cascade,
        code text not null,
        nickname text,
        distribuidora text,
        created_at timestamp with time zone default now(),
        unique(user_id, code)
      );
    `

    // Add unit_id column to energy_monthly_metrics if not exists
    const addUnitIdColumn = `
      alter table public.energy_monthly_metrics
        add column if not exists unit_id uuid references public.energy_units(id);
    `

    // Add new demand and reactive fields if not exists
    const addNewFields = `
      alter table public.energy_monthly_metrics
        add column if not exists demanda_faturada_kw_ponta numeric(14,3) default 0,
        add column if not exists demanda_faturada_kw_fora numeric(14,3) default 0,
        add column if not exists demanda_faturada_kw_reservado numeric(14,3) default 0,
        add column if not exists demanda_contratada_kw_ponta numeric(10,2),
        add column if not exists demanda_contratada_kw_fora numeric(10,2),
        add column if not exists demanda_contratada_kw_reservado numeric(10,2),
        add column if not exists preco_kw_ponta numeric(14,6) default 0,
        add column if not exists preco_kw_fora numeric(14,6) default 0,
        add column if not exists preco_kw_reservado numeric(14,6) default 0,
        add column if not exists reativo_kvarh_ponta numeric(14,3) default 0,
        add column if not exists reativo_kvarh_fora numeric(14,3) default 0,
        add column if not exists reativo_kvarh_reservado numeric(14,3) default 0,
        add column if not exists reativo_excedente_kvarh numeric(14,3) default 0,
        add column if not exists preco_kvarh_excedente numeric(14,6) default 0,
        add column if not exists fator_potencia numeric(6,4) default 1.0000;
    `

    // Create RLS policies for energy_units
    const createRLSPolicies = `
      alter table public.energy_units enable row level security;
      
      create policy if not exists eu_sel on public.energy_units 
        for select using (user_id=auth.uid() or public.is_admin(auth.uid()));
      
      create policy if not exists eu_ins on public.energy_units 
        for insert with check (user_id=auth.uid() or public.is_admin(auth.uid()));
      
      create policy if not exists eu_upd on public.energy_units 
        for update using (user_id=auth.uid() or public.is_admin(auth.uid()));
      
      create policy if not exists eu_del on public.energy_units 
        for delete using (user_id=auth.uid() or public.is_admin(auth.uid()));
    `

    // Force PostgREST to reload schema
    const reloadSchema = `
      NOTIFY pgrst, 'reload schema';
    `

    // Execute all SQL commands
    await supabaseClient.rpc('exec', { sql: createUnitsTable })
    await supabaseClient.rpc('exec', { sql: addUnitIdColumn })
    await supabaseClient.rpc('exec', { sql: addNewFields })
    await supabaseClient.rpc('exec', { sql: createRLSPolicies })
    await supabaseClient.rpc('exec', { sql: reloadSchema })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Units schema setup completed successfully' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error setting up units schema:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})