chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'inspectFields') {
        const fields = scanAllFields(document);
        sendResponse({ success: true, fields: fields });
    } else if (request.action === 'fillForm') {
        handleFullAutomation(request.data, sendResponse);
    }
    return true; 
});

// LOGICA DE AUTO-LOGIN 24/7
(function startup() {
    let lastUrl = location.href;
    
    // 1. Função principal de inspeção da página
    const checkState = () => {
        const isLoginPage = window.location.href.includes('powercrm.com.br/login');
        
        if (isLoginPage) {
            chrome.storage.local.get(['autoLogin'], async (result) => {
                if (result.autoLogin && result.autoLogin.active && result.autoLogin.email && result.autoLogin.pass) {
                    
                    // Verifica se já não estamos tentando logar (botão desabilitado pelo sistema)
                    const loginButton = document.querySelector('button, .btn-primary, .btn-login, #btnSub, .btn_logar, input[type="submit"]');
                    if (loginButton?.disabled || loginButton?.innerText.toLowerCase().includes('acessando') || loginButton?.value?.toLowerCase().includes('acessando')) return;

                    const emailInput = document.querySelector('input[type="text"], input[type="email"], #email');
                    const passwordInput = document.querySelector('input[type="password"], #password');

                    if (emailInput && passwordInput) {
                        // Se estiver vazio, preenche
                        if (!emailInput.value || emailInput.value !== result.autoLogin.email) {
                            logToConsole('Auto-login: Injetando credenciais...');
                            setNativeValue(emailInput, result.autoLogin.email);
                            setNativeValue(passwordInput, result.autoLogin.pass);
                        }
                        
                        // Clica sempre se os campos tiverem conteúdo (mesmo que preenchido pelo Chrome)
                        if (emailInput.value && passwordInput.value) {
                            logToConsole('Auto-login: Tudo pronto. Clicando em acessar...');
                            setTimeout(() => {
                                // Tenta o click nativo
                                loginButton.click();
                                
                                // Se for um input submit dento de um form, tenta o submit do form como fallback
                                const form = loginButton.closest('form');
                                if (form) {
                                    logToConsole('Auto-login: Enviando formulário via submit()...');
                                    form.submit();
                                }
                            }, 1000);
                        }
                    }
                }
            });
        }
        
        // Detecta se apareceu alerta de sessão expirada na tela (comum no PowerCRM)
        const expiredAlert = Array.from(document.querySelectorAll('.swal2-title, .alert')).find(el => 
            el.innerText.toLowerCase().includes('sessão expirada') || 
            el.innerText.toLowerCase().includes('vencida')
        );
        
        if (expiredAlert) {
            logToConsole('Sessão expirada detectada! Redirecionando para login...');
            window.location.href = '/login';
        }
    };

    // 2. Monitor de Mudança de URL (para SPAs)
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            checkState();
        }
    }, 2000);

    // 3. Heartbeat: Ping a cada 15 min para não deixar a sessão cair
    setInterval(() => {
        if (!window.location.href.includes('/login')) {
            logToConsole('Heartbeat: Mantendo sessão ativa...');
            fetch('/company/dashboard', { method: 'HEAD' }).catch(() => {});
        }
    }, 15 * 60 * 1000);

    // Inicialização
    setTimeout(checkState, 1500);
    logToConsole('Monitor 24/7 iniciado.');
})();

async function handleFullAutomation(data, sendResponse) {
    logToConsole('Iniciando ciclo completo de automação...');
    
    // 1. Verificar se o modal está aberto
    let modalOpened = !!document.querySelector('#nwQttnName');
    
    if (!modalOpened) {
        logToConsole('Modal fechado. Tentando abrir...');
        const btnOpen = document.querySelector('.add_card');
        if (btnOpen) {
            btnOpen.click();
            // Esperar o modal carregar (máximo 3 segundos)
            let retries = 0;
            while (!document.querySelector('#nwQttnName') && retries < 30) {
                await new Promise(r => setTimeout(r, 100));
                retries++;
            }
            modalOpened = !!document.querySelector('#nwQttnName');
        } else {
            logToConsole('ERRO: Botão "+ Nova Negociação" não encontrado.');
            sendResponse({ success: false, error: 'Botão de nova negociação não encontrado' });
            return;
        }
    }

    if (!modalOpened) {
        logToConsole('ERRO: Modal não abriu a tempo.');
        sendResponse({ success: false, error: 'Modal não abriu' });
        return;
    }

    // 2. Preencher o formulário
    logToConsole('Modal pronto. Preenchendo dados...');
    const results = {
        tipo: findAndFill(['#nwQttnVhclType', '#nwQttnVehicleType'], ['tipo de veiculo', 'tipo de veículo'], data.tipoVeiculo),
        nome: findAndFill(['#nwQttnName'], ['nome'], data.nome),
        email: findAndFill(['#nwQttnEmail'], ['email'], data.email),
        telefone: findAndFill(['#nwQttnPhone'], ['celular', 'telefone', 'phone'], data.telefone),
        placa: findAndFill(['#nwQttnPlates'], ['placa', 'plates'], data.placa),
        marca: findAndFill(['#nwQttnBrand', '[name="brand"]'], ['marca', 'brand'], data.marca),
        modelo: findAndFill(['#nwQttnModel', '[name="model"]'], ['modelo', 'model'], data.modelo),
        ano: findAndFill(['#nwQttnYear', '[name="year"]'], ['ano', 'year'], data.ano),
        estado: findAndFill(['#nwQttnState'], ['estado', 'state', 'uf'], data.uf),
        cidade: findAndFill(['#nwQttnCity', '[name="city"]'], ['cidade', 'city'], data.cidade),
        origem: findAndFill(['#nwPlanLeadOrigem'], ['origem'], '22633')
    };

    const successCount = Object.values(results).filter(v => v === true).length;
    logToConsole(`Preenchimento concluído: ${successCount} campos.`);

    // 3. Aguardar gatilhos de consulta (placa, etc) se necessário
    // Aumentado para 2 segundos para dar tempo do PowerCRM processar
    if (data.placa) {
        logToConsole('Aguardando gatilhos de placa e cálculos...');
        await new Promise(r => setTimeout(r, 2000));
    } else {
        await new Promise(r => setTimeout(r, 800));
    }

    // 4. Salvar automaticamente
    logToConsole('Tentando salvar negociação...');
    
    // Procura o botão em todos os frames
    const btnSave = findInAllFrames(document, (doc) => doc.querySelector('#nwQttnSaveBttn'));

    if (btnSave) {
        logToConsole('Botão Salvar encontrado. Clicando...');
        
        // Simulação de clique mais forte
        btnSave.focus();
        btnSave.click();
        
        // Tenta também via dispatchEvent se o click simples falhar silenciosamente
        btnSave.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btnSave.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        
        logToConsole('Comando de salvar enviado!');
        sendResponse({ success: true, details: results, saved: true });
    } else {
        logToConsole('AVISO: Botão Salvar não encontrado após busca completa.');
        sendResponse({ success: true, details: results, saved: false });
    }
}

