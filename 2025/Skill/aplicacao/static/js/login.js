// Em aplicacao/static/js/login.js

// Espera o HTML carregar antes de rodar o script
document.addEventListener('DOMContentLoaded', function () {
  // 1. Pega o formulário
  const loginForm = document.getElementById('login-form')

  // 2. Pega o local de exibir mensagens
  const messageDiv = document.getElementById('form-message')

  // 3. Pega o Token CSRF (A "Segurança do Django")
  const csrfToken = loginForm.querySelector(
    'input[name="csrfmiddlewaretoken"]'
  ).value

  // 4. Adiciona um "ouvinte" para quando o formulário for enviado
  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault()

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    try {
      // A "Correção": A URL agora aponta para a API, não para a página
      const response = await fetch('/auth/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ email: email, password: password })
      })

      const data = await response.json()

      if (response.ok) {
        messageDiv.innerHTML = `<div class="alert alert-success">${data.message}</div>`
        
        // Salva o token JWT no localStorage
        localStorage.setItem('accessToken', data.access)

        setTimeout(() => {
          // Redireciona para a homepage (/)
          window.location.href = '/'
        }, 1000)
      } else {
        messageDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`
      }
    } catch (erro) {
      // Este é o erro que você estava vendo: "Unexpected token '<'"
      if (erro.message.includes("Unexpected token '<'")) {
          messageDiv.innerHTML = `<div class="alert alert-danger"><b>Erro Crítico de Roteamento:</b> O servidor enviou HTML em vez de JSON. Verifique os arquivos 'urls.py'.</div>`;
      } else {
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${erro.message}</div>`;
      }
    }
  })
})