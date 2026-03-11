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
        const { message, phone, protocol } = await req.json();

        if (!message || !phone) {
            return new Response(JSON.stringify({ error: 'Message and phone are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const smclickKey = Deno.env.get('SMCLICK_API_KEY') || 'e8cb3abe-2fb6-402c-89f4-9b83be85eef8';

        // Using the external message sending endpoint from SMClick API
        // Note: The actual endpoint might vary. Based on typical SMClick API patterns:
        const smclickUrl = 'https://api.smclick.com.br/attendances/chats/message';

        console.log(`Sending message to ${phone} via protocol ${protocol}`);

        const response = await fetch(smclickUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': smclickKey
            },
            body: JSON.stringify({
                protocol: protocol,
                phone: phone,
                content: {
                    type: 'text',
                    text: message
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`SMClick API error: ${response.status} ${errorText}`);
            throw new Error(`Failed to send message to SMClick: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Message sent successfully to SMClick');

        return new Response(JSON.stringify({ success: true, result }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Error in enviar-mensagem-smclick:", err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
