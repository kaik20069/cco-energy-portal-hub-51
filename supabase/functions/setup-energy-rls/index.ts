import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create is_admin function if it doesn't exist
    const { error: functionError } = await supabaseClient.rpc('exec_sql', {
      sql: `
        create or replace function public.is_admin(user_id uuid)
        returns boolean
        language sql
        security definer
        as $$
          select exists (
            select 1 
            from public.profiles 
            where id = user_id and type = 'admin'
          );
        $$;
      `
    })

    if (functionError) {
      console.error('Error creating is_admin function:', functionError)
    }

    // Enable RLS
    const { error: rlsError } = await supabaseClient.rpc('exec_sql', {
      sql: `alter table public.energy_monthly_metrics enable row level security;`
    })

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError)
    }

    // Drop existing policies
    const dropPolicies = [
      'drop policy if exists "em_select_policy" on public.energy_monthly_metrics;',
      'drop policy if exists "em_insert_policy" on public.energy_monthly_metrics;', 
      'drop policy if exists "em_update_policy" on public.energy_monthly_metrics;',
      'drop policy if exists "em_delete_policy" on public.energy_monthly_metrics;',
      'drop policy if exists "em_update_admin" on public.energy_monthly_metrics;',
      'drop policy if exists "em_delete_admin" on public.energy_monthly_metrics;',
      'drop policy if exists "energy_select_policy" on public.energy_monthly_metrics;',
      'drop policy if exists "energy_insert_policy" on public.energy_monthly_metrics;',
      'drop policy if exists "energy_update_admin" on public.energy_monthly_metrics;',
      'drop policy if exists "energy_delete_admin" on public.energy_monthly_metrics;'
    ]

    for (const dropSql of dropPolicies) {
      await supabaseClient.rpc('exec_sql', { sql: dropSql })
    }

    // Create new policies
    const policies = [
      // SELECT: Users can see their own records, admins can see all
      `create policy "energy_select_policy" on public.energy_monthly_metrics
        for select using (
          user_id = auth.uid() or public.is_admin(auth.uid())
        );`,
      
      // INSERT: Only admins can insert records
      `create policy "energy_insert_policy" on public.energy_monthly_metrics
        for insert with check (public.is_admin(auth.uid()));`,
      
      // UPDATE: Only admins can update records  
      `create policy "energy_update_admin" on public.energy_monthly_metrics
        for update using (public.is_admin(auth.uid()));`,
      
      // DELETE: Only admins can delete records
      `create policy "energy_delete_admin" on public.energy_monthly_metrics
        for delete using (public.is_admin(auth.uid()));`
    ]

    for (const policy of policies) {
      const { error } = await supabaseClient.rpc('exec_sql', { sql: policy })
      if (error) {
        console.error('Error creating policy:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'RLS policies created successfully for energy_monthly_metrics' 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})