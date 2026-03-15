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

        const { placa } = await req.json();

        if (!placa) {
            return new Response(JSON.stringify({ error: 'Placa é obrigatória' }), {
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

        const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const placaFipeUrl = 'https://api.placafipe.com.br/getplacafipe';

        console.log(`Consultando placa avulsa oficial: ${cleanPlaca}`);

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

        if (data.codigo !== 1 && (!data.informacoes_veiculo || !data.informacoes_veiculo.marca)) {
            console.warn(`Placa não encontrada ou erro API: ${data.mensagem || data.msg}`);
            return new Response(JSON.stringify({
                success: false,
                error: data.mensagem || data.msg || 'Placa não localizada ou erro na API PlacaFipe'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const info = data.informacoes_veiculo || {};
        const fipeArray = data.fipe || [];

        let rawFipeValue = 0;
        let codigoFipe = '';
        let mesReferencia = '';
        
        if (fipeArray.length > 0) {
            const firstFipe = fipeArray[0];
            if (firstFipe.valor) {
                const valorStr = String(firstFipe.valor);
                const apenasDigitos = valorStr.replace(/[^\d]/g, '');
                rawFipeValue = parseInt(apenasDigitos, 10) / 100;
            }
            codigoFipe = firstFipe.codigo || '';
            mesReferencia = firstFipe.mes_referencia || '';
        }

        // Histórico de Preços (Desvalorizômetro)
        let historicoPrecos = null;
        if (data.desvalorizometro) {
            try {
                const dvResponse = await fetch('https://api.placafipe.com.br/getdesvalorizometro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        desvalorizometro: data.desvalorizometro,
                        token: placaFipeToken
                    })
                });
                if (dvResponse.ok) {
                    const dvData = await dvResponse.json();
                    if (dvData.desvalorizometro && dvData.desvalorizometro.tabelas) {
                        historicoPrecos = dvData.desvalorizometro.tabelas;
                    }
                }
            } catch (dvErr) {
                console.error("Erro ao buscar desvalorizometro:", dvErr.message);
            }
        }

        const insertData = {
            placa: cleanPlaca,
            marca: info.marca || '',
            modelo: info.modelo || '',
            ano: info.ano || '',
            cidade: info.municipio ? `${info.municipio} - ${info.uf}` : '',
            valor_fipe: rawFipeValue,
            cor: info.cor || '',
            combustivel: info.combustivel || '',
            chassi_parcial: info.chassi || '',
            motor: info.motor || '',
            cilindradas: info.cilindradas || '',
            segmento: info.segmento || '',
            situacao: info.situacao || '',
            codigo_fipe: codigoFipe,
            mes_referencia: mesReferencia,
            procedencia: info.procedencia || '',
            tipo_veiculo: info.tipo_veiculo || '',
            
            // Novos campos técnicos (Perícia Total)
            potencia: info.potencia || '',
            n_motor: info.n_motor || '',
            caixa_cambio: info.caixa_cambio || '',
            pbt: info.pbt || '',
            cmt: info.cmt || '',
            capacidade_carga: info.capacidade_de_carga || '',
            n_eixos: info.quantidade_de_eixos || '',
            n_passageiros: info.quantidade_passageiro || '',
            carroceria: info.carroceria || '',
            tipo_carroceria: info.tipo_carroceria || '',
            tipo_montagem: info.tipo_montagem || '',
            situacao_chassi: info.situacao_do_chassi || '',
            eixo_traseiro_dif: info.eixo_traseiro_dif || '',
            historico_precos: historicoPrecos,
            
            created_at: new Date().toISOString()
        };

        // Salvar no Banco de Dados
        const { data: dbData, error: dbError } = await supabase
            .from('placas_consultadas')
            .insert(insertData)
            .select()
            .single();

        if (dbError) {
            console.error("Erro ao salvar dados no Supabase placas_consultadas:", dbError.message);
            // Even if DB fails, return API data to user
            return new Response(JSON.stringify({ success: true, data: insertData, rawData: data }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, data: dbData, rawData: data }), {
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
