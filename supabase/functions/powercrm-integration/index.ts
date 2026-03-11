import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge Function para integração com PowerCRM
 * Recebe o ID do lead e envia para o PowerCRM para gerar o link de checkout
 */
Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { leadId } = await req.json()

        if (!leadId) {
            throw new Error('ID do lead não fornecido')
        }

        // 1. Buscar os dados do lead no banco
        const { data: lead, error: leadError } = await supabaseClient
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            throw new Error(`Lead não encontrado: ${leadError?.message}`)
        }

        // 2. Preparar payload para o PowerCRM
        // IMPORTANTE: Estes IDs devem ser confirmados pelo usuário
        const powercrm_token = Deno.env.get('POWERCRM_TOKEN')

        if (!powercrm_token) {
            throw new Error('Secret POWERCRM_TOKEN não configurado no Supabase')
        }

        // Mapeamento de campos conforme especificação do PowerCRM
        const payload = {
            name: lead.nome,
            phone: lead.telefone,
            email: lead.email || '',
            plates: lead.placa,
            brand: lead.veiculo_marca || lead.marca,
            model: lead.veiculo_modelo || lead.modelo,
            year: lead.veiculo_ano || lead.ano_modelo,
            city: lead.veiculo_cidade || lead.cidade || '79',
            // Campos fixos reais extraídos da requisição original
            coop: "7505",
            leadOrigem: "6009",
            stageId: "2fb0203a-dedb-4ea0-b32d-8ec7ad1d4b76",
            vhclType: "1", // Carro de passeio
            vendedorId: 0 // Opcional
        }

        console.log('Enviando para PowerCRM:', JSON.stringify(payload))

        // 3. Chamar a API do PowerCRM
        const response = await fetch('https://app.powercrm.com.br/company/newQuotationAttempt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': powercrm_token.startsWith('Bearer ') ? powercrm_token : `Bearer ${powercrm_token}`
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Erro na API do PowerCRM: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        // Resposta esperada: {"code":"pDaM19VvDX","id":40111254,"isB2b":false}

        if (!result.code) {
            throw new Error('Código de checkout não retornado pelo PowerCRM')
        }

        const linkCotacao = `https://app.powercrm.com.br/checkout?h=${result.code}`

        // 4. Salvar o link no banco de dados
        const { error: updateError } = await supabaseClient
            .from('leads')
            .update({ link_cotacao: linkCotacao })
            .eq('id', leadId)

        if (updateError) {
            throw new Error(`Erro ao atualizar lead: ${updateError.message}`)
        }

        return new Response(JSON.stringify({
            success: true,
            link_cotacao: linkCotacao,
            powercrm_id: result.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Erro na integração PowerCRM:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
