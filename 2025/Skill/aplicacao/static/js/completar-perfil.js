document.addEventListener("DOMContentLoaded", function() {
    
    const btnAdd = document.getElementById('btn-add');
    const form = document.getElementById('perfil-form');
    const listaSkillsUl = document.getElementById('lista-skills');
    
    // Array para armazenar temporariamente as skills antes de enviar
    let skillsParaEnviar = [];

    // --- FUNÇÃO 1: Adicionar Skill na Lista Visual ---
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const sel = document.getElementById('skill-select');
            const inputNivel = document.getElementById('skill-level');
            
            const skillId = sel.value;
            const skillNome = sel.options[sel.selectedIndex].text;
            const nivel = inputNivel.value;
            
            // Validações
            if (!skillId) return alert("Selecione uma habilidade.");
            if (!nivel || nivel < 0 || nivel > 100) return alert("Digite um nível entre 0 e 100.");
            
            // Evita duplicatas na lista
            if (skillsParaEnviar.find(s => s.id === skillId)) {
                return alert("Essa habilidade já foi adicionada à lista.");
            }

            // Adiciona ao array lógico
            skillsParaEnviar.push({ id: skillId, nivel: nivel });
            
            // Cria o elemento HTML (Visual)
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center animate-fade-in';
            li.innerHTML = `
                <div>
                    <strong>${skillNome}</strong> 
                    <span class="badge bg-primary rounded-pill ms-2">${nivel}%</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove" data-id="${skillId}">X</button>
            `;
            
            // Adiciona evento de remover neste botão específico (Mais seguro que window.remove)
            li.querySelector('.btn-remove').addEventListener('click', function() {
                const idToRemove = this.getAttribute('data-id');
                // Remove do array
                skillsParaEnviar = skillsParaEnviar.filter(s => s.id !== idToRemove);
                // Remove do HTML
                li.remove();
            });

            listaSkillsUl.appendChild(li);
            
            // Limpa inputs
            sel.value = "";
            inputNivel.value = "";
        });
    }

    // --- FUNÇÃO 2: Enviar Formulário (Fetch) ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = form.querySelector('button[type="submit"]');
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            // AQUI ESTÁ A MELHORIA: Pega a URL de destino direto do HTML
            const redirectUrl = btnSubmit.getAttribute('data-redirect'); 

            // Feedback visual (Bloqueia botão)
            const textoOriginal = btnSubmit.innerText;
            btnSubmit.disabled = true;
            btnSubmit.innerText = "Salvando...";

            const dados = {
                resumo: document.getElementById('resumo').value,
                linkedin: document.getElementById('linkedin').value,
                github: document.getElementById('github').value,
                skills: skillsParaEnviar
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
                    // Sucesso! Redireciona para onde o HTML mandou
                    window.location.href = redirectUrl;
                } else {
                    const errorData = await response.json();
                    alert("Erro ao salvar: " + (errorData.message || "Verifique os dados."));
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = textoOriginal;
                }
            } catch (error) {
                console.error(error);
                alert("Erro de conexão com o servidor.");
                btnSubmit.disabled = false;
                btnSubmit.innerText = textoOriginal;
            }
        });
    }
});