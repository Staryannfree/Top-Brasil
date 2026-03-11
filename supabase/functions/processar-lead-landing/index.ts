import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { nome, telefone, placa } = await req.json();

        if (!nome || !telefone || !placa) {
            return new Response(JSON.stringify({ error: 'Nome, Telefone e Placa são obrigatórios' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
        if (!placaFipeToken) {
            throw new Error('PLACAFIPE_TOKEN não configurado no Supabase');
        }

        const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const placaFipeUrl = 'https://api.placafipe.com.br/getplacafipe';

        console.log(`Consultando PlacaFipe para: ${cleanPlaca}`);

        const response = await fetch(placaFipeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa: cleanPlaca, token: placaFipeToken })
        });

        if (!response.ok) {
            throw new Error(`Falha API PlacaFipe: ${response.status}`);
        }

        const data = await response.json();

        if (data.codigo !== 1) {
            return new Response(JSON.stringify({
                success: false,
                error: data.mensagem || 'Placa não localizada'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const info = data.informacoes_veiculo;
        const fipeArray = data.fipe || [];

        let rawFipeValue = 0;
        if (fipeArray.length > 0 && fipeArray[0].valor) {
            const valorStr = String(fipeArray[0].valor);
            const apenasDigitos = valorStr.replace(/[^\d]/g, '');
            rawFipeValue = parseInt(apenasDigitos, 10) / 100;
        }

        // Regras de Negócio
        const valor_mensalidade = rawFipeValue <= 30000 ? 90 : rawFipeValue <= 60000 ? 130 : 180;
        const valor_cota_participacao = Math.max(1200, rawFipeValue * 0.04);

        const veiculoData = {
            marca: info.marca,
            modelo: info.modelo,
            ano_fabricacao: info.ano,
            valor_fipe: rawFipeValue,
            valor_mensalidade,
            valor_cota_participacao
        };

        let leadIdToMessage = null;

        // Deduplicação Rigorosa
        const { data: existingLeads, error: searchError } = await supabase
            .from('leads')
            .select('*')
            .eq('telefone', telefone)
            .order('created_at', { ascending: false });

        if (searchError) throw searchError;

        if (existingLeads && existingLeads.length > 0) {
            const lead = existingLeads[0];
            
            if (!lead.placa || lead.placa === cleanPlaca) {
                // UPDATE
                console.log(`Atualizando lead existente (${lead.id}) com placa ${cleanPlaca}`);
                const { error: updateError } = await supabase
                    .from('leads')
                    .update({
                        nome,
                        placa: cleanPlaca,
                        ...veiculoData
                    })
                    .eq('id', lead.id);

                if (updateError) throw updateError;
                leadIdToMessage = lead.id;
            } else {
                // INSERT (Novo Carro)
                console.log(`Lead existente encontado, mas placa diferente. Inserindo novo lead.`);
                const { data: newLead, error: insertError } = await supabase
                    .from('leads')
                    .insert({
                        nome,
                        telefone,
                        placa: cleanPlaca,
                        status: 'novo_lead',
                        ...veiculoData
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                leadIdToMessage = newLead.id;
            }
        } else {
            // INSERT (Lead Novo)
            console.log(`Nenhum lead encontrado com telefone ${telefone}. Inserindo novo.`);
            const { data: newLead, error: insertError } = await supabase
                .from('leads')
                .insert({
                    nome,
                    telefone,
                    placa: cleanPlaca,
                    status: 'novo_lead',
                    ...veiculoData
                })
                .select()
                .single();

            if (insertError) throw insertError;
            leadIdToMessage = newLead.id;
        }

        // Disparo Ativo (SMClick)
        const smclickKey = Deno.env.get('SMCLICK_API_KEY');
        if (!smclickKey) {
            console.warn('SMCLICK_API_KEY não configurado, pulando envio.');
        } else {
            const smclickUrl = 'https://api.smclick.com.br/attendances/chats/message';
            
            const primeiroNome = nome.split(' ')[0];
            const fipeFormatada = rawFipeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const mensalidadeFormatada = valor_mensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const message = `Olá ${primeiroNome}! Aqui é da Top Brasil Proteção Veicular 🚗🛡️\n` +
                            `Vimos que você simulou a proteção para o seu ${info.modelo} (${info.ano}) de placa ${cleanPlaca}.\n\n` +
                            `Temos uma excelente notícia! Conseguimos aprovar uma cobertura completa (Roubo, Furto, Colisão, PT, Guincho e Terceiros) no valor FIPE de ${fipeFormatada}.\n\n` +
                            `Sua mensalidade ficaria apenas ${mensalidadeFormatada}.\n\n` +
                            `O que achou da proposta? Podemos seguir com a vistoria digital?`;

            console.log(`Enviando WhatsApp para ${telefone}...`);

            const cleanPhone = telefone.replace(/\D/g, '');

            try {
                const smclickRes = await fetch(smclickUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': smclickKey
                    },
                    body: JSON.stringify({
                        protocol: "whatsapp",
                        phone: `+55${cleanPhone}`,
                        content: {
                            type: 'text',
                            text: message
                        }
                    })
                });

                if (!smclickRes.ok) {
                    console.error("Erro no SMClick: ", await smclickRes.text());
                } else {
                    console.log("Mensagem SMClick enviada com sucesso.");
                }
            } catch (smclickErr) {
                console.error("Excecao ao chamar SMClick: ", smclickErr);
            }
        }

        return new Response(JSON.stringify({ success: true, message: 'Processo concluído' }), {
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
