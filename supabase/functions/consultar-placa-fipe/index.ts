import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { lead_id, placa } = await req.json();

        if (!lead_id || !placa) {
            return new Response(JSON.stringify({ error: 'lead_id e placa são obrigatórios' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
        if (!placaFipeToken) {
            return new Response(JSON.stringify({ error: 'PLACAFIPE_TOKEN não configurado no Supabase' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Chamar a API Oficial da PlacaFipe
        const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const placaFipeUrl = 'https://api.placafipe.com.br/getplacafipe';

        console.log(`Consultando placa oficial: ${cleanPlaca}`);

        const response = await fetch(placaFipeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                placa: cleanPlaca,
                token: placaFipeToken
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`PlacaFipe API falhou: ${response.status}`, errText);
            throw new Error(`Falha ao consultar API da PlacaFipe: ${response.status}`);
        }

        const data = await response.json();
        console.log("Resposta oficial PlacaFipe:", JSON.stringify(data));

        // Verificação de sucesso da API (codigo 1)
        if (data.codigo !== 1) {
            return new Response(JSON.stringify({
                success: false,
                error: data.mensagem || 'Placa não localizada ou erro na API PlacaFipe'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const info = data.informacoes_veiculo;
        const fipeArray = data.fipe || [];

        // Extraindo valor FIPE do primeiro item do array
        let rawFipeValue = 0;
        if (fipeArray.length > 0 && fipeArray[0].valor) {
            const valorStr = String(fipeArray[0].valor);
            const apenasDigitos = valorStr.replace(/[^\d]/g, '');
            rawFipeValue = parseInt(apenasDigitos, 10) / 100;
        }

        // 2. Regra da Cota de Participação
        const valorCota = Math.max(1200, rawFipeValue * 0.04);

        // 3. Regra da Mensalidade
        let mensalidade = 180; // Default para > 60000
        if (rawFipeValue <= 30000) {
            mensalidade = 90;
        } else if (rawFipeValue <= 60000) {
            mensalidade = 130;
        }

        // Objeto consolidado para o Supabase
        const updateData = {
            veiculo_marca: info.marca,
            veiculo_modelo: info.modelo,
            veiculo_ano: info.ano,
            veiculo_cor: info.cor,
            veiculo_cidade: `${info.municipio} - ${info.uf}`,
            valor_fipe: rawFipeValue,
            valor_cota_participacao: valorCota,
            valor_mensalidade: mensalidade
        };

        // 4. Salvar no Banco de Dados
        const { data: leadData, error: dbError } = await supabase
            .from('leads')
            .update(updateData)
            .eq('id', lead_id)
            .select()
            .single();

        if (dbError) {
            console.error("Erro ao salvar dados no Supabase:", dbError.message);
            throw dbError;
        }

        return new Response(JSON.stringify({ success: true, lead: leadData }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Erro na Edge Function:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
