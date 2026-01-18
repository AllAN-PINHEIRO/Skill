document.addEventListener("DOMContentLoaded", () => {
  SPA.init();
});

const SPA = {
  // Mapa de Rotas
  routes: {
      'home': '/auth/partial/home/',
      'perfil': '/auth/partial/perfil/',
      'editar': '/auth/partial/editar/'
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

  // --- 4. Gráfico ---
  initChart: function() {
      const ctx = document.getElementById('skillsChart');
      const labelsTag = document.getElementById('chart-labels');
      const dataTag = document.getElementById('chart-data');

      if (!ctx || !labelsTag || !dataTag) return;
      if (this.chartInstance) this.chartInstance.destroy();

      this.chartInstance = new Chart(ctx, {
          type: 'radar',
          data: {
              labels: JSON.parse(labelsTag.textContent),
              datasets: [{
                  label: 'Nível',
                  data: JSON.parse(dataTag.textContent),
                  backgroundColor: 'rgba(25, 135, 84, 0.2)',
                  borderColor: '#198754',
                  borderWidth: 2,
                  pointBackgroundColor: '#fff',
                  pointBorderColor: '#198754'
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } },
              plugins: { legend: { display: false } }
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