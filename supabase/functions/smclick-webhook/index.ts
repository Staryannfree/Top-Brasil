import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Permite requisições do navegador/SMClick (CORS)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Pega o payload que o SMClick enviou
        const body = await req.json();
        
        // O SMClick pode enviar o telefone com nomes diferentes dependendo da configuração.
        // Vamos cobrir as opções mais comuns:
        const telefoneCru = body.telefone || body.phone || body.from || body.celular;

        if (!telefoneCru) {
            throw new Error('Telefone não fornecido no payload.');
        }

        // Limpa o telefone para deixar só os números
        const cleanPhone = String(telefoneCru).replace(/\D/g, '');

        // BUSCA A REGRINHA DE OURO: O ÚLTIMO LEAD DESSE TELEFONE
        const { data: lead, error } = await supabase
            .from('leads')
            .select('nome, placa, veiculo_marca, veiculo_modelo, valor_fipe, valor_mensalidade')
            .ilike('telefone', `%${cleanPhone.slice(-8)}%`) // Busca pelos últimos 8 dígitos (ignora DDI/DDD se vier diferente)
            .order('created_at', { ascending: false }) // Do mais novo pro mais velho
            .limit(1) // Puxa SÓ o último!
            .single();

        if (error || !lead) {
            return new Response(JSON.stringify({ encontrado: false, erro: 'Lead não encontrado' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Devolve os dados mastigados para o SMClick
        return new Response(JSON.stringify({
            encontrado: true,
            atendimento_nome: lead.nome ? lead.nome.split(' ')[0] : 'Motorista',
            veiculo_placa: lead.placa,
            veiculo_modelo: lead.veiculo_modelo || 'Veículo',
            veiculo_marca: lead.veiculo_marca || '',
            valor_fipe: lead.valor_fipe,
            valor_mensalidade: lead.valor_mensalidade
        }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
