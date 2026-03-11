import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
        if (!placaFipeToken) {
            return new Response(JSON.stringify({ error: 'PLACAFIPE_TOKEN não configurado no Supabase' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const url = 'https://api.placafipe.com.br/getquotas';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: placaFipeToken
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`PlacaFipe API falhou: ${response.status}`, errText);
            throw new Error(`Falha ao consultar quotas API da PlacaFipe: ${response.status}`);
        }

        const data = await response.json();

        return new Response(JSON.stringify({ success: true, data }), {
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
