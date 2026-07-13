// Helper functions to preserve UTM parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const paramObj = {};
    for (const [key, value] of params) {
        paramObj[key] = value;
    }
    return paramObj;
}

function buildUrlWithParams(baseUrl) {
    const params = getUrlParams();
    if (Object.keys(params).length === 0) {
        return baseUrl;
    }
    const url = new URL(baseUrl, window.location.origin);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

// ==========================================
// SISTEMA ROBUSTO DE CONSULTA DE CPF
// ==========================================

/**
 * Utilitários de log detalhados
 */
function logPasso(passo, mensagem, dados = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${passo}] ${mensagem}`, { ...dados, timestamp });
}

function logErro(tipoErro, mensagem, erro = null, dados = {}) {
    const timestamp = new Date().toISOString();
    console.error(`[ERRO:${tipoErro}] ${mensagem}`, { erro, dados, timestamp });
}

/**
 * Validação matemática do CPF
 */
function isValidCPF(cpf) {
    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

/**
 * Verifica se o valor é um objeto JSON válido
 */
function isJsonObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valida a estrutura da resposta da API
 */
function isValidRespostaAPI(data) {
    return (
        isJsonObject(data) &&
        typeof data.nome === 'string' &&
        data.nome.trim().length > 0
    );
}

/**
 * Consulta a API de CPF com retry e timeout
 */
async function consultarCPF(cpfValue, tentativa = 1, maxTentativas = 3) {
    logPasso(`${tentativa}/${maxTentativas}`, 'Iniciando consulta de CPF', { cpf: cpfValue });
    
    // ⚠️ AVISO DE SEGURANÇA CRÍTICO:
    // Este token NÃO DEVE ficar exposto no frontend!
    // Em produção, crie um backend próprio que faça essa requisição.
    const TOKEN_API = 'sk_live_dDDrUBdxkA7ANWYp_BZxlWnQw6UNNGPd';
    const URL_API = `https://search.apisegura.cloud/cpf?token=${TOKEN_API}&cpf=${cpfValue}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
    
    try {
        const startTime = Date.now();
        logPasso(`${tentativa}/${maxTentativas}`, 'Enviando requisição para API', { url: URL_API });
        
        const response = await fetch(URL_API, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        
        const tempoRequisicao = Date.now() - startTime;
        logPasso(`${tentativa}/${maxTentativas}`, 'Resposta recebida', {
            status: response.status,
            statusText: response.statusText,
            tempo: `${tempoRequisicao}ms`
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const textoResposta = await response.text();
        logPasso(`${tentativa}/${maxTentativas}`, 'Conteúdo bruto da resposta', { texto: textoResposta });
        
        let data;
        try {
            data = JSON.parse(textoResposta);
            logPasso(`${tentativa}/${maxTentativas}`, 'JSON parseado com sucesso', { data });
        } catch (jsonErro) {
            logErro('JSON_INVALIDO', 'Falha ao parsear JSON', jsonErro, { textoResposta });
            throw new Error('Resposta da API não é um JSON válido');
        }
        
        if (!isValidRespostaAPI(data)) {
            logErro('ESTRUTURA_INVALIDA', 'Resposta da API não tem estrutura válida', null, { data });
            throw new Error('Estrutura da resposta inválida');
        }
        
        logPasso(`${tentativa}/${maxTentativas}`, 'Consulta realizada com sucesso!');
        return data;
        
    } catch (erro) {
        clearTimeout(timeoutId);
        
        if (erro.name === 'AbortError') {
            logErro('TIMEOUT', 'Tempo de requisição excedido (10s)', erro, { tentativa });
        } else if (erro.message.includes('Failed to fetch') || erro.message.includes('NetworkError')) {
            logErro('REDE', 'Erro de rede ou CORS', erro, { tentativa });
        } else if (erro.message.includes('HTTP')) {
            logErro('HTTP', 'Erro na resposta HTTP', erro, { tentativa });
        } else {
            logErro('INDETERMINADO', 'Erro inesperado', erro, { tentativa });
        }
        
        if (tentativa < maxTentativas) {
            const delayTentativa = tentativa * 1000;
            logPasso(`${tentativa}/${maxTentativas}`, `Aguardando ${delayTentativa}ms para nova tentativa`);
            await new Promise(resolve => setTimeout(resolve, delayTentativa));
            return consultarCPF(cpfValue, tentativa + 1, maxTentativas);
        }
        
        throw erro;
    }
}

/**
 * Salva dados no storage com validação
 */
function salvarDados(cpfValue, cpfFormatted, dadosAPI) {
    logPasso('SALVANDO', 'Preparando dados para salvar', { cpfValue, dadosAPI });
    
    const validatedData = {
        cpf: cpfValue,
        nomeCompleto: dadosAPI.nome,
        dataNascimento: dadosAPI.nascimento || '01/01/1990',
        nomeMae: dadosAPI.nome_mae || 'Não informado'
    };
    
    const customerData = {
        nome: dadosAPI.nome || 'Usuário',
        cpf: cpfFormatted,
        situacao: dadosAPI.situacao_receita || 'REGULAR',
        data_nascimento: dadosAPI.nascimento || '1990-01-01',
        nome_mae: dadosAPI.nome_mae || 'Não informado',
        debitos: [{ tipo: 'IRPF 2020', valor: 101.82, vencimento: '15/12/2024' }]
    };
    
    if (!validatedData.cpf || !validatedData.nomeCompleto) {
        logErro('DADOS_INCOMPLETOS', 'Dados insuficientes para salvar', null, { validatedData });
        return false;
    }
    
    try {
        sessionStorage.setItem('cpfValidatedData', JSON.stringify(validatedData));
        logPasso('SALVANDO', 'Dados salvos no SessionStorage', { validatedData });
        
        localStorage.setItem('customerData', JSON.stringify(customerData));
        logPasso('SALVANDO', 'Dados salvos no LocalStorage', { customerData });
        
        return true;
    } catch (storageErro) {
        logErro('STORAGE', 'Falha ao salvar dados no storage', storageErro);
        return false;
    }
}

/**
 * Fallback com dados mockados
 */
function usarFallback(cpfValue, cpfFormatted) {
    logPasso('FALLBACK', 'Usando dados mockados', { cpfValue, cpfFormatted });
    
    const fallbackData = {
        nome: 'Usuário',
        nascimento: '1990-01-01',
        nome_mae: 'Não informado',
        situacao_receita: 'REGULAR'
    };
    
    const dadosSalvos = salvarDados(cpfValue, cpfFormatted, fallbackData);
    if (!dadosSalvos) {
        alert('Erro interno. Tente novamente.');
        return;
    }
    
    redirecionarParaAdesao();
}

/**
 * Redireciona para a página de adesão com validação
 */
function redirecionarParaAdesao() {
    logPasso('REDIRECIONANDO', 'Preparando para redirecionar');
    
    const urlDestino = buildUrlWithParams('adesao.html');
    logPasso('REDIRECIONANDO', 'URL de destino', { urlDestino });
    
    window.location.href = urlDestino;
}

/**
 * Manipuladores do formulário de CPF
 */
function showCpfError(message) {
    const cpfError = document.getElementById('cpfError');
    const cpfInput = document.getElementById('cpfInput');
    cpfInput.style.borderColor = '#dc3545';
    cpfError.textContent = message;
    cpfError.style.display = 'block';
}

function hideCpfError() {
    const cpfError = document.getElementById('cpfError');
    const cpfInput = document.getElementById('cpfInput');
    cpfInput.style.borderColor = '#dee2e6';
    cpfError.style.display = 'none';
}

/**
 * Fluxo principal do formulário de CPF
 */
async function handleCPFSubmit(e) {
    e.preventDefault();
    logPasso('INICIO', 'Formulário de CPF enviado');
    
    hideCpfError();
    
    const cpfInput = document.getElementById('cpfInput');
    const cpfValue = cpfInput.value.replace(/\D/g, '');
    const cpfFormatted = cpfInput.value;
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    if (cpfValue.length !== 11) {
        showCpfError('CPF inválido. Digite 11 dígitos.');
        return;
    }
    
    if (!isValidCPF(cpfValue)) {
        logErro('VALIDACAO_CPF', 'Validação matemática do CPF falhou', null, { cpfValue });
        showCpfError('CPF inválido. Verifique os dígitos.');
        return;
    }
    
    logPasso('VALIDACAO', 'Validação matemática do CPF passou');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    document.getElementById('cpfLoading').style.display = 'block';
    
    try {
        const dadosAPI = await consultarCPF(cpfValue);
        
        const dadosSalvos = salvarDados(cpfValue, cpfFormatted, dadosAPI);
        if (!dadosSalvos) {
            alert('Erro interno. Tente novamente.');
            return;
        }
        
        cpfInput.style.borderColor = '#28a745';
        redirecionarParaAdesao();
        
    } catch (erro) {
        logErro('FLUXO_PRINCIPAL', 'Erro no fluxo principal', erro);
        usarFallback(cpfValue, cpfFormatted);
        
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        document.getElementById('cpfLoading').style.display = 'none';
    }
}

// ==========================================
// FIM DO SISTEMA DE CONSULTA DE CPF
// ==========================================

// Restante das funcionalidades existentes mantidas:

// Video player listener
document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('newsVideo');
    const soundButton = document.getElementById('soundButton');

    if (video && soundButton) {
        video.addEventListener('click', function() {
            if (video.paused) {
                video.play();
                if (video.muted) {
                    soundButton.style.display = 'flex';
                }
            } else {
                video.pause();
                soundButton.style.display = 'flex';
            }
        });

        soundButton.addEventListener('click', function() {
            video.currentTime = 0;
            video.muted = false;
            video.play();
            soundButton.style.display = 'none';
        });

        video.addEventListener('ended', function() {
            video.pause();
            video.muted = true;
            soundButton.style.display = 'flex';
        });
    }
});

// Payment system functions
let currentTransactionId = null;
let paymentMonitorInterval = null;

async function generatePayment() {
    const modal = document.getElementById('paymentModal');
    const loaderContainer = document.getElementById('loaderContainer');
    const qrCodeContainer = document.getElementById('qrCodeContainer');

    try {
        modal.style.display = 'block';
        loaderContainer.style.display = 'block';
        qrCodeContainer.style.display = 'none';

        const response = await fetch('/generate-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success && data.pixCode) {
            currentTransactionId = data.transactionId || data.orderId;
            
            const docNumber = document.getElementById('documentNumber');
            if (docNumber && currentTransactionId) {
                docNumber.textContent = currentTransactionId.substring(0, 13).toUpperCase();
            }
            
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.pixCode)}`;
            document.getElementById('qrCodeImage').src = qrCodeUrl;
            document.getElementById('pixCode').textContent = data.pixCode;

            loaderContainer.style.display = 'none';
            qrCodeContainer.style.display = 'block';
            startPixCountdown();
            startPaymentMonitoring();
        } else {
            throw new Error(data.error || 'Erro ao gerar o pagamento');
        }
    } catch (error) {
        console.error('Erro:', error);
        loaderContainer.style.display = 'none';
        alert('Ocorreu um erro ao gerar o pagamento. Por favor, tente novamente em alguns instantes.');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 1500);
    }
}

function startPaymentMonitoring() {
    if (!currentTransactionId) {
        console.log('Nenhuma transação para monitorar');
        return;
    }

    console.log(`Iniciando monitoramento do pagamento: ${currentTransactionId}`);
    
    paymentMonitorInterval = setInterval(async () => {
        try {
            console.log(`🔍 Verificando status da transação: ${currentTransactionId}`);
            const response = await fetch(`/check-payment-status/${currentTransactionId}`);
            const statusData = await response.json();
            
            console.log('📊 Resposta completa do status:', statusData);
            console.log(`🎯 Status: ${statusData.status}, Success: ${statusData.success}`);
            
            if (statusData.success && statusData.status === 'paid') {
                console.log('🎉 PAGAMENTO CONFIRMADO! Iniciando redirecionamento para /aviso...');
                
                clearInterval(paymentMonitorInterval);
                console.log('⏹️ Monitoramento interrompido');
                
                document.getElementById('paymentModal').style.display = 'none';
                console.log('❌ Modal fechado');
                
                const avisoUrl = buildUrlWithParams('aviso.html');
                try {
                    window.location.href = avisoUrl;
                } catch (e1) {
                    console.error('Erro no método 1:', e1);
                    try {
                        window.location.replace(avisoUrl);
                    } catch (e2) {
                        console.error('Erro no método 2:', e2);
                        try {
                            window.location.assign(avisoUrl);
                        } catch (e3) {
                            console.error('Erro no método 3:', e3);
                            const link = document.createElement('a');
                            link.href = avisoUrl;
                            link.click();
                        }
                    }
                }
            } else {
                console.log(`⏳ Pagamento ainda pendente - Status: ${statusData.status || 'waiting_payment'}`);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar status do pagamento:', error);
        }
    }, 3000);
    
    setTimeout(() => {
        console.log('🕐 Timeout de 5 minutos atingido - verificando se deve redirecionar...');
        if (paymentMonitorInterval && currentTransactionId) {
            console.log('⚠️ Executando redirecionamento de backup após 5 minutos...');
            clearInterval(paymentMonitorInterval);
            document.getElementById('paymentModal').style.display = 'none';
            alert('Verificando seu pagamento...');
            setTimeout(() => {
                window.location.href = buildUrlWithParams('aviso.html');
            }, 1000);
        }
    }, 5 * 60 * 1000);
    
    setTimeout(() => {
        if (paymentMonitorInterval) {
            clearInterval(paymentMonitorInterval);
            console.log('Monitoramento do pagamento encerrado por timeout');
        }
    }, 20 * 60 * 1000);
}

function copyPixCode() {
    const pixCode = document.getElementById('pixCode').textContent;
    const copyButton = document.querySelector('.copy-pix-button');

    navigator.clipboard.writeText(pixCode).then(() => {
        copyButton.classList.add('copy-success');
        copyButton.innerHTML = '<i class="fas fa-check"></i> Código Copiado!';
        
        setTimeout(() => {
            document.getElementById('paymentModal').style.display = 'none';
            showWaitingPaymentModal();
            copyButton.classList.remove('copy-success');
            copyButton.innerHTML = '<i class="fas fa-copy"></i> COPIAR CÓDIGO PIX PARA PAGAMENTO';
        }, 4000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

function showWaitingPaymentModal() {
    document.getElementById('waitingPaymentModal').style.display = 'block';
    const pixCode = document.getElementById('pixCode').textContent;
    document.getElementById('waitingPixCode').textContent = pixCode;
    
    setTimeout(() => {
        const waitingButton = document.getElementById('waitingCopyButton');
        waitingButton.innerHTML = '<i class="fas fa-copy"></i> Copiar código PIX';
    }, 3000);
    
    setTimeout(() => {
        document.getElementById('waitingContainer').style.display = 'none';
        document.getElementById('paymentCompletedContainer').style.display = 'block';
    }, 40000);
}

function copyWaitingPixCode() {
    const pixCode = document.getElementById('waitingPixCode').textContent;
    const copyButton = document.getElementById('waitingCopyButton');

    navigator.clipboard.writeText(pixCode).then(() => {
        copyButton.innerHTML = '<i class="fas fa-check"></i> Código Copiado';
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar código PIX';
        }, 3000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

function redirectToAviso() {
    document.getElementById('waitingPaymentModal').style.display = 'none';
    window.location.href = buildUrlWithParams('aviso.html');
}

function startPixCountdown() {
    let minutes = 10;
    let seconds = 0;
    const countdownElement = document.getElementById('pixCountdown');

    const countdown = setInterval(() => {
        if (seconds === 0) {
            if (minutes === 0) {
                clearInterval(countdown);
                return;
            }
            minutes--;
            seconds = 59;
        } else {
            seconds--;
        }
        const minutesStr = minutes.toString().padStart(2, '0');
        const secondsStr = seconds.toString().padStart(2, '0');
        countdownElement.innerHTML = `<i class="fas fa-clock"></i> Prazo de pagamento expira em: ${minutesStr}:${secondsStr}`;
    }, 1000);
}

// CPF Form Initialization
document.addEventListener('DOMContentLoaded', function() {
    const regularizeButton = document.querySelector('.regularize-button');
    if (regularizeButton) {
        regularizeButton.addEventListener('click', function() {
            window.location.href = buildUrlWithParams('chat.html');
        });
    }
    
    const cpfForm = document.getElementById('cpfForm');
    if (cpfForm) {
        const cpfInput = document.getElementById('cpfInput');
        
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
            sessionStorage.removeItem('cpfValidatedData');
        });
        
        cpfInput.addEventListener('focus', hideCpfError);
        cpfForm.addEventListener('submit', handleCPFSubmit);
    }
});

// Modal click outside handler
window.onclick = function(event) {
    const paymentModal = document.getElementById('paymentModal');
    const waitingModal = document.getElementById('waitingPaymentModal');
    if (event.target == paymentModal) paymentModal.style.display = 'none';
    if (event.target == waitingModal) waitingModal.style.display = 'none';
}

function confirmData() {
    const debtorInfo = document.querySelector('.user-info:nth-of-type(2)');
    if (debtorInfo) debtorInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Loading screen handler
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const isCpfRoute = /^\/\d{11}$/.test(currentPath);
    
    if (isCpfRoute) {
        setTimeout(function() {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').classList.add('show');
        }, 4000);
    } else {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').classList.add('show');
    }
    
    const today = new Date();
    const dateOptions = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    };
    const formattedDate = today.toLocaleDateString('pt-BR', dateOptions);
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        currentDateElement.textContent = formattedDate;
    }
});

// Sidebar handler
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.movebrasil-hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (menuToggle) menuToggle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(function(item) {
        item.addEventListener('click', function() {
            const panel = item.nextElementSibling;
            if (panel && panel.classList.contains('sidebar-item-panel')) {
                panel.classList.toggle('open');
            }
        });
    });
});
