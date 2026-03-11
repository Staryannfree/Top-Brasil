import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendAdminAlert } from './alerts.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * parseBRMoney: Converte qualquer formato de valor monetário brasileiro para número.
 * Exemplos:
 *   'R$ 25.069,00' -> 25069
 *   '25.069,00'    -> 25069
 *   '25069'        -> 25069
 *   '25069.00'     -> 25069   (formato US, 3 dígitos após o ponto = milhar BR)
 *   '9,0'          -> 9       (não confunde com 90!)
 *   900            -> 900     (já é número)
 */
function parseBRMoney(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;

    let s = String(val).trim();
    if (!s) return 0;

    // Remove símbolo R$, cifrão e espaços
    s = s.replace(/R\$\s*/g, '').trim();

    // Detecta formato BR (tem vírgula como separador decimal)
    if (s.includes(',')) {
        // Ex: '25.069,00' -> remove pontos de milhar, troca vírgula por ponto
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        // Sem vírgula: pode ser '25069' ou '25.069' (milhar BR) ou '25069.00' (US)
        const dotCount = (s.match(/\./g) || []).length;
        if (dotCount === 1) {
            const afterDot = s.split('.')[1];
            // Se tem exatamente 3 dígitos depois do ponto => milhar BR (ex: 25.069)
            if (afterDot.length === 3) {
                s = s.replace('.', ''); // Remove o ponto de milhar
            }
            // Caso contrário (1 ou 2 dígitos, ex: 250.69), mantém como está (decimal)
        } else {
            // Sem ponto ou múltiplos pontos: remove todos
            s = s.replace(/\./g, '');
        }
    }

    const parsed = parseFloat(s.replace(/[^\d.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}

/** Calcula mensalidade com base no valor FIPE */
function calcMensalidade(valorFipe: number): number {
    if (valorFipe <= 30000) return 90;
    if (valorFipe <= 60000) return 130;
    return 180;
}

/** Calcula cota de participação com base no valor FIPE */
function calcCota(valorFipe: number): number {
    return Math.max(1200, valorFipe * 0.04);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const body = await req.json();
        const event = body.event;

        console.log(`Chat Webhook Event: ${event}`, JSON.stringify(body, null, 2));

        // 0. Prevenção de Loop Infinito (feedback loop)
        // Se este evento 'custom-field-updated' foi engatilhado pelo próprio webhook via API, ignorar.
        if (event === 'custom-field-updated' && body.edited_by === 'API') {
            console.log('Ignorando evento gerado por API para evitar loop infinito.');
            return new Response(JSON.stringify({ status: 'ignored_api_loop' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Identificar Lead (Deduplicação Inteligente Estrita)
        const protocol = body.protocol || body.protocolo || body.content?.protocol || body.infos?.attendance?.protocol;
        const rawPhone = body.telephone || body.phone || body.telefone || body.content?.telephone || body.content?.phone || body.infos?.contact?.telephone || body.infos?.contact?.phone;
        const phone = rawPhone ? String(rawPhone).replace(/\D/g, '') : null;

        // Tentar extrair placa do payload
        const segmentationFieldsInput = body.infos?.contact?.segmentation_fields || [];
        const placaNoEvento = segmentationFieldsInput.find((f: any) => f.name === 'PLACA_DIGITADA' || f.name === 'PLACA_CLIENTE')?.content;
        const placaCleanInput = placaNoEvento ? String(placaNoEvento).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null;

        let lead: any = null;

        // Passo A: Protocolo (Identificador Direto)
        if (protocol) {
            console.log(`Buscando lead por protocolo: ${protocol}`);
            const { data } = await supabase.from('leads').select('*').eq('protocolo', protocol).maybeSingle();
            lead = data;
        }

        // Passo B: Telefone (Identificador com Verificação de Placa)
        if (!lead && phone) {
            console.log(`Buscando lead por Telefone: ...${phone.slice(-8)}`);
            const { data: phoneLeads } = await supabase.from('leads')
                .select('*')
                .ilike('telefone', `%${phone.slice(-8)}%`)
                .order('created_at', { ascending: false });

            if (phoneLeads && phoneLeads.length > 0) {
                // Procura um lead compatível (mesma placa ou placa nula)
                for (const l of phoneLeads) {
                    const storedPlaca = l.placa ? String(l.placa).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
                    if (!storedPlaca || (placaCleanInput && storedPlaca === placaCleanInput)) {
                        lead = l;
                        console.log(`Lead compatível encontrado por telefone (ID: ${l.id}, Placa: ${storedPlaca || 'NULL'})`);
                        break;
                    }
                }
            }
        }

        // Passo C: Placa (Fallback para hit 3 do bot ou falta de telefone)
        if (!lead && placaCleanInput) {
            console.log(`Buscando por Placa (fallback): ${placaCleanInput}`);
            const { data } = await supabase.from('leads')
                .select('*')
                .ilike('placa', placaCleanInput)
                .order('created_at', { ascending: false }).limit(1).maybeSingle();
            lead = data;
        }

        if (!lead && phone) {
            console.log(`Novo Lead detectado via chat. Criando registro para telefone: ${phone}`);
            const { data: newLead, error: createError } = await supabase.from('leads').insert({
                telefone: phone,
                tenant_id: '5841cbfb-53db-4710-8b1e-d9e4b2aa3eed', // Tenant ID padrão
                status: 'novo_lead',
                origem: 'smclick'
            }).select().single();

            if (!createError && newLead) {
                lead = newLead;
            }
        }

        if (!lead) {
            console.warn(`Lead não encontrado e sem telefone para criação (${protocol || phone || placaCleanInput}). Evento: ${event}`);
            return new Response(JSON.stringify({ status: 'lead_not_found' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Lidar com atualização de campos personalizados
        if (event === 'custom-field-updated') {
            const segmentationFields = body.infos?.contact?.segmentation_fields || [];
            const updates: any = {};
            let placaDigitada: string | null = null;

            segmentationFields.forEach((f: any) => {
                const name = f.name;
                const value = f.content;
                if (!value) return;

                if (name === 'PLACA_DIGITADA') {
                    placaDigitada = value;
                    updates.placa = value;
                }
                if (name === 'PLACA_CLIENTE' && !placaDigitada) {
                    updates.placa = value;
                }
                if (name === 'NOME_CLIENTE') updates.nome = value;
                if (name === 'PROTOCOLO') updates.protocolo = value;
                if (name === 'VIN') updates.chassi_parcial = value;

                // CAMPOS DE VEÍCULO: Salvar apenas dados textuais do veículo (não valores monetários!)
                // Os valores monetários (FIPE, Mensalidade, Cota) são sempre CALCULADOS pelo sistema,
                // nunca aceitos de volta do bot — isso evita corrupção de dados por reformatação do SMClick.
                if (name === 'VEICULO_MARCA') updates.veiculo_marca = value;
                if (name === 'VEICULO_MODELO') updates.veiculo_modelo = value;
                if (name === 'VEICULO_ANO') updates.veiculo_ano = value;
                if (name === 'VEICULO_COR') updates.veiculo_cor = value;
                if (name === 'VEICULO_CIDADE') updates.veiculo_cidade = value;

                // NOTA: VALOR_FIPE, VALOR_COTA_PARTICIPACAO e VALOR_MENSALIDADE são IGNORADOS aqui.
                // Eles serão recalculados pela consulta PlacaFIPE quando a placa mudar.
            });

            // Verificar se a placa mudou para re-enriquecer com dados da FIPE
            const isValidPlaca = (placa: string): boolean => {
                const cleaned = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
                const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
                return oldFormat.test(cleaned) || mercosulFormat.test(cleaned);
            };

            const incomingPlacaClean = placaDigitada ? placaDigitada.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
            const storedPlacaClean = lead.placa ? String(lead.placa).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

            const jaTemDadosFipe = incomingPlacaClean === storedPlacaClean
                && lead.veiculo_marca
                && (lead as any).valor_fipe;

            const placaMudou = incomingPlacaClean
                && isValidPlaca(placaDigitada!)
                && incomingPlacaClean !== storedPlacaClean
                && !jaTemDadosFipe;

            if (!placaMudou && incomingPlacaClean) {
                console.log(`PlacaFIPE: IGNORADO — placa "${incomingPlacaClean}" não mudou ou já tem dados FIPE.`);
            }

            if (placaMudou) {
                // Limpar dados antigos do veículo
                updates.veiculo_marca = null;
                updates.veiculo_modelo = null;
                updates.veiculo_ano = null;
                updates.veiculo_cor = null;
                updates.veiculo_cidade = null;
                updates.valor_fipe = null;
                updates.valor_cota_participacao = null;
                updates.valor_mensalidade = null;
                updates.chassi_parcial = null;

                const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
                if (placaFipeToken) {
                    try {
                        const cleanPlaca = updates.placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        const fipeRes = await fetch('https://api.placafipe.com.br/getplacafipe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ placa: cleanPlaca, token: placaFipeToken })
                        });
                        if (fipeRes.ok) {
                            const data = await fipeRes.json();
                            console.log(`PlacaFIPE raw response [codigo=${data.codigo}]:`, JSON.stringify(data.fipe?.[0] || {}));

                            if (data.codigo === 1) {
                                const info = data.informacoes_veiculo;
                                const fipeArray = data.fipe || [];
                                let rawFipeValue = 0;

                                if (fipeArray.length > 0 && fipeArray[0].valor) {
                                    const rawValor = fipeArray[0].valor;
                                    console.log(`PlacaFIPE valor bruto: "${rawValor}" (tipo: ${typeof rawValor})`);
                                    rawFipeValue = parseBRMoney(rawValor);
                                    console.log(`PlacaFIPE valor parseado: ${rawFipeValue}`);
                                }

                                // Calcular sempre a partir do valor FIPE — nunca usar os valores do SMClick
                                const valorMensalidade = calcMensalidade(rawFipeValue);
                                const valorCota = calcCota(rawFipeValue);
                                console.log(`PlacaFIPE cálculos: fipe=${rawFipeValue} → mensalidade=${valorMensalidade}, cota=${valorCota}`);

                                updates.veiculo_marca = info.marca;
                                updates.veiculo_modelo = info.modelo;
                                updates.veiculo_ano = info.ano;
                                updates.veiculo_cor = info.cor;
                                updates.veiculo_cidade = `${info.municipio} - ${info.uf}`;
                                updates.valor_fipe = rawFipeValue;
                                updates.valor_cota_participacao = valorCota;
                                updates.valor_mensalidade = valorMensalidade;
                                updates.combustivel = info.combustivel;
                                updates.cilindradas = info.cilindradas;
                                updates.chassi_parcial = info.chassi;
                                updates.motor = info.motor;
                                updates.segmento = info.segmento;
                                updates.sub_segmento = info.sub_segmento;
                                updates.municipio = info.municipio;
                                updates.uf = info.uf;
                                updates.codigo_fipe = fipeArray.length > 0 ? fipeArray[0].codigo_fipe : null;
                                updates.mes_referencia = fipeArray.length > 0 ? fipeArray[0].mes_referencia : null;
                                updates.desvalorizometro = fipeArray.length > 0 ? fipeArray[0].desvalorizometro : null;
                            }
                        }
                    } catch (e: any) {
                        console.error('Auto-enrichment error:', e.message);
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase.from('leads').update(updates).eq('id', lead.id);
                if (updateError) throw updateError;

                const { data: updatedLead } = await supabase
                    .from('leads')
                    .select('id, nome, telefone, placa, protocolo, veiculo_marca, veiculo_modelo, veiculo_ano, veiculo_cor, veiculo_cidade, valor_fipe, valor_cota_participacao, valor_mensalidade, chassi_parcial')
                    .eq('id', lead.id)
                    .single();

                // === WRITEBACK: Enviar dados da FIPE de volta ao SMClick (PARALELO) ===
                const smclickKey = Deno.env.get('SMCLICK_API_KEY');
                const contactPhone = body.infos?.contact?.telephone;

                if (smclickKey && contactPhone && updatedLead && placaMudou) {
                    try {
                        const fieldMap: Record<string, string> = {};
                        segmentationFields.forEach((f: any) => {
                            if (f.name && f.id) fieldMap[f.name] = f.id;
                        });

                        const fieldsToWrite: Array<{ name: string, id: string, content: string }> = [];
                        const addField = (fieldName: string, value: any) => {
                            if (value != null && fieldMap[fieldName]) {
                                fieldsToWrite.push({ name: fieldName, id: fieldMap[fieldName], content: String(value) });
                            }
                        };

                        addField('VEICULO_MARCA', updatedLead.veiculo_marca);
                        addField('VEICULO_MODELO', updatedLead.veiculo_modelo);
                        addField('VEICULO_ANO', updatedLead.veiculo_ano);
                        addField('VEICULO_COR', updatedLead.veiculo_cor);
                        addField('VEICULO_CIDADE', updatedLead.veiculo_cidade);
                        addField('VALOR_FIPE', updatedLead.valor_fipe);
                        addField('VALOR_COTA_PARTICIPACAO', updatedLead.valor_cota_participacao);
                        addField('VALOR_MENSALIDADE', updatedLead.valor_mensalidade);
                        addField('PLACA_CLIENTE', updatedLead.placa);

                        if (fieldsToWrite.length > 0) {
                            console.log(`SMClick Writeback: Sincronizando ${fieldsToWrite.length} campos em paralelo...`);
                            const fetchWithTimeout = (url: string, options: RequestInit, timeout = 2500) => {
                                return Promise.race([
                                    fetch(url, options),
                                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
                                ]);
                            };

                            const requests = fieldsToWrite.map(field =>
                                fetchWithTimeout(
                                    `https://api.smclick.com.br/contacts/segmentation_field/${contactPhone}/${field.id}`,
                                    {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'x-api-key': smclickKey },
                                        body: JSON.stringify({ content: field.content })
                                    }
                                ).then(res => ({ field: field.name, ok: res.ok, status: res.status }))
                            );

                            // Dispara todos em paralelo, não trava a function caso algum demore
                            const results = await Promise.allSettled(requests);
                            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
                            console.log(`SMClick Writeback finalizado: ${successCount}/${fieldsToWrite.length} sucessos em background.`);
                        }
                    } catch (wbError) {
                        console.error('SMClick Writeback exception (non-blocking):', wbError);
                    }
                }

                if (placaMudou && updatedLead) {
                    const alertMsg = `🚗 *Novo Lead com Placa (via Chat)!*\n\n👤 Nome: ${updatedLead.nome}\n📟 Placa: ${updatedLead.placa}\n🚘 Veículo: ${updatedLead.veiculo_marca || ''} ${updatedLead.veiculo_modelo || ''}\n💰 FIPE: R$ ${updatedLead.valor_fipe?.toLocaleString('pt-BR') || '0,00'}\n\n🔗 https://crmtopbrasil.netlify.app/atendimento`;
                    await sendAdminAlert(alertMsg);
                }

                return new Response(JSON.stringify({
                    status: 'lead_updated',
                    updates,
                    lead: updatedLead
                }), {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        }

        // 3. Lidar com mensagens
        const message = body.content?.text || body.content?.message || body.text || body.message;

        if (message) {
            const fromMe = body.from_me === true || event === 'new-chat-message-sent';
            const { error: upsertError } = await supabase.from('chat_messages').upsert({
                lead_id: lead.id,
                telefone: lead.telefone || phone,
                conteudo: message,
                from_me: fromMe,
                sent_at: body.sent_at || new Date().toISOString()
            }, {
                onConflict: 'lead_id,conteudo,sent_at',
                ignoreDuplicates: true
            });

            if (upsertError) throw upsertError;

            // Alerta de Novo Lead / Início de Conversa (Keyword CRM)
            const msgLow = message.toLowerCase();
            if (!fromMe && msgLow === 'crm') {
                const alertMsg = `🆕 *Novo Lead Iniciou Conversa!*\n\n👤 Telefone: ${lead.telefone || phone}\n💬 Mensagem: "${message}"\n\n🔗 https://crmtopbrasil.netlify.app/atendimento`;
                await sendAdminAlert(alertMsg);
            }

            // Alerta de Blindagem (Apenas se a mensagem vier do lead)
            if (!fromMe && (msgLow.includes('blindar') || msgLow.includes('proteger hoje'))) {
                const alertMsg = `🛡️ *Lead quer Blindar!*\n\n👤 Nome: ${lead.nome}\n🚗 Veículo: ${lead.veiculo_marca || ''} ${lead.veiculo_modelo || ''}\n📊 Status: ${lead.status}\n💬 Mensagem: "${message}"\n\n🔗 https://crmtopbrasil.netlify.app/atendimento`;
                await sendAdminAlert(alertMsg);
            }

            return new Response(JSON.stringify({ status: 'message_processed', lead_id: lead.id }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ status: 'event_processed', event }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Chat Webhook Fatal Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
