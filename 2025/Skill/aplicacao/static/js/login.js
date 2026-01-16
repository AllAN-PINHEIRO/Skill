// Em aplicacao/static/js/login.js

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form')
  const messageDiv = document.getElementById('form-message')
  const csrfToken = loginForm.querySelector(
    'input[name="csrfmiddlewaretoken"]'
  ).value

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault()

    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    try {
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
        localStorage.setItem('accessToken', data.access)

        // --- LÓGICA DE REDIRECIONAMENTO ---
        let redirectUrl = '/'; // Padrão: Home

        // Usamos '==' em vez de '===' para aceitar texto ("1") ou número (1)
        if (data.user_type == 1) {
            console.log("Redirecionando para Painel de Aluno...");
            if (data.tem_perfil) {
              // Se TEM perfil, vai para o Dashboard normal
              console.log("Perfil completo. Redirecionando para Dashboard.");
              redirectUrl = '/auth/dashboard-aluno/'; 
            } else {
              // Se NÃO TEM perfil, vai para a tela de completar cadastro
              console.log("Perfil incompleto. Redirecionando para Completar Perfil.");
              redirectUrl = '/auth/completar-perfil/'; 
            }
        } else if (data.user_type == 2) {
            console.log("Redirecionando para Painel de Professor...");
            redirectUrl = '/auth/dashboard-professor/';
            console.log("Tipo de Usuário recebido:", data.user_type)
        } else {
            console.log("Tipo de usuário desconhecido, indo para Home.");
        }

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000)

      } else {
        messageDiv.innerHTML = `<div class="alert alert-danger">${data.message}</div>`
      }
    } catch (erro) {
      console.error("Erro no fetch:", erro);
      if (erro.message && erro.message.includes("Unexpected token '<'")) {
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro Crítico: Verifique as URLs.</div>`;
      } else {
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão.</div>`;
      }
    }
  })
})