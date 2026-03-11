// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = "https://yfqrpfmoworgncfsqkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcXJwZm1vd29yZ25jZnNxa2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTIwNDEsImV4cCI6MjA4ODQyODA0MX0.3ltQEjITl2FBWJumHdZV6SyRYORn09RsStdYzn6G-ug";

// CONFIGURAÇÃO POWERCRM
const POWER_COOP = "7505";
const POWER_ORIGEM = "6009";
const POWER_STAGE = "2fb0203a-dedb-4ea0-b32d-8ec7ad1d4b76";
const POWER_VHCL = "1";

let currentLead = null;

const log = (msg) => {
    const el = document.getElementById('log');
    el.innerHTML += `<div>> ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => {
    log('Iniciando extensão...');
    fetchPendingLead();
});

document.getElementById('btn-refresh').addEventListener('click', fetchPendingLead);

async function fetchPendingLead() {
    log('Buscando lead sem cotação...');
    const btn = document.getElementById('btn-sync');
    btn.disabled = true;

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?link_cotacao=is.null&order=created_at.desc&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            currentLead = data[0];
            document.getElementById('lead-display').style.display = 'block';
            document.getElementById('lead-name').textContent = currentLead.nome || 'Sem nome';
            document.getElementById('lead-veiculo').textContent = `Placa: ${currentLead.placa || '---'}`;
            btn.disabled = false;
            log('Lead localizado com sucesso.');
        } else {
            document.getElementById('lead-display').style.display = 'none';
            log('Nenhum lead pendente encontrado no momento.');
        }
    } catch (error) {
        log(`Erro ao buscar lead: ${error.message}`);
    }
}

document.getElementById('btn-sync').addEventListener('click', async () => {
    if (!currentLead) return;

    const btn = document.getElementById('btn-sync');
    btn.disabled = true;
    log('Iniciando integração PowerCRM...');

    try {
        const payload = {
            name: currentLead.nome,
            phone: currentLead.telefone ? currentLead.telefone.replace(/\D/g, '') : '',
            email: currentLead.email || '',
            plates: currentLead.placa ? currentLead.placa.replace(/\W/g, '').toUpperCase() : '',
            brand: currentLead.veiculo_marca || currentLead.marca || '',
            model: currentLead.veiculo_modelo || currentLead.modelo || '',
            year: (currentLead.veiculo_ano || currentLead.ano_modelo || '').toString(),
            city: "79",
            coop: POWER_COOP,
            leadOrigem: POWER_ORIGEM,
            stageId: POWER_STAGE,
            vhclType: POWER_VHCL,
            vendedorId: 0
        };

        log('Enviando dados para o servidor PowerCRM...');

        const response = await fetch('https://app.powercrm.com.br/company/newQuotationAttempt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            credentials: 'include' // IMPORTANTE: Aproveita os cookies da sessão ativa
        });

        const result = await response.json();

        if (result && result.code) {
            log('Cotação criada! Hash recebido.');
            const checkoutLink = `https://app.powercrm.com.br/checkout?h=${result.code}`;

            log('Atualizando Supabase...');
            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${currentLead.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link_cotacao: checkoutLink
                })
            });

            if (updateRes.ok) {
                log('PRONTO! Link salvo no banco de dados.');
                alert('Sucesso! Link gerado e salvo: ' + checkoutLink);
                fetchPendingLead();
            } else {
                throw new Error('Falha ao salvar link no Supabase');
            }
        } else {
            throw new Error('Resposta inválida do PowerCRM. Verifique se você está logado no PowerCRM em outra aba.');
        }
    } catch (error) {
        log(`ERRO: ${error.message}`);
        console.error(error);
        alert('Erro na integração: ' + error.message);
        btn.disabled = false;
    }
});
