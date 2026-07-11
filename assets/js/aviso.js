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

        // Load customer data from localStorage
        document.addEventListener('DOMContentLoaded', function() {
            // Hide loading screen after 2 seconds
            setTimeout(function() {
                document.getElementById('loadingScreen').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
            }, 2000);

            // Load customer data from localStorage
            const customerDataStr = localStorage.getItem('customerData');
            if (customerDataStr) {
                try {
                    const customerData = JSON.parse(customerDataStr);
                    
                    // Update all customer data fields
                    document.getElementById('customerName').textContent = customerData.nome || 'Nome não encontrado';
                    document.getElementById('customerCpf').textContent = customerData.cpf || 'CPF não encontrado';
                    
                    // Format birth date
                    if (customerData.data_nascimento) {
                        const dateParts = customerData.data_nascimento.includes(' ') ? 
                            customerData.data_nascimento.split(' ')[0].split('-') : 
                            customerData.data_nascimento.split('-');
                        
                        if (dateParts.length === 3) {
                            document.getElementById('customerBirthDate').textContent = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                        } else {
                            document.getElementById('customerBirthDate').textContent = customerData.data_nascimento;
                        }
                    } else {
                        document.getElementById('customerBirthDate').textContent = 'Data não disponível';
                    }
                } catch (e) {
                    // Redirect to home if no valid data
            setTimeout(() => {
                window.location.href = buildUrlWithParams('index.html');
            }, 3000);
                }
            } else {
                // Redirect to home if no data found
                setTimeout(() => {
                    window.location.href = buildUrlWithParams('index.html');
                }, 3000);
            }
        });
