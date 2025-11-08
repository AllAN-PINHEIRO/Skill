// Em aplicacao/static/js/register.js

// Espera o HTML carregar antes de rodar o script
document.addEventListener("DOMContentLoaded", function() {

    const registerForm = document.getElementById("register-form");
    const messageDiv = document.getElementById("form-message");
  
    // Pega o Token CSRF que o Django colocou no HTML
    const csrfToken = registerForm.querySelector('input[name="csrfmiddlewaretoken"]').value;
  
    registerForm.addEventListener("submit", async function(event) {
        
        // Impede o formulário de recarregar a página
        event.preventDefault(); 
        
        // Pega os valores dos inputs
        const nome = document.getElementById("nome").value;
        const email = document.getElementById("email").value;
        const confirmEmail = document.getElementById("confirm-email").value;
        const matricula = document.getElementById("matricula").value;
        const campus = document.getElementById("campus").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm-password").value;
        
        // "Correção": Pega o valor do "Tipo de Conta" (Aluno ou Professor)
        const tipo = document.querySelector('input[name="tipo"]:checked').value;
  
        // Limpa mensagens de erro antigas
        messageDiv.innerHTML = "";
  
        // Envia o JSON para a API de cadastro
        try {
            // A "Correção": A URL agora aponta para a API, não para a página
            const response = await fetch('/auth/api/register/', {
                method: "POST",
                // Envia os cabeçalhos corretos (Segurança do Django)
                headers: { 
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                // Envia os dados no corpo como JSON
                body: JSON.stringify({ 
                    nome: nome,
                    email: email,
                    confirmEmail: confirmEmail,
                    matricula: matricula,
                    campus: campus,
                    password: password,
                    confirmPassword: confirmPassword,
                    tipoDoCadastro: tipo // "Correção": Envia o tipo (1 ou 2)
                })
            });
  
            const data = await response.json();
  
            if (response.ok) { // Status 201 (Sucesso)
                messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
                
                // Limpa o formulário e redireciona para o login após 2 segundos
                registerForm.reset();
                setTimeout(() => {
                    // Esta é a URL da PÁGINA de login
                    window.location.href = "/auth/login/"; 
                }, 2000);
  
            } else { // Status 400 (Erro de validação)
                // O DRF envia um objeto de erros, vamos formatá-lo
                let errorHtml = '';
                if (typeof data === 'object') {
                    for (const key in data) {
                        // data[key] é um array, então pegamos o primeiro erro
                        errorHtml += `<p class="mb-1">${data[key][0]}</p>`; 
                    }
                } else {
                    errorHtml = data.message || 'Erro desconhecido.';
                }
                messageDiv.innerHTML = `<div class="alert alert-danger">${errorHtml}</div>`;
            }
  
        } catch (erro) {
            // Este é o erro que você estava vendo: "Unexpected token '<'"
            if (erro.message.includes("Unexpected token '<'")) {
                messageDiv.innerHTML = `<div class="alert alert-danger"><b>Erro Crítico de Roteamento:</b> O servidor enviou HTML em vez de JSON. Verifique os arquivos 'urls.py'.</div>`;
            } else {
                messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
            }
        }
    });
  });