import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // 1. Lidar com requisições OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url);
        let placa = url.searchParams.get('placa') || url.searchParams.get('plate');

        // Se caso quiserem mandar POST, aceitamos também
        if (!placa && req.method === 'POST') {
            try {
                const body = await req.json();
                placa = body.placa || body.plate;
            } catch (e) { }
        }

        if (!placa) {
            return new Response(JSON.stringify({ error: 'A placa deve ser informada na URL (ex: ?placa=ABC1234)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
        if (!placaFipeToken) {
            console.error("PLACAFIPE_TOKEN not found in environment variables");
            return new Response(JSON.stringify({ error: 'Erro de configuração do servidor (Token ausente)' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        const placaFipeUrl = 'https://api.placafipe.com.br/getplacafipe'

        console.log(`Consultando PlacaFipe (GET API) para a placa: ${cleanPlaca}`)

        const response = await fetch(placaFipeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                placa: cleanPlaca,
                token: placaFipeToken
            })
        })

        if (!response.ok) {
            console.error("Erro na requisição à PlacaFipe:", response.status, response.statusText);
            return new Response(JSON.stringify({ error: `Erro na API PlacaFipe (${response.status})` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 502,
            })
        }

        const data = await response.json()
        console.log("Resposta PlacaFipe recebida via GET API:", data.codigo === 1 ? 'Sucesso' : 'Erro');

        // Se a API retornar erro de placa não encontrada, devolvemos pra tela
        if (data.codigo !== 1 || !data.informacoes_veiculo) {
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // --- APLICAR REGRAS DE NEGÓCIO DA TOP BRASIL ---
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
        data.calculated_cota_participacao = valorCota;

        // 3. Regra da Mensalidade
        let mensalidade = 180;
        if (rawFipeValue <= 30000) {
            mensalidade = 90;
        } else if (rawFipeValue <= 60000) {
            mensalidade = 130;
        }
        data.calculated_mensalidade = mensalidade;


        // Formatando o objeto de resposta para ficar bem limpo para o SMClick
        // RETORNANDO DE FORMA "PLANA" (FLAT) PARA FACILITAR AS VARIÁVEIS NO SMCLICK
        const flatResponse = {
            veiculo_marca: data.informacoes_veiculo.marca,
            veiculo_modelo: data.informacoes_veiculo.modelo,
            veiculo_ano: data.informacoes_veiculo.ano,
            veiculo_cor: data.informacoes_veiculo.cor,
            veiculo_cidade: `${data.informacoes_veiculo.municipio} - ${data.informacoes_veiculo.uf}`,
            valor_fipe: rawFipeValue,
            valor_cota_participacao: valorCota,
            valor_mensalidade: mensalidade,
            placa: cleanPlaca
        }

        return new Response(JSON.stringify(flatResponse), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Erro fatal na edge function:", error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
