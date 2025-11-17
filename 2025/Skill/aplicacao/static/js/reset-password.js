// Em aplicacao/static/js/reset-password-confirm.js

// Espera o HTML carregar antes de rodar o script
document.addEventListener("DOMContentLoaded", function() {

  const resetForm = document.getElementById("reset-form");
  const messageDiv = document.getElementById("form-message");

  // Pega o Token CSRF que o Django colocou no HTML
  const csrfToken = resetForm.querySelector('input[name="csrfmiddlewaretoken"]').value;

  resetForm.addEventListener("submit", async function(event) {
      
      event.preventDefault(); 
      
      // Pega os valores dos inputs (visíveis e ocultos)
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
      const uidb64 = document.getElementById("uidb64").value;
      const token = document.getElementById("token").value;
      
      const submitButton = resetForm.querySelector('button[type="submit"]');

      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';
      messageDiv.innerHTML = ""; 

      // Validação rápida no frontend
      if (password !== confirmPassword) {
          messageDiv.innerHTML = `<div class="alert alert-danger">As senhas não coincidem.</div>`;
          submitButton.disabled = false;
          submitButton.innerHTML = 'Redefinir Senha';
          return;
      }

      try {
          // Chama a nova API que criamos
          const response = await fetch('/auth/api/reset-password/', {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "X-CSRFToken": csrfToken
              },
              body: JSON.stringify({ 
                  password: password,
                  confirmPassword: confirmPassword,
                  uidb64: uidb64,
                  token: token
              })
          });

          const data = await response.json();

          if (response.ok) { // SUCESSO (Status 200)
               messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
               resetForm.reset();
               
               // Redireciona para o login após 2 segundos
               setTimeout(() => {
                  window.location.href = "/auth/login/"; 
               }, 2000);

          } else { // ERRO (Status 400 - ex: token inválido)
               let errorHtml = '';
               if (typeof data === 'object' && !data.message) {
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
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
      } finally {
          submitButton.disabled = false;
          submitButton.innerHTML = 'Redefinir Senha';
      }
  });
});