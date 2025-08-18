
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Tratar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    // Validar variáveis de ambiente
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente necessárias não estão configuradas')
    }

    // Criar cliente supabase com a service role key para operações admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Extrair o body da requisição
    const body = await req.json()
    const { action, userId, userData } = body

    // Verificar permissões do solicitante através do token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorização ausente ou inválido')
    }

    const token = authHeader.split(' ')[1]
    const { data: { user: requestUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !requestUser) {
      throw new Error('Falha na autenticação')
    }

    // Verificar se o usuário é admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('type')
      .eq('id', requestUser.id)
      .single()

    if (profileError || !profile || profile.type !== 'admin') {
      throw new Error('Permissão negada: Apenas administradores podem realizar esta ação')
    }

    let result

    // Executar ação baseada no parâmetro action
    switch (action) {
      case 'deleteUser':
        // Excluir o usuário
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteError) throw deleteError
        result = { success: true, message: 'Usuário excluído com sucesso' }
        break

      case 'updateUser':
        // Atualizar dados do usuário
        if (!userData) throw new Error('Dados de usuário não fornecidos')

        // Atualizar dados de autenticação se houver e-mail ou senha
        if (userData.email) {
          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email: userData.email }
          )
          if (updateAuthError) throw updateAuthError
        }

        // Atualizar dados de perfil
        const profileData: Record<string, any> = {}
        if (userData.full_name) profileData.full_name = userData.full_name
        if (userData.phone) profileData.phone = userData.phone
        if (userData.type) profileData.type = userData.type

        // Só atualiza o perfil se houver dados para atualizar
        if (Object.keys(profileData).length > 0) {
          const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update(profileData)
            .eq('id', userId)

          if (updateProfileError) throw updateProfileError
        }

        result = { success: true, message: 'Usuário atualizado com sucesso' }
        break

      default:
        throw new Error('Ação não reconhecida')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
