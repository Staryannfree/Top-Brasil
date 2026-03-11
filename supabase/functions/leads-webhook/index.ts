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
      // Caso contrário (1 ou 2 dígitos decimais, ex: 250.69), mantém como está
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    let body: any = {};

    if (req.method === 'POST') {
      try { body = await req.json(); } catch (e) { body = Object.fromEntries(url.searchParams.entries()); }
    } else {
      body = Object.fromEntries(url.searchParams.entries());
    }

    console.log(`Leads Webhook (${req.method}):`, JSON.stringify(body));

    // --- Tenant ---
    let tenant_id = url.searchParams.get('tenant_id') || body.tenant_id || body.tenantId;
    if (!tenant_id) {
      const { data: t } = await supabase.from('tenants').select('id').limit(1).single();
      tenant_id = t?.id;
    }
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id não encontrado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Extrair campos ---
    const nome = body.nome || body.name || undefined;
    const telefone = body.telefone || body.phone || body.telephone || undefined;
    const placaBody = body.placa || body.plate || undefined;
    const protocolo = body.protocolo || body.protocol || undefined;
    const action = body.action || url.searchParams.get('action');
    const newStatus = body.status || url.searchParams.get('status');

    // --- AÇÃO: Alterar Status ---
    if (action === 'set_status' && newStatus) {
      console.log(`Ação solicitada: set_status (${newStatus})`);
      const cleanPhone = telefone ? String(telefone).replace(/\D/g, '') : null;
      const cleanPlaca = placaBody ? placaBody.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : null;

      let query = supabase.from('leads').select('id').eq('tenant_id', tenant_id);
      if (cleanPhone) query = query.ilike('telefone', `%${cleanPhone.slice(-8)}%`);
      else if (cleanPlaca) query = query.eq('placa', cleanPlaca);
      else {
        return new Response(JSON.stringify({ error: 'telefone ou placa obrigatórios para set_status' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: leadToUpdate } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (leadToUpdate) {
        const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadToUpdate.id);
        if (error) throw error;
        console.log(`Status do lead ${leadToUpdate.id} atualizado para: ${newStatus}`);
        return new Response(JSON.stringify({ success: true, message: `Status atualizado para ${newStatus}` }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'lead não encontrado para atualização de status' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let leadData: any = { tenant_id, status: 'novo_lead', origem: 'smclick' };
    if (nome) leadData.nome = nome;
    if (telefone) leadData.telefone = telefone;
    if (placaBody) leadData.placa = placaBody;
    if (protocolo) leadData.protocolo = protocolo;

    // --- PASSO 1: Identificar Lead (Deduplicação Inteligente: Telefone + Placa) ---
    const incomingPlacaClean = placaBody ? placaBody.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const cleanPhone = telefone ? String(telefone).replace(/\D/g, '') : null;
    let existingLead: any = null;

    console.log(`Buscando lead: Telefone (${cleanPhone}) | Placa (${incomingPlacaClean})`);

    // PASSO A: Buscar SEMPRE pelo telefone primeiro
    if (cleanPhone) {
      const { data } = await supabase.from('leads')
        .select('*').eq('tenant_id', tenant_id)
        .ilike('telefone', `%${cleanPhone.slice(-8)}%`)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (data) {
        // PASSO B: Encontrou o telefone. Vamos analisar a placa no banco (Memória)
        const placaNoBanco = data.placa ? String(data.placa).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

        if (!placaNoBanco) {
          console.log('Lead encontrado, mas placa no banco estava vazia. Vamos atualizar!');
          existingLead = data;
        } else if (incomingPlacaClean && placaNoBanco === incomingPlacaClean) {
          console.log('Lead encontrado e placa é igual. Atualizando histórico...');
          existingLead = data;
        } else if (incomingPlacaClean && placaNoBanco !== incomingPlacaClean) {
          console.log('ALERTA: Placas diferentes! Este é um SEGUNDO CARRO. Criando novo lead...');
          existingLead = null; // Força a criar um NOVO lead (para o 2º carro)
        } else {
          // Não veio placa na requisição (Hit repetido), apenas usa o lead
          existingLead = data;
        }
      }
    }

    // PASSO C: Fallback para hits perdidos do bot (Só Placa, sem telefone)
    // IMPORTANTE: Quando o bot envia só a placa (Hit 3), chamamos a API diretamente
    // para evitar race condition com o POST (que pode ainda estar consultando a FIPE)
    if (!existingLead && incomingPlacaClean && !cleanPhone) {
      console.log('GET por placa (Fallback Hit 3). Buscando lead + consultando PlacaFIPE direto...');
      const { data } = await supabase.from('leads')
        .select('*').eq('tenant_id', tenant_id)
        .ilike('placa', incomingPlacaClean)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      existingLead = data;

      // Chamar PlacaFIPE SEMPRE neste caso para garantir dados frescos
      // Isso resolve o race condition: GET pode chegar antes de o POST terminar o enrichment
      const token = Deno.env.get('PLACAFIPE_TOKEN');
      if (token && existingLead) {
        console.log(`GET: Consultando PlacaFIPE direto para placa ${incomingPlacaClean}...`);
        try {
          const fipeRes = await fetch('https://api.placafipe.com.br/getplacafipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa: incomingPlacaClean, token })
          });
          if (fipeRes.ok) {
            const fipeData = await fipeRes.json();
            if (fipeData.codigo === 1) {
              const info = fipeData.informacoes_veiculo;
              const fipeArray = fipeData.fipe || [];
              let rawFipeValue = fipeArray.length > 0 && fipeArray[0].valor ? parseBRMoney(fipeArray[0].valor) : 0;
              const valorMensalidade = calcMensalidade(rawFipeValue);
              const valorCota = calcCota(rawFipeValue);
              const fipeUpdates: any = {
                veiculo_marca: info.marca,
                veiculo_modelo: info.modelo,
                veiculo_ano: info.ano,
                veiculo_cor: info.cor,
                veiculo_cidade: `${info.municipio} - ${info.uf}`,
                valor_fipe: rawFipeValue,
                valor_cota_participacao: valorCota,
                valor_mensalidade: valorMensalidade,
                combustivel: info.combustivel,
                cilindradas: info.cilindradas,
                chassi_parcial: info.chassi,
                motor: info.motor,
                segmento: info.segmento,
                sub_segmento: info.sub_segmento,
                municipio: info.municipio,
                uf: info.uf,
                codigo_fipe: fipeArray.length > 0 ? fipeArray[0].codigo_fipe : null,
                mes_referencia: fipeArray.length > 0 ? fipeArray[0].mes_referencia : null,
                desvalorizometro: fipeArray.length > 0 ? fipeArray[0].desvalorizometro : null,
              };
              const { data: enriched } = await supabase.from('leads').update(fipeUpdates).eq('id', existingLead.id).select().single();
              if (enriched) {
                existingLead = enriched;
                console.log(`GET PlacaFIPE OK: ${info.marca} ${info.modelo}, FIPE=${rawFipeValue}`);
              }
            }
          }
        } catch (e: any) {
          console.error('GET PlacaFIPE error (non-blocking):', e.message);
        }
      }
    }

    let finalLead: any;

    if (existingLead) {
      console.log(`Lead identificado para UPDATE (ID: ${existingLead.id}).`);
      const updateData: any = { ...leadData };
      // Preservar status avançado
      if (existingLead.status && existingLead.status !== 'novo_lead') delete updateData.status;
      // Preservar vendedor
      if (existingLead.vendedor_id) delete updateData.vendedor_id;

      const { data, error } = await supabase.from('leads')
        .update(updateData).eq('id', existingLead.id).select().single();
      if (error) throw error;
      finalLead = { ...data, _storedPlaca: existingLead.placa };
    } else {
      // NOVO LEAD: Telefone/Placa nunca vistos juntos
      console.log('Nenhum lead compatível. Criando novo registro.');
      if (!leadData.nome) leadData.nome = 'Lead sem nome';
      leadData.categoria = 'particular';
      const { data, error } = await supabase.from('leads').insert(leadData).select().single();
      if (error) throw error;
      finalLead = { ...data, _storedPlaca: null };
    }

    // --- PASSO 2: Enriquecimento PlacaFipe ---
    // Consultar APENAS se a placa da requisição for diferente da placa já salva no banco
    const storedPlacaClean = finalLead._storedPlaca
      ? String(finalLead._storedPlaca).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
    const deveConsultarFipe = incomingPlacaClean && incomingPlacaClean !== storedPlacaClean;

    if (deveConsultarFipe) {
      console.log(`PlacaFIPE: Consultando para placa "${incomingPlacaClean}" (anterior: "${storedPlacaClean || 'nenhuma'}")`);
      try {
        const token = Deno.env.get('PLACAFIPE_TOKEN');
        if (token) {
          const fipeRes = await fetch('https://api.placafipe.com.br/getplacafipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa: incomingPlacaClean, token })
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

              // Calcular mensalidade e cota com base no valor FIPE REAL
              const valorMensalidade = calcMensalidade(rawFipeValue);
              const valorCota = calcCota(rawFipeValue);
              console.log(`PlacaFIPE cálculos: fipe=${rawFipeValue} → mensalidade=${valorMensalidade}, cota=${valorCota}`);

              const fipeUpdates: any = {
                veiculo_marca: info.marca,
                veiculo_modelo: info.modelo,
                veiculo_ano: info.ano,
                veiculo_cor: info.cor,
                veiculo_cidade: `${info.municipio} - ${info.uf}`,
                valor_fipe: rawFipeValue,
                valor_cota_participacao: valorCota,
                valor_mensalidade: valorMensalidade,
                combustivel: info.combustivel,
                cilindradas: info.cilindradas,
                chassi_parcial: info.chassi,
                motor: info.motor,
                segmento: info.segmento,
                sub_segmento: info.sub_segmento,
                municipio: info.municipio,
                uf: info.uf,
                codigo_fipe: fipeArray.length > 0 ? fipeArray[0].codigo_fipe : null,
                mes_referencia: fipeArray.length > 0 ? fipeArray[0].mes_referencia : null,
                desvalorizometro: fipeArray.length > 0 ? fipeArray[0].desvalorizometro : null,
              };

              const { data: enriched, error: enrichError } = await supabase
                .from('leads').update(fipeUpdates).eq('id', finalLead.id).select().single();
              if (!enrichError && enriched) {
                finalLead = enriched;
                // Enviar alerta para o administrador
                const alertMsg = `🚗 *Novo Lead com Placa!*\n\n👤 Nome: ${finalLead.nome}\n📟 Placa: ${finalLead.placa}\n🚘 Veículo: ${finalLead.veiculo_marca} ${finalLead.veiculo_modelo}\n💰 FIPE: R$ ${finalLead.valor_fipe?.toLocaleString('pt-BR') || '0,00'}\n\n🔗 https://crmtopbrasil.netlify.app/atendimento`;
                await sendAdminAlert(alertMsg);
              }
            }
          }
        }
      } catch (e: any) {
        console.error('Enrichment error:', e.message);
      }
    } else {
      console.log(`PlacaFIPE: IGNORADO — placa não mudou ("${incomingPlacaClean}") ou não veio placa.`);
    }

    return new Response(JSON.stringify({
      veiculo_marca: finalLead.veiculo_marca,
      veiculo_modelo: finalLead.veiculo_modelo,
      veiculo_ano: finalLead.veiculo_ano,
      veiculo_cor: finalLead.veiculo_cor,
      veiculo_cidade: finalLead.veiculo_cidade,
      valor_fipe: finalLead.valor_fipe,
      valor_cota_participacao: finalLead.valor_cota_participacao,
      valor_mensalidade: finalLead.valor_mensalidade,
      placa: finalLead.placa,
      lead_id: finalLead.id,
      status: finalLead.status,
      combustivel: finalLead.combustivel,
      cilindradas: finalLead.cilindradas,
      codigo_fipe: finalLead.codigo_fipe,
      mes_referencia: finalLead.mes_referencia,
      municipio: finalLead.municipio,
      uf: finalLead.uf
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Leads Webhook Fatal error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