function logToConsole(msg) {
    console.log(`[TopBrasil Bridge] ${msg}`);
}

function scanAllFields(doc) {
    let fields = [];
    const iframes = doc.querySelectorAll('iframe');
    
    // Tentar ler do documento principal
    const inputs = doc.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        fields.push(extractFieldInfo(doc, input));
    });

    // Recursão para Iframes
    iframes.forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                fields = fields.concat(scanAllFields(iframeDoc));
            }
        } catch (e) {}
    });

    return fields;
}

function extractFieldInfo(doc, input) {
    let labelText = '';
    if (input.id) {
        const label = doc.querySelector(`label[for="${input.id}"]`);
        if (label) labelText = label.innerText.trim();
    }
    if (!labelText) {
        const parentLabel = input.closest('label');
        if (parentLabel) labelText = parentLabel.innerText.slice(0, 50).trim();
    }
    return {
        tag: input.tagName.toLowerCase(),
        id: input.id || 'sem-id',
        name: input.name || 'sem-nome',
        placeholder: input.placeholder || '',
        label: labelText || 'sem-label'
    };
}

function findAndFill(selectors, labelKeywords, value) {
    if (!value) return false;

    // 1. Tentar por Seletores Diretos em todos os frames
    for (const selector of selectors) {
        const el = findInAllFrames(document, (doc) => doc.querySelector(selector));
        if (el) {
            setNativeValue(el, value);
            return true;
        }
    }

    // 2. Tentar por Label/Texto (Busca Inteligente)
    const elByLabel = findInAllFrames(document, (doc) => {
        const allInputs = doc.querySelectorAll('input, select, textarea');
        for (const input of allInputs) {
            let labelMsg = '';
            if (input.id) {
                const l = doc.querySelector(`label[for="${input.id}"]`);
                if (l) labelMsg = l.innerText.toLowerCase();
            }
            if (!labelMsg) {
                const pl = input.closest('label');
                if (pl) labelMsg = pl.innerText.toLowerCase();
            }
            if (!labelMsg) {
                labelMsg = (input.placeholder || input.name || '').toLowerCase();
            }

            if (labelKeywords.some(kw => labelMsg.includes(kw))) {
                return input;
            }
        }
        return null;
    });

    if (elByLabel) {
        setNativeValue(elByLabel, value);
        return true;
    }

    return false;
}

function findInAllFrames(doc, searchFn) {
    const found = searchFn(doc);
    if (found) return found;

    const iframes = doc.querySelectorAll('iframe');
    for (const iframe of iframes) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                const inFrame = findInAllFrames(iframeDoc, searchFn);
                if (inFrame) return inFrame;
            }
        } catch (e) {}
    }
    return null;
}

function setNativeValue(element, value) {
    try {
        element.focus();

        if (element.tagName === 'SELECT') {
            let foundIndex = -1;
            for (let i = 0; i < element.options.length; i++) {
                if (element.options[i].text.toLowerCase().includes(value.toLowerCase()) || 
                    element.options[i].value.toLowerCase() === value.toLowerCase()) {
                    foundIndex = i;
                    break;
                }
            }
            if (foundIndex !== -1) {
                element.selectedIndex = foundIndex;
                element.value = element.options[foundIndex].value;
            }
        } else {
            const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
            const prototype = Object.getPrototypeOf(element);
            const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            
            if (valueSetter && valueSetter !== prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
            } else if (prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
            } else {
                element.value = value;
            }
        }
        
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        const kevt = { bubbles: true, cancelable: true, keyCode: 13, which: 13 };
        element.dispatchEvent(new KeyboardEvent('keydown', kevt));
        element.dispatchEvent(new KeyboardEvent('keypress', kevt));
        element.dispatchEvent(new KeyboardEvent('keyup', kevt));

        element.dispatchEvent(new Event('blur', { bubbles: true }));

    } catch (e) {
        console.error('[TopBrasil Bridge] Erro ao setNativeValue:', e);
    }
}
