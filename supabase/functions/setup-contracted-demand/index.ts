import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Add contracted demand columns to energy_monthly_metrics if not exists
    const addContractedDemandFields = `
      alter table public.energy_monthly_metrics
        add column if not exists demanda_contratada_kw_ponta numeric(10,2) default 0,
        add column if not exists demanda_contratada_kw_fora numeric(10,2) default 0,
        add column if not exists demanda_contratada_kw_reservado numeric(10,2) default 0;
    `

    // Force PostgREST to reload schema
    const reloadSchema = `
      NOTIFY pgrst, 'reload schema';
    `

    // Execute SQL commands
    await supabaseClient.rpc('exec', { sql: addContractedDemandFields })
    await supabaseClient.rpc('exec', { sql: reloadSchema })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contracted demand fields added successfully to energy_monthly_metrics' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error adding contracted demand fields:', error)
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