// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = "https://yfqrpfmoworgncfsqkgy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcXJwZm1vd29yZ25jZnNxa2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTIwNDEsImV4cCI6MjA4ODQyODA0MX0.3ltQEjITl2FBWJumHdZV6SyRYORn09RsStdYzn6G-ug";

// CONFIGURAÇÃO POWERCRM
const POWER_COOP = "7505";
const POWER_ORIGEM = "6009";
const POWER_STAGE = "2fb0203a-dedb-4ea0-b32d-8ec7ad1d4b76";
const POWER_VHCL = "1";

let leads = [];

const log = (msg) => {
    const el = document.getElementById('log');
    const div = document.createElement('div');
    div.className = 'log-msg';
    div.textContent = `> ${msg}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => {
    log('Iniciando extensão...');
    fetchLeads();
    loadLoginConfig(); // Carrega config de login ao iniciar
});

// LOGIN CONFIG LOGIC
const btnSaveLogin = document.getElementById('btn-save-login');
const inputEmail = document.getElementById('login-email');
const inputPass = document.getElementById('login-pass');
const loginDot = document.getElementById('login-dot');
const loginText = document.getElementById('login-text');

async function loadLoginConfig() {
    chrome.storage.local.get(['autoLogin'], (result) => {
        if (result.autoLogin && result.autoLogin.active) {
            inputEmail.value = result.autoLogin.email || '';
            inputPass.value = result.autoLogin.pass || '';
            updateLoginUI(true);
        }
    });
}

function updateLoginUI(active) {
    if (active) {
        loginDot.classList.add('active');
        loginText.textContent = 'Auto-login ATIVO';
        loginText.style.color = '#10b981';
        btnSaveLogin.textContent = 'DESATIVAR AUTO-LOGIN';
        btnSaveLogin.style.background = '#374151';
        btnSaveLogin.style.color = '#fff';
    } else {
        loginDot.classList.remove('active');
        loginText.textContent = 'Auto-login desativado';
        loginText.style.color = '#9ca3af';
        btnSaveLogin.textContent = 'ATIVAR AUTO-LOGIN';
        btnSaveLogin.style.background = '#f59e0b';
        btnSaveLogin.style.color = '#000';
    }
}

btnSaveLogin.addEventListener('click', () => {
    chrome.storage.local.get(['autoLogin'], (result) => {
        const currentlyActive = result.autoLogin ? result.autoLogin.active : false;
        
        if (currentlyActive) {
            // Desativar
            chrome.storage.local.set({ autoLogin: { active: false } }, () => {
                updateLoginUI(false);
                log('Auto-login desativado.');
            });
        } else {
            // Ativar
            const email = inputEmail.value.trim();
            const pass = inputPass.value.trim();
            
            if (!email || !pass) {
                log('ERRO: Preencha email e senha!');
                return;
            }
            
            chrome.storage.local.set({ 
                autoLogin: { active: true, email, pass } 
            }, () => {
                updateLoginUI(true);
                log('Auto-login ATIVADO com sucesso!');
            });
        }
    });
});

document.getElementById('btn-refresh').addEventListener('click', fetchLeads);
document.getElementById('btn-inspect').addEventListener('click', handleInspect);

async function handleAutofill(lead) {
    log(`Iniciando Mágica: ${lead.nome}`);

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('powercrm.com.br')) {
            log('ERRO: No PowerCRM, clique aqui!');
            return;
        }

        const leadData = {
            nome: lead.nome || '',
            email: lead.email || '',
            telefone: lead.telefone ? lead.telefone.replace(/\D/g, '') : '',
            placa: lead.placa ? lead.placa.replace(/\W/g, '').toUpperCase() : '',
            marca: lead.veiculo_marca || lead.marca || '',
            modelo: lead.veiculo_modelo || lead.modelo || '',
            ano: (lead.veiculo_ano || lead.ano_modelo || '').toString(),
            cor: lead.veiculo_cor || lead.cor || '',
            combustivel: lead.combustivel || '',
            cidade: lead.veiculo_cidade || lead.cidade || '',
            uf: lead.uf || lead.estado || '',
            tipoVeiculo: document.getElementById(`vtype-${lead.id}`)?.value || '1'
        };

        log('Processando: Automático (Aba Ativa)...');
        
        chrome.tabs.sendMessage(tab.id, { action: 'fillForm', data: leadData }, (response) => {
            if (chrome.runtime.lastError) {
                log('ERRO: Recarregue a aba do PowerCRM.');
                console.error(chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                log('✨ Formulário Preenchido!');
                
                if (response.saved) {
                    log('🚀 Negociação SALVA automaticamente!');
                } else {
                    log('⚠️ Não pude salvar agora, mas preenchi!');
                }

                const failures = Object.entries(response.details || {})
                    .filter(([k, v]) => v === false && leadData[k])
                    .map(([k]) => k.toUpperCase());
                
                if (failures.length > 0) {
                    log(`Dica: Revise ${failures.join(', ')}`);
                }
            } else {
                log(`ERRO: ${response?.error || 'Não consegui automatizar'}`);
            }
        });

    } catch (err) {
        log(`Erro no Auto-Fill: ${err.message}`);
    }
}

async function handleInspect() {
    log('Inspecionando campos da página...');
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab || !tab.url.includes('powercrm.com.br')) {
            log('ERRO: Abra o PowerCRM na aba ativa!');
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'inspectFields' }, (response) => {
            if (chrome.runtime.lastError) {
                log('ERRO: Recarregue a página do PowerCRM.');
                console.error(chrome.runtime.lastError);
                return;
            }

            if (response && response.success) {
                log(`Encontrados ${response.fields.length} campos:`);
                response.fields.forEach(f => {
                    log(`[${f.label}] ID: ${f.id} | NAME: ${f.name}`);
                });
            } else {
                log('Nenhum campo detectado.');
            }
        });
    } catch (err) {
        log(`Erro de inspeção: ${err.message}`);
    }
}

async function fetchLeads() {
    log('Sincronizando com CRM...');
    const listEl = document.getElementById('leads-list');
    listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#9ca3af; font-size:12px;">Buscando leads...</div>';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc&limit=30`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });

        leads = await response.json();
        renderLeads(leads);
        log(`${leads.length} leads carregados.`);
    } catch (error) {
        log(`Erro ao buscar leads: ${error.message}`);
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444; font-size:12px;">Falha ao carregar lista.</div>';
    }
}

