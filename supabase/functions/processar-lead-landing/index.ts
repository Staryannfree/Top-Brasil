import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * parseBRMoney: Converte qualquer formato de valor monetário brasileiro para número.
 */
function parseBRMoney(val: any): number {
    if (typeof val === 'number') return val;
    if (!val) return 0;
  
    let s = String(val).trim();
    if (!s) return 0;
  
    s = s.replace(/R\$\s*/g, '').trim();
  
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      const dotCount = (s.match(/\./g) || []).length;
      if (dotCount === 1) {
        const afterDot = s.split('.')[1];
        if (afterDot.length === 3) {
          s = s.replace('.', '');
        }
      } else {
        s = s.replace(/\./g, '');
      }
    }
  
    const parsed = parseFloat(s.replace(/[^\d.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * normalizePhone: Garante que o número está no formato 55DD9NNNNNNNN (sem +)
 */
function normalizePhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11 || clean.length === 10) {
        return '55' + clean;
    }
    return clean;
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

        const body = await req.json();
        const { nome, telefone, placa } = body;
        
        // Sanitização da Origem
        let origem = 'landing_page_b2c';
        if (body.origem && typeof body.origem === 'string') {
            origem = body.origem.trim().substring(0, 50).replace(/[<>{}[\]]/g, '');
        }

        console.log(`[START] Lead: ${nome} | Tel: ${telefone} | Placa: ${placa} | Origem: ${origem}`);

        if (!nome || !telefone || !placa) {
            throw new Error('Campos obrigatórios: nome, telefone, placa.');
        }

        let tenant_id = body.tenant_id;
        if (!tenant_id) {
            const { data: t } = await supabase.from('tenants').select('id').limit(1).single();
            tenant_id = t?.id;
        }

        const cleanPhone = telefone.replace(/\D/g, '');
        const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const smclickPhone = normalizePhone(cleanPhone);

        // --- 1. Fipe ---
        let vehicleInfo: any = null;
        let rawFipeValue = 0;
        let valor_mensalidade = 0;
        let valor_cota_participacao = 0;

        try {
            const placaFipeToken = Deno.env.get('PLACAFIPE_TOKEN');
            if (placaFipeToken) {
                const fipeRes = await fetch('https://api.placafipe.com.br/getplacafipe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ placa: cleanPlaca, token: placaFipeToken })
                });

                if (fipeRes.ok) {
                    const fipeData = await fipeRes.json();
                    if (fipeData.codigo === 1) {
                        const info = fipeData.informacoes_veiculo;
                        vehicleInfo = info;
                        const fipeArray = fipeData.fipe || [];
                        if (fipeArray.length > 0 && fipeArray[0].valor) {
                            rawFipeValue = parseBRMoney(fipeArray[0].valor);
                            valor_mensalidade = rawFipeValue <= 30000 ? 90 : rawFipeValue <= 60000 ? 130 : 180;
                            valor_cota_participacao = Math.max(1200, rawFipeValue * 0.04);
                            console.log(`[FIPE] Valor: ${rawFipeValue} | Mens: ${valor_mensalidade}`);
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error("[FIPE ERROR]", e.message);
        }

        // --- 2. Salvar Lead ---
        const leadData: any = {
            nome,
            telefone: cleanPhone,
            placa: cleanPlaca,
            tenant_id,
            origem: origem,
            status: 'novo_lead',
            veiculo_marca: vehicleInfo?.marca || null,
            veiculo_modelo: vehicleInfo?.modelo || null,
            veiculo_ano: vehicleInfo?.ano || null,
            valor_fipe: rawFipeValue || null,
            valor_mensalidade: valor_mensalidade || null,
            valor_cota_participacao: valor_cota_participacao || null,
            veiculo_cor: vehicleInfo?.cor || null,
            veiculo_cidade: vehicleInfo ? `${vehicleInfo.municipio} - ${vehicleInfo.uf}` : null
        };

        const { data: searchLeads } = await supabase.from('leads').select('id, placa')
            .eq('tenant_id', tenant_id).ilike('telefone', `%${cleanPhone.slice(-8)}%`).order('created_at', { ascending: false });

        if (searchLeads && searchLeads.length > 0) {
            const lead = searchLeads[0];
            const storedPlaca = lead.placa ? lead.placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
            if (!storedPlaca || storedPlaca === cleanPlaca) {
                delete leadData.status;
                await supabase.from('leads').update(leadData).eq('id', lead.id);
                console.log(`[DB] Lead atualizado: ${lead.id}`);
            } else {
                await supabase.from('leads').insert(leadData);
                console.log(`[DB] Novo lead (carro diferente)`);
            }
        } else {
            await supabase.from('leads').insert(leadData);
            console.log(`[DB] Novo lead inserido`);
        }

        // --- 3. SMClick ---
        try {
            const smclickKey = Deno.env.get('SMCLICK_API_KEY');
            const instanceId = Deno.env.get("SMCLICK_INSTANCE_ID");
            
            if (!smclickKey || !instanceId) {
                console.error("[SMCLICK] ERRO: SMCLICK_API_KEY ou SMCLICK_INSTANCE_ID não configurados.");
            } else if (!rawFipeValue) {
                console.warn("[SMCLICK] Pulando mensagem (Sem valor FIPE)");
            } else {
                const smclickUrl = 'https://api.smclick.com.br/instances/messages';
                const primeiroNome = nome.split(' ')[0];
                const fipeStr = rawFipeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const mensalStr = valor_mensalidade.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                const message = `Olá ${primeiroNome}! Aqui é da Top Brasil Proteção Veicular 🚗🛡️\n` +
                                `Vimos que você simulou a proteção para o seu ${vehicleInfo?.modelo || 'veículo'} (${vehicleInfo?.ano || '-'}) de placa ${cleanPlaca}.\n\n` +
                                `Temos uma excelente notícia! Conseguimos aprovar uma cobertura completa no valor FIPE de ${fipeStr}.\n\n` +
                                `Sua mensalidade ficaria apenas *${mensalStr}*.\n\n` +
                                `O que achou da proposta? Podemos seguir com a vistoria digital?`;

                console.log(`[SMCLICK] Enviando para ${smclickPhone} (Instance: ${instanceId})`);
                
                const smRes = await fetch(smclickUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-KEY': smclickKey },
                    body: JSON.stringify({
                        instance: instanceId,
                        type: "text",
                        content: {
                            telephone: smclickPhone,
                            message: message
                        }
                    })
                });

                if (!smRes.ok) {
                    const txt = await smRes.text();
                    console.error(`[SMCLICK ERROR] Status: ${smRes.status} | Body: ${txt}`);
                } else {
                    console.log(`[SMCLICK SUCCESS] Mensagem enviada para ${smclickPhone}`);
                }
            }
        } catch (e: any) {
            console.error("[SMCLICK EXCEPTION]", e.message);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("[FATAL ERROR]", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
