document.addEventListener("DOMContentLoaded", function() {
  const skillSelect = document.getElementById('skill-select');
  const skillLevel = document.getElementById('skill-level');
  const btnAdd = document.getElementById('btn-add-skill');
  const listContainer = document.getElementById('skills-list-container');
  const emptyMsg = document.getElementById('empty-msg');
  const form = document.getElementById('perfil-form');
  const messageDiv = document.getElementById('form-message');

  let skillsAdicionadas = []; // Array para guardar as skills temporariamente

  // 1. Função para adicionar Skill na lista visual
  btnAdd.addEventListener('click', function() {
      const id = skillSelect.value;
      // Pega o texto do select (ex: "Java")
      const nome = skillSelect.options[skillSelect.selectedIndex].text;
      const nivel = skillLevel.value;

      if (!id || !nivel) {
          alert("Selecione uma skill e defina o nível (%)");
          return;
      }

      if (nivel < 0 || nivel > 100) {
          alert("O nível deve ser entre 0 e 100.");
          return;
      }

      // Verifica se já adicionou essa skill
      if (skillsAdicionadas.find(s => s.id === id)) {
          alert("Você já adicionou esta skill.");
          return;
      }

      // Adiciona ao array
      skillsAdicionadas.push({ id: id, nivel: nivel });

      // Atualiza HTML
      renderSkills();
      
      // Limpa inputs
      skillSelect.value = "";
      skillLevel.value = "";
  });

  function renderSkills() {
      // Controla a mensagem de "vazio"
      if (skillsAdicionadas.length > 0) {
          emptyMsg.style.display = 'none';
      } else {
          emptyMsg.style.display = 'block';
      }
      
      // Filtra para remover a mensagem de vazio do HTML gerado e recria a lista
      const skillsHtml = skillsAdicionadas.map((skill, index) => {
          // Busca o nome da skill no select original para exibir na lista
          const option = document.querySelector(`option[value="${skill.id}"]`);
          const nomeSkill = option ? option.text : 'Skill';

          return `
          <div class="skill-item fade-in">
              <div>
                  <strong>${nomeSkill}</strong> 
                  <span class="badge bg-success ms-2">${skill.nivel}%</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeSkill(${index})" title="Remover">
                  <i class="fas fa-trash"></i>
              </button>
          </div>
          `;
      }).join('');
      
      // Mantém a div de mensagem vazia e adiciona os itens
      listContainer.innerHTML = `<p class="text-muted text-center small mt-4" id="empty-msg" style="display: ${skillsAdicionadas.length === 0 ? 'block' : 'none'}">Nenhuma habilidade adicionada.</p>` + skillsHtml;
  }

  // Função global para remover skill (precisa estar no window para o onclick funcionar)
  window.removeSkill = function(index) {
      skillsAdicionadas.splice(index, 1);
      renderSkills();
  }

  // 2. Envio do Formulário para a API
  form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;
      const btn = form.querySelector('button[type="submit"]');
      
      // Bloqueia botão
      btn.disabled = true;
      const textoOriginal = btn.innerHTML;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

      const dados = {
          resumo: document.getElementById('resumo').value,
          linkedin: document.getElementById('linkedin').value,
          github: document.getElementById('github').value,
          skills: skillsAdicionadas // Envia o array de objetos
      };

      try {
          const response = await fetch('/auth/api/completar-perfil/', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken
              },
              body: JSON.stringify(dados)
          });

          if (response.ok) {
              // Sucesso: Redireciona para o Dashboard
              window.location.href = "/auth/dashboard-aluno/";
          } else {
              const data = await response.json();
              messageDiv.innerHTML = `<div class="alert alert-danger">${data.message || 'Erro ao salvar dados.'}</div>`;
              btn.disabled = false;
              btn.innerHTML = textoOriginal;
          }
      } catch (error) {
          console.error(error);
          messageDiv.innerHTML = `<div class="alert alert-danger">Erro de conexão com o servidor.</div>`;
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
      }
  });
});