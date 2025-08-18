
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Configurações de CORS para permitir chamadas do frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Lidar com requisições preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Pegando as variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas.')
    }
    
    // Criando o cliente Supabase com a service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Extraindo dados do corpo da requisição
    const { email, password, fullName } = await req.json()
    
    // Verificando se todos os campos necessários foram fornecidos
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Todos os campos são obrigatórios" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      )
    }
    
    console.log(`Criando usuário com email: ${email}`)
    
    // Criando usuário usando o endpoint de Admin
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: fullName,
      }
    })
    
    if (error) {
      console.error("Erro ao criar usuário:", error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      )
    }
    
    console.log("Usuário criado com sucesso:", data.user.id)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: data.user 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )
  } catch (error) {
    console.error("Erro interno:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    )
  }
})
