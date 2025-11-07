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

      // Limpa mensagens de erro antigas
      messageDiv.innerHTML = "";

      // Envia o JSON para a API de cadastro
      try {
          // Esta é a URL da API que definimos no urls.py
          const response = await fetch('/auth/register/', {
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
                  confirmPassword: confirmPassword
              })
          });

          const data = await response.json();

          if (response.ok) { // Status 201 (Sucesso)
              messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
              
              // Limpa o formulário e redireciona para o login após 2 segundos
              registerForm.reset();
              setTimeout(() => {
                  // Esta é a URL da PÁGINA de login
                  window.location.href = "/login/"; 
              }, 2000);

          } else { // Status 400, 500 (Erro)
              messageDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`;
          }

      } catch (erro) {
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
      }
  });
});