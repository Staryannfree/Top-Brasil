export const sendAdminAlert = async (message: string) => {
    const smclickKey = Deno.env.get('SMCLICK_API_KEY');
    const instanceId = Deno.env.get("SMCLICK_INSTANCE_ID");
    const adminPhone = "5561981872528";

    if (!smclickKey || !instanceId) {
        console.error("sendAdminAlert: SMCLICK_API_KEY ou INSTANCE_ID não configurados.");
        return;
    }

    const smclickUrl = 'https://api.smclick.com.br/instances/messages';

    try {
        const response = await fetch(smclickUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': smclickKey
            },
            body: JSON.stringify({
                instance: instanceId,
                type: "text",
                content: {
                    telephone: adminPhone,
                    message: message
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`sendAdminAlert Error: ${response.status} - ${errorText}`);
        } else {
            console.log(`Alerta enviado para Administrador (${adminPhone})`);
        }
    } catch (error: any) {
        console.error("sendAdminAlert Exception:", error.message);
    }
};
