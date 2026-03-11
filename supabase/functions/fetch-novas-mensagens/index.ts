import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { protocol } = await req.json();

        if (!protocol) {
            return new Response(JSON.stringify({ error: 'Protocol is required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const smclickKey = Deno.env.get('SMCLICK_API_KEY');

        if (!smclickKey) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Configuração incompleta: SMCLICK_API_KEY não configurado no Supabase Dash.'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 1. Fetch from SMClick
        const smclickUrl = `https://api.smclick.com.br/attendances/chats/message?protocol=${protocol}`;
        const smclickResponse = await fetch(smclickUrl, {
            headers: { 'X-API-KEY': smclickKey }
        });

        if (!smclickResponse.ok) {
            throw new Error(`SMClick API failed: ${smclickResponse.statusText}`);
        }

        const { results } = await smclickResponse.json();
        if (!results || !Array.isArray(results)) {
            return new Response(JSON.stringify({ success: true, newCount: 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 2. Get Lead ID and existing messages for fast memory filtering
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id, telefone')
            .eq('protocolo', protocol)
            .maybeSingle();

        if (leadError || !lead) {
            throw new Error(leadError?.message || "Lead not found for protocol");
        }

        // Optimization: Only fetch headers/keys for deduplication to keep it ultra-fast
        const { data: existingMessages, error: msgError } = await supabase
            .from('chat_messages')
            .select('conteudo, sent_at')
            .eq('lead_id', lead.id);

        if (msgError) throw msgError;

        // Fast memory Set for deduplication
        const existingSet = new Set(existingMessages.map((m: any) => `${m.conteudo}_${new Date(m.sent_at).getTime()}`));

        // 3. Filter new messages in memory
        const newMessagesToInsert = results
            .map((msg: any) => ({
                lead_id: lead.id,
                telefone: lead.telefone || '',
                conteudo: msg.content?.text || '',
                from_me: msg.from_me === true,
                sent_at: msg.created_at || new Date().toISOString()
            }))
            .filter((msg: any) => {
                if (!msg.conteudo) return false;
                const key = `${msg.conteudo}_${new Date(msg.sent_at).getTime()}`;
                return !existingSet.has(key);
            });

        // 4. Bulk Upsert only if new messages exist (using DB as final source of truth)
        if (newMessagesToInsert.length > 0) {
            console.log(`Radar SMClick: Detectadas ${newMessagesToInsert.length} novas mensagens para lead ${lead.id}`);
            const { error: upsertError } = await supabase
                .from('chat_messages')
                .upsert(newMessagesToInsert, {
                    onConflict: 'lead_id,conteudo,sent_at',
                    ignoreDuplicates: true
                });

            if (upsertError) throw upsertError;
        }

        return new Response(JSON.stringify({ success: true, newCount: newMessagesToInsert.length }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Error in fetch-novas-mensagens:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
