document.addEventListener("DOMContentLoaded", () => {
  SPA.init();
});

const SPA = {
  // Mapa de Rotas
  routes: {
      'home': '/auth/partial/home/',
      'perfil': '/auth/partial/perfil/',
      'editar': '/auth/partial/editar/',
      'portfolio': '/auth/partial/portfolio/'
  },
  chartInstance: null,

  // --- 1. Inicialização ---
  init: function() {
      this.setupGlobalListeners();
      this.load('home'); // Carrega Home ao abrir
      this.setupSidebarMobile();
  },

  // --- 2. Listeners Globais (Event Delegation) ---
  setupGlobalListeners: function() {
      document.body.addEventListener('click', (e) => {
          // Navegação (data-route)
          const routeLink = e.target.closest('[data-route]');
          if (routeLink) {
              e.preventDefault();
              const page = routeLink.getAttribute('data-route');
              this.load(page);
              
              // Atualiza classe 'active' do menu
              document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
              if(routeLink.tagName === 'LI') routeLink.classList.add('active');
              return;
          }

          // Logout
          if (e.target.closest('#header-logout-btn') || e.target.closest('#btn-logout-sidebar')) {
              e.preventDefault();
              this.handleLogout();
              return;
          }

          // Botão Adicionar Skill (Formulário)
          if (e.target.closest('#btn-add-temp')) {
              this.handleAddSkillVisual();
          }
      });

      // Envio de Formulário
      document.body.addEventListener('submit', (e) => {
          if (e.target.id === 'form-ajax') {
              e.preventDefault();
              this.handleFormSubmit(e.target);
          }
      });
  },

  // --- 3. Carregamento AJAX ---
  load: async function(pageKey) {
      const container = document.getElementById('conteudo-dinamico');
      const url = this.routes[pageKey];

      if (!url) return;

      container.innerHTML = `<div class="d-flex justify-content-center mt-5"><div class="spinner-border text-success"></div></div>`;

      try {
          const response = await fetch(url);
          if (response.status === 403) { window.location.href = "/auth/login/"; return; }
          
          const html = await response.text();
          container.innerHTML = html;

          if (pageKey === 'home') this.initChart();

      } catch (error) {
          console.error(error);
          container.innerHTML = `<div class="alert alert-danger">Erro ao carregar conteúdo.</div>`;
      }
  },

  // --- 4. LÓGICA DO GRÁFICO (AGORA É DOUGHNUT) ---
  initChart: function() {
    const ctx = document.getElementById('skillsChart');
    const labelsTag = document.getElementById('chart-labels');
    const dataTag = document.getElementById('chart-data');

    if (!ctx || !labelsTag || !dataTag) return;

    // Limpa gráfico anterior se existir
    if (this.chartInstance) this.chartInstance.destroy();

    // Pega os dados
    const labels = JSON.parse(labelsTag.textContent);
    const dataValues = JSON.parse(dataTag.textContent);

    // Paleta de cores modernas para as fatias
    const backgroundColors = [
        '#10b981', // Verde Principal
        '#3b82f6', // Azul
        '#f59e0b', // Laranja
        '#ef4444', // Vermelho
        '#8b5cf6', // Roxo
        '#06b6d4'  // Ciano
    ];

    this.chartInstance = new Chart(ctx, {
        type: 'doughnut', // <--- MUDANÇA PRINCIPAL AQUI
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length), // Usa tantas cores quantas skills tiver
                borderWidth: 2,
                borderColor: '#ffffff', // Borda branca para separar as fatias
                hoverOffset: 10 // Efeito ao passar o mouse
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%', // Define o tamanho do buraco da "rosquinha"
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom', // Legenda abaixo do gráfico
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}%`;
                        }
                    }
                }
            }
        }
    });
  },

  // --- 5. Adicionar Skill (Visual) ---
  handleAddSkillVisual: function() {
      const sel = document.getElementById('skill-select');
      const lvl = document.getElementById('skill-level');
      const lista = document.getElementById('lista-skills-temp');

      if (sel.value && lvl.value) {
          const li = document.createElement('li');
          li.className = "list-group-item d-flex justify-content-between align-items-center skill-item-data";
          li.dataset.id = sel.value;
          li.dataset.nivel = lvl.value;
          li.innerHTML = `${sel.options[sel.selectedIndex].text} <span class="badge bg-primary rounded-pill">${lvl.value}%</span> <button type="button" class="btn btn-sm text-danger ms-2" onclick="this.parentElement.remove()">X</button>`;
          lista.appendChild(li);
          sel.value = ""; lvl.value = "";
      } else {
          alert("Preencha skill e nível.");
      }
  },

  // --- 6. Envio Form API ---
  handleFormSubmit: async function(form) {
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerText;
      btn.disabled = true; btn.innerText = "Salvando...";

      let skillsArr = [];
      document.querySelectorAll('.skill-item-data').forEach(item => {
          skillsArr.push({ id: item.dataset.id, nivel: item.dataset.nivel });
      });

      const dados = {
          resumo: document.getElementById('resumo').value,
          linkedin: document.getElementById('linkedin').value,
          github: document.getElementById('github').value,
          skills: skillsArr
      };
      const csrf = form.querySelector('[name=csrfmiddlewaretoken]').value;

      try {
          const res = await fetch('/auth/api/completar-perfil/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
              body: JSON.stringify(dados)
          });

          if (res.ok) this.load('home');
          else { alert('Erro ao salvar.'); btn.disabled = false; btn.innerText = originalText; }
      } catch (err) {
          alert('Erro conexão.'); btn.disabled = false; btn.innerText = originalText;
      }
  },

  // --- 7. Logout ---
  handleLogout: async function() {
      if (!confirm("Sair do sistema?")) return;
      try {
          const getCookie = (name) => { let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)'); return v ? v[2] : null; };
          await fetch('/auth/api/logout/', { method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') } });
      } finally {
          localStorage.removeItem('accessToken');
          window.location.href = "/";
      }
  },

  // --- 8. Mobile Sidebar ---
  setupSidebarMobile: function() {
      const toggle = document.getElementById('hamburgerMenu');
      const close = document.getElementById('sidebarClose');
      const sidebar = document.getElementById('sidebar');
      const toggleFn = () => { sidebar.classList.toggle('active'); document.body.classList.toggle('sidebar-open'); };
      if(toggle) toggle.addEventListener('click', toggleFn);
      if(close) close.addEventListener('click', toggleFn);
  }
};

// --- FUNÇÕES GLOBAIS PARA O MODAL DE DESTAQUE ---

let modalInstancia = null;

// 1. Função para Abrir o Modal (Vazia para criar, preenchida para editar)
window.abrirModalDestaque = function(id = '', titulo = '', descricao = '', cor = 'gray') {
    const modalEl = document.getElementById('modalDestaque');
    modalInstancia = new bootstrap.Modal(modalEl);
    
    // Preenche os campos
    document.getElementById('destaque_id').value = id;
    document.getElementById('destaque_titulo').value = titulo;
    document.getElementById('destaque_descricao').value = descricao;
    
    // Marca a cor certa
    if(cor === 'green') document.getElementById('cor_green').checked = true;
    else document.getElementById('cor_gray').checked = true;

    // Mostra/Esconde botão de excluir
    const btnExcluir = document.getElementById('btn-excluir-destaque');
    if (id) {
        btnExcluir.style.display = 'block';
        btnExcluir.onclick = () => excluirDestaque(id);
    } else {
        btnExcluir.style.display = 'none';
    }

    modalInstancia.show();
}

// 2. Lógica de Salvar (Submit do Form)
document.addEventListener('submit', async function(e) {
    if (e.target.id === 'form-destaque') {
        e.preventDefault();
        
        const dados = {
            id: document.getElementById('destaque_id').value,
            titulo: document.getElementById('destaque_titulo').value,
            descricao: document.getElementById('destaque_descricao').value,
            cor: document.querySelector('input[name="destaque_cor"]:checked').value
        };

        // Pega o token CSRF de qualquer outro form da página ou do cookie
        const csrfToken = getCookie('csrftoken');

        try {
            const response = await fetch('/auth/api/destaque/salvar/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(dados)
            });
            
            if (response.ok) {
                modalInstancia.hide();
                // Recarrega a tela de portfólio para mostrar as mudanças
                SPA.load('portfolio'); 
            } else {
                const err = await response.json();
                alert(err.message || "Erro ao salvar.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        }
    }
});

// 3. Função de Excluir
window.excluirDestaque = async function(id) {
    if(!confirm("Tem certeza que deseja excluir este card?")) return;
    
    const csrfToken = getCookie('csrftoken');
    
    try {
        const response = await fetch(`/auth/api/destaque/excluir/${id}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrfToken }
        });
        
        if (response.ok) {
            modalInstancia.hide();
            SPA.load('portfolio');
        } else {
            alert("Erro ao excluir.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
}

// Função auxiliar para pegar CSRF (caso não tenha ainda)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}