function renderLeads(leadsList) {
    const listEl = document.getElementById('leads-list');
    listEl.innerHTML = '';

    if (leadsList.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#9ca3af; font-size:12px;">Nenhum lead encontrado.</div>';
        return;
    }

    leadsList.forEach(lead => {
        const card = document.createElement('div');
        card.className = 'lead-card';
        
        const hasQuote = !!lead.link_cotacao;
        const statusClass = hasQuote ? 'status-done' : 'status-pending';
        const statusText = hasQuote ? 'Cotado' : 'Pendente';

        const vehicle = [lead.veiculo_marca || lead.marca, lead.veiculo_modelo || lead.modelo].filter(Boolean).join(' ');
        const year = lead.veiculo_ano || lead.ano_modelo || '';
        
        // Palavras chave para tentar adivinhar se é moto
        const isMoto = vehicle.toLowerCase().includes('moto') || 
                       vehicle.toLowerCase().includes('cg ') || 
                       vehicle.toLowerCase().includes('ninja') || 
                       vehicle.toLowerCase().includes('yamaha');

        card.innerHTML = `
            <div class="lead-info">
                <div class="lead-name">${lead.nome || 'Sem nome'}</div>
                <div class="lead-vehicle">
                    ${vehicle}${year ? ' (' + year + ')' : ''}
                    ${!vehicle && !year ? '<span style="color:#d1d5db;font-style:italic;">Sem dados do veículo</span>' : ''}
                </div>
                <div class="lead-meta">
                    <span>${lead.placa || 'S/ Placa'}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <select class="vehicle-type-select" id="vtype-${lead.id}">
                    <option value="1" ${!isMoto ? 'selected' : ''}>🚗 Carro/Utilitário</option>
                    <option value="2" ${isMoto ? 'selected' : ''}>🏍️ Moto</option>
                    <option value="3">🚚 Caminhão</option>
                </select>
            </div>
            <div class="lead-actions">
                <button class="action-btn magic-btn" title="✨ Auto-preencher no PowerCRM">✨</button>
                <button class="action-btn sync-btn ${hasQuote ? 'done' : ''}" title="${hasQuote ? 'Cotação já gerada' : '⚡ Sincronizar via API'}" ${hasQuote ? 'disabled' : ''}>
                    ${hasQuote ? '✅' : '⚡'}
                </button>
            </div>
        `;

        // Botão Mágica (Auto-fill)
        card.querySelector('.magic-btn').addEventListener('click', () => handleAutofill(lead));

        // Botão Sincronizar (API)
        if (!hasQuote) {
            const syncBtn = card.querySelector('.sync-btn');
            syncBtn.addEventListener('click', () => syncLead(lead, syncBtn));
        }

        listEl.appendChild(card);
    });
}

async function syncLead(lead, btn) {
    btn.disabled = true;
    btn.innerHTML = '...';
    log(`Iniciando: ${lead.nome}...`);

    try {
        const payload = {
            name: lead.nome,
            phone: lead.telefone ? lead.telefone.replace(/\D/g, '') : '',
            email: lead.email || '',
            plates: lead.placa ? lead.placa.replace(/\W/g, '').toUpperCase() : '',
            brand: lead.veiculo_marca || lead.marca || '',
            model: lead.veiculo_modelo || lead.modelo || '',
            year: (lead.veiculo_ano || lead.ano_modelo || '').toString(),
            color: lead.veiculo_cor || lead.cor || '',
            fuel: lead.combustivel || '',
            fipeValue: lead.valor_fipe || 0,
            engine: lead.cilindradas || '',
            fipeCode: lead.codigo_fipe || '',
            city: "79",
            coop: POWER_COOP,
            leadOrigem: POWER_ORIGEM,
            stageId: POWER_STAGE,
            vhclType: POWER_VHCL,
            vendedorId: 0
        };

        const response = await fetch('https://app.powercrm.com.br/company/newQuotationAttempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        const result = await response.json();

        if (result && result.code) {
            const checkoutLink = `https://app.powercrm.com.br/checkout?h=${result.code}`;
            log('Link gerado! Salvando no CRM...');

            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ link_cotacao: checkoutLink })
            });

            if (updateRes.ok) {
                log(`Sucesso: ${lead.placa}`);
                btn.innerHTML = '✅';
                btn.className = 'sync-btn done';
                lead.link_cotacao = checkoutLink; // Atualiza localmente
            } else {
                throw new Error('Erro ao salvar no Supabase');
            }
        } else {
            throw new Error('Logue no PowerCRM em outra aba');
        }
    } catch (error) {
        log(`ERRO: ${error.message}`);
        btn.disabled = false;
        btn.innerHTML = '⚡';
    }
}
