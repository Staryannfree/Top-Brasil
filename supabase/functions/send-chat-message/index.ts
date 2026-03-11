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

        const { lead_id, telefone, mensagem } = await req.json();

        if (!lead_id || !telefone || !mensagem) {
            return new Response(JSON.stringify({ error: 'lead_id, telefone and mensagem are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const smclickKey = Deno.env.get('SMCLICK_API_KEY');
        const instanceId = Deno.env.get("SMCLICK_INSTANCE_ID");

        if (!smclickKey || !instanceId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Configuração incompleta: SMCLICK_API_KEY ou SMCLICK_INSTANCE_ID não configurados no Supabase Dash.'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const smclickUrl = 'https://api.smclick.com.br/instances/messages';

        console.log(`Forwarding message to SMClick for lead ${lead_id} (${telefone})`);

        // 1. Send to SMClick
        const smclickResponse = await fetch(smclickUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': smclickKey
            },
            body: JSON.stringify({
                instance: instanceId,
                type: "text",
                content: {
                    telephone: telefone,
                    message: mensagem
                }
            })
        });

        if (!smclickResponse.ok) {
            const errorText = await smclickResponse.text();
            console.error(`SMClick API Error: ${smclickResponse.status} - ${errorText}`);
            return new Response(JSON.stringify({
                success: false,
                error: `SMClick API Error (${smclickResponse.status}): ${errorText}`,
                details: errorText
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log("Message sent to SMClick successfully. Persisting to database...");

        // 2. Insert into chat_messages
        const { data, error: dbError } = await supabase
            .from('chat_messages')
            .insert({
                lead_id,
                telefone,
                conteudo: mensagem,
                from_me: true,
                sent_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error("Error persisting message to database:", dbError.message);
            // Even if DB fails, the message was sent to SMClick. But we should report the error.
            throw dbError;
        }

        return new Response(JSON.stringify({ success: true, message: data }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Fatal error in send-chat-message:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
