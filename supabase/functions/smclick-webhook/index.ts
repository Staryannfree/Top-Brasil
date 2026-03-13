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
        const telefoneCru = body.telefone || body.phone || body.from || body.celular || body.telephone;

        if (!telefoneCru) {
            throw new Error('Telefone não fornecido no payload.');
        }

        // Limpa o telefone para deixar só os números
        const cleanPhone = String(telefoneCru).replace(/\D/g, '');

        // BUSCA A REGRINHA DE OURO: O ÚLTIMO LEAD DESSE TELEFONE
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .ilike('telefone', `%${cleanPhone.slice(-8)}%`) // Busca pelos últimos 8 dígitos (ignora DDI/DDD se vier diferente)
            .order('created_at', { ascending: false }) // Do mais novo pro mais velho
            .limit(1) // Puxa SÓ o último!
            .maybeSingle();

        if (error || !lead) {
            return new Response(JSON.stringify({ encontrado: false, erro: 'Lead não encontrado' }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // === SINCRONIZAÇÃO PROATIVA (WRITEBACK) ===
        // Sincroniza os dados de volta para o cadastro do contato no SMClick
        const smclickKey = Deno.env.get('SMCLICK_API_KEY');
        if (smclickKey && cleanPhone) {
            try {
                // 1. Buscar os IDs dos campos no SMClick para esse contato
                const contactUrl = `https://api.smclick.com.br/contacts/${cleanPhone}`;
                const contactRes = await fetch(contactUrl, {
                    headers: { 'x-api-key': smclickKey }
                });

                if (contactRes.ok) {
                    const contactData = await contactRes.json();
                    const segmentationFields = contactData.segmentation_fields || [];
                    
                    const fieldMap: Record<string, string> = {};
                    segmentationFields.forEach((f: any) => {
                        if (f.name && f.id) fieldMap[f.name] = f.id;
                    });

                    const fieldsToWrite: Array<{ id: string, content: string }> = [];
                    const addField = (fieldName: string, value: any) => {
                        if (value != null && fieldMap[fieldName]) {
                            fieldsToWrite.push({ id: fieldMap[fieldName], content: String(value) });
                        }
                    };

                    // Mapeamento de campos (Igual ao chat-webhook)
                    addField('VEICULO_MARCA', lead.veiculo_marca);
                    addField('VEICULO_MODELO', lead.veiculo_modelo);
                    addField('VEICULO_ANO', lead.veiculo_ano);
                    addField('VEICULO_COR', lead.veiculo_cor);
                    addField('VEICULO_CIDADE', lead.veiculo_cidade);
                    addField('VALOR_FIPE', lead.valor_fipe);
                    addField('VALOR_COTA_PARTICIPACAO', lead.valor_cota_participacao);
                    addField('VALOR_MENSALIDADE', lead.valor_mensalidade);
                    addField('PLACA_CLIENTE', lead.placa);

                    if (fieldsToWrite.length > 0) {
                        console.log(`smclick-webhook: Sincronizando ${fieldsToWrite.length} campos para ${cleanPhone}`);
                        
                        const fetchWithTimeout = (url: string, options: RequestInit, timeout = 2500) => {
                            return Promise.race([
                                fetch(url, options),
                                new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
                            ]);
                        };

                        const requests = fieldsToWrite.map(field =>
                            fetchWithTimeout(
                                `https://api.smclick.com.br/contacts/segmentation_field/${cleanPhone}/${field.id}`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-api-key': smclickKey },
                                    body: JSON.stringify({ content: field.content })
                                }
                            )
                        );

                        // Dispara em paralelo para não travar a resposta do webhook
                        Promise.allSettled(requests).then(results => {
                            const successCount = results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length;
                            console.log(`smclick-webhook: Writeback finalizado (${successCount}/${fieldsToWrite.length} sucessos)`);
                        });
                    }
                }
            } catch (syncError) {
                console.error("smclick-webhook: Erro na sincronização SMClick:", syncError);
            }
        }

        // Devolve os dados mastigados para o SMClick (Com as chaves de leads-webhook)
        return new Response(JSON.stringify({
            encontrado: true,
            atendimento_nome: lead.nome ? lead.nome.split(' ')[0] : 'Motorista',
            veiculo_marca: lead.veiculo_marca,
            veiculo_modelo: lead.veiculo_modelo,
            veiculo_ano: lead.veiculo_ano,
            veiculo_cor: lead.veiculo_cor,
            veiculo_cidade: lead.veiculo_cidade,
            valor_fipe: lead.valor_fipe,
            valor_cota_participacao: lead.valor_cota_participacao,
            valor_mensalidade: lead.valor_mensalidade,
            placa: lead.placa,
            lead_id: lead.id,
            status: lead.status,
            combustivel: lead.combustivel,
            cilindradas: lead.cilindradas,
            codigo_fipe: lead.codigo_fipe,
            mes_referencia: lead.mes_referencia,
            municipio: lead.municipio,
            uf: lead.uf
        }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("smclick-webhook error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
