// Espera o HTML carregar antes de rodar o script
document.addEventListener("DOMContentLoaded", function() {

    // 1. Pega o formulário
    const loginForm = document.getElementById("login-form");
    
    // 2. Pega o local de exibir mensagens
    const messageDiv = document.getElementById("form-message");

    // 3. Pega o Token CSRF (A "Segurança do Django")
    // O Django colocou o token no input <input type="hidden" name="csrfmiddlewaretoken" ...>
    const csrfToken = loginForm.querySelector('input[name="csrfmiddlewaretoken"]').value;


    // 4. Adiciona um "ouvinte" para quando o formulário for enviado
    loginForm.addEventListener("submit", async function(event) {
        
        // 5. Impede o formulário de recarregar a página (o envio MVT clássico)
        event.preventDefault(); 
        
        // 6. Pega os valores dos inputs
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        // 7. Envia o JSON para a API (o "fetch")
        try {
            // Esta é a URL da API que definimos no urls.py
            const response = await fetch('/api/login/', {
                method: "POST",
                // 8. Envia os cabeçalhos corretos
                headers: { 
                    "Content-Type": "application/json",
                    // 9. A "Segurança do Django": Envia o Token CSRF no cabeçalho
                    "X-CSRFToken": csrfToken
                },
                // 10. Envia os dados no corpo como JSON
                body: JSON.stringify({ email: email, password: password })
            });

            const data = await response.json();

            // 11. Processa a Resposta JSON
            if (response.ok) { // Status 200 (Sucesso)
                messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                
                // Redireciona para a home após 1 segundo
                setTimeout(() => {
                    // Esta é a URL da homepage que definimos no urls.py
                    window.location.href = "/"; 
                }, 1000);

            } else { // Status 400, 401, 500 (Erro)
                messageDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
            }

        } catch (erro) {
            messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
        }
    });
});
