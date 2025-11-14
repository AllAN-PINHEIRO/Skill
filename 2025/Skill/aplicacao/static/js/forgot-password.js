document.addEventListener("DOMContentLoaded", function() {

  const forgotForm = document.getElementById("forgot-form");
  const messageDiv = document.getElementById("form-message");

  // Pega o Token CSRF que o Django colocou no HTML
  const csrfToken = forgotForm.querySelector('input[name="csrfmiddlewaretoken"]').value;

  forgotForm.addEventListener("submit", async function(event) {
      
      event.preventDefault(); 
      
      const email = document.getElementById("email").value;
      const submitButton = forgotForm.querySelector('button[type="submit"]');

      // Desabilita o botão para evitar cliques duplos
      submitButton.disabled = true;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      messageDiv.innerHTML = ""; // Limpa mensagens antigas

      try {
          // Chama a API que "corrige" em views_contas.py
          const response = await fetch('/auth/api/forgot-password/', {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "X-CSRFToken": csrfToken
              },
              body: JSON.stringify({ email: email })
          });

          const data = await response.json();

          if (response.ok) {
             // Mostra a mensagem de erro retornada pela API
             // A API SEMPRE retorna 200 (OK) por segurança.
            // Apenas mostramos a mensagem de sucesso que ela envia.
            messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
            forgotForm.reset(); // Limpa o formulário
          } else {
            // Mostra a mensagem de erro
            const errorMessage = data.message || data.detail || 'Ocorreu um erro. Tente novamente.';
            messageDiv.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;
          }  

      } catch (erro) {
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
      } finally {
          // Reabilita o botão
          submitButton.disabled = false;
          submitButton.innerHTML = 'Enviar Link';
      }
  });
});