/* ============================================================
   DASHBOARD SPA - VERSÃO FINAL (ALUNO + PROFESSOR)
   ============================================================ */

   document.addEventListener("DOMContentLoaded", () => {
    SPA.init();
});

const SPA = {
    // Mapa de Rotas (URLs do Backend)
    routes: {
        // --- ROTAS DO ALUNO ---
        // 'home': '/auth/partial/home/',
        'home': '/vagas/partial/home/',
        'perfil': '/auth/partial/perfil/',
        'meu-perfil': '/contas/partial/perfil/',
        'editar': '/auth/partial/editar/',
        'portfolio': '/auth/partial/portfolio/',
        'vagas': '/vagas/partial/feed/', 
        'grade': '/vagas/partials/grade/',
        
        // --- ROTAS DO PROFESSOR ---
        'home-prof': '/vagas/partial/professor/home/', 
        'perfil-prof': '/vagas/partial/professor/perfil/', // <--- NOVA ROTA ADICIONADA
        'minhas-vagas': '/vagas/partial/professor/minhas-vagas/', 
        'criar-vaga': '/vagas/partial/professor/criar-vaga/',
    },
    
    chartInstance: null,

    // INICIALIZAÇÃO INTELIGENTE
    init: function() {
        this.setupGlobalListeners();
        this.setupSidebarMobile();

        // Verifica no HTML qual a rota inicial (Aluno ou Professor)
        const initialRoute = document.body.dataset.initialRoute || 'home';
        this.load(initialRoute);

        // [NOVO] Verifica se é o primeiro acesso do professor para abrir o modal
        this.checkFirstAccess();
    },

    // --- [NOVO] LÓGICA DE PRIMEIRO ACESSO (PROFESSOR) ---
    checkFirstAccess: function() {
        // Lê o atributo data-first-access do body (definido no HTML)
        const isFirst = document.body.dataset.firstAccess === 'true';
        
        if (isFirst) {
            const modalEl = document.getElementById('modalPerfilProfessor');
            if (modalEl) {
                // Pequeno delay para garantir que o Bootstrap carregou
                setTimeout(() => {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }, 500);
            }
        }
    },

    // --- [NOVO] SALVAR PERFIL DO PROFESSOR (AJAX) ---
    salvarPerfilProfessor: async function(event) {
        event.preventDefault();
        
        const btn = event.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true; 
        btn.innerText = "Salvando...";

        const dados = {
            bio: document.getElementById('prof_bio').value,
            telefone: document.getElementById('prof_telefone').value
        };
        
        // Garante que pega o CSRF do form atual para evitar erros
        const csrfInput = event.target.querySelector('[name=csrfmiddlewaretoken]'); 
        const csrf = csrfInput ? csrfInput.value : getCookie('csrftoken');

        try {
            // Rota correta apontando para o app 'contas' (auth)
            const response = await fetch('/auth/api/professor/salvar-perfil/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrf
                },
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                // 1. Fecha o Modal
                const modalEl = document.getElementById('modalPerfilProfessor');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                if(window.showToast) showToast("Dados salvos com sucesso!");

                // 2. ATUALIZAÇÃO INTELIGENTE DA TELA
                // Se o usuário já estiver vendo a tela de perfil, recarrega ela para mostrar os dados novos imediatamente.
                // Verifica se a rota atual no SPA é 'perfil-prof' OU se a hash da URL contém 'perfil'
                if (SPA.currentRoute === 'perfil-prof' || window.location.hash.includes('perfil')) {
                    this.load('perfil-prof'); 
                }
                
                // 3. Marca que não é mais o primeiro acesso (para não abrir modal se der F5)
                document.body.dataset.firstAccess = 'False'; 

            } else {
                if(window.showToast) showToast("Erro ao salvar. Tente novamente.", "danger");
            }
        } catch (error) {
            console.error(error);
            if(window.showToast) showToast("Erro de conexão.", "danger");
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    },

    selectedSkillsIds: [],

    setupGlobalListeners: function() {
        document.body.addEventListener('click', (e) => {
            // 1. Navegação SPA (Links com data-route)
            const routeLink = e.target.closest('[data-route]');
            if (routeLink) {
                e.preventDefault();
                const page = routeLink.getAttribute('data-route');
                this.load(page);
                
                // Atualiza classe 'active' na Sidebar
                document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
                const liPai = routeLink.closest('li');
                if(liPai) liPai.classList.add('active');
                return;
            }

            // 2. Logout Global
            if (e.target.closest('#header-logout-btn') || e.target.closest('#btn-logout-sidebar')) {
                e.preventDefault();
                this.handleLogout();
                return;
            }

            // 3. Botão Adicionar Skill (Tela Editar Perfil - Aluno)
            if (e.target.closest('#btn-add-temp')) {
                e.preventDefault();
                SPA.handleAddSkillVisual(); 
            }
        });

        // 4. Envio de Formulários via AJAX (Genérico)
        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'form-ajax') {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            }
        });

        // Listener para o FORM DE VAGA
        // LISTENER UNIFICADO DO FORMULÁRIO (CRIAR OU EDITAR)
        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'form-vaga') {
                e.preventDefault();
                this.salvarVagaUnificado(e.target);
            }
        });
    },

    // CARREGADOR DE PÁGINAS
    load: async function(pageKey) {
        const container = document.getElementById('conteudo-dinamico');
        const url = this.routes[pageKey];
        
        if (!url) {
            console.warn(`Rota não encontrada: ${pageKey}`);
            return;
        }
        
        // Spinner de Carregamento
        container.innerHTML = `<div class="d-flex justify-content-center align-items-center py-5 mt-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div></div>`;
        
        try {
            const response = await fetch(url);
            
            // Se der erro de permissão (Sessão expirada), redireciona pro login
            if (response.status === 403 || response.status === 401) { 
                window.location.href = "/auth/login/"; 
                return; 
            }
            
            const html = await response.text();
            container.innerHTML = html;
            
            // --- INICIALIZADORES ESPECÍFICOS POR PÁGINA ---
            
            // 1. Home do Aluno (Carregar Gráfico Chart.js)
            if (pageKey === 'home') {
                // Tenta chamar a função global do gráfico se existir
                if(typeof window.initSkillsChart === 'function') window.initSkillsChart();
                else if(typeof this.initChart === 'function') this.initChart();
            }
            
            // 2. Perfil/Portfólio (Carregar GitHub)
            // === AQUI ESTÁ A CORREÇÃO: Adicionei || pageKey === 'meu-perfil' ===
            if (pageKey === 'perfil' || pageKey === 'portfolio' || pageKey === 'meu-perfil') {
                
                // Pequeno delay para garantir que o HTML existe
                setTimeout(() => {
                    // Verifica se usa a função global ou interna
                    if (typeof window.carregarRepositoriosGitHub === 'function') {
                        window.carregarRepositoriosGitHub();
                    } else if (typeof this.loadGithubRepos === 'function') {
                        this.loadGithubRepos();
                    }
                }, 200);
            }

            // 3. Feed de Vagas (Ativar Filtro de Busca)
            if (pageKey === 'vagas') {
                if(typeof this.setupVagasSearch === 'function') this.setupVagasSearch(); 
            }
            
            // ----------------------------------------------

        } catch (error) {
            console.error(error);
            // Verifica se showToast existe antes de chamar
            if(typeof window.showToast === 'function') showToast("Erro ao carregar conteúdo.", "danger");
        }
    },

    // --- [ALUNO] GRÁFICO DE SKILLS ---
    initChart: function() {
        const ctx = document.getElementById('skillsChart');
        if (!ctx) return; 

        const labelsTag = document.getElementById('chart-labels');
        const dataTag = document.getElementById('chart-data');
        if (!labelsTag || !dataTag) return;

        let labels = [], dataValues = [];
        try {
            labels = JSON.parse(labelsTag.textContent);
            dataValues = JSON.parse(dataTag.textContent);
        } catch(e) { console.error(e); return; }

        if (this.chartInstance) this.chartInstance.destroy();

        // Cores do gráfico
        const backgroundColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        const total = dataValues.reduce((a, b) => a + b, 0);

        this.chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ 
                    data: dataValues, 
                    backgroundColor: backgroundColors.slice(0, labels.length), 
                    borderWidth: 0,
                    hoverOffset: 5 
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '75%', 
                layout: { padding: 10 },
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { enabled: true },
                    datalabels: { display: false } 
                }
            }
        });

        // Gera a legenda lateral personalizada
        const legendContainer = document.getElementById('custom-chart-legend');
        if (legendContainer) {
            let htmlLegend = '<ul class="chart-legend-list">';
            labels.forEach((label, i) => {
                const val = dataValues[i];
                const color = backgroundColors[i % backgroundColors.length];
                const percent = total > 0 ? Math.round((val / total) * 100) : 0;

                htmlLegend += `
                    <li class="legend-item">
                        <div class="legend-info">
                            <span class="legend-color-dot" style="background-color: ${color}"></span>
                            <span class="legend-label">${label}</span>
                        </div>
                        <div class="legend-stats">
                            <span class="legend-percent">${percent}%</span>
                            <span class="legend-value">Nível: ${val}</span>
                        </div>
                    </li>
                `;
            });
            htmlLegend += '</ul>';
            legendContainer.innerHTML = htmlLegend;
        }
    },

    // --- [GERAL] ADICIONAR SKILL VISUALMENTE (FORM) ---
    handleAddSkillVisual: function() {
        const sel = document.getElementById('skill-select');
        const lvl = document.getElementById('skill-level');
        const lista = document.getElementById('lista-skills-temp');

        if (sel && lvl && sel.value && lvl.value) {
            const existe = Array.from(lista.children).some(li => li.dataset.id === sel.value);
            if(existe) {
                if(window.showToast) showToast("Habilidade já está na lista. Edite-a.", "warning");
                return;
            }

            const li = document.createElement('li');
            li.className = "list-group-item d-flex justify-content-between align-items-center skill-item-data";
            li.dataset.id = sel.value;
            li.dataset.nivel = lvl.value;
            
            const nomeSkill = sel.options[sel.selectedIndex].text;
            
            li.innerHTML = `
                <span class="fw-500">
                    ${nomeSkill} 
                    <span class="badge bg-primary rounded-pill ms-2">${lvl.value}%</span>
                </span>
                <div>
                    <button type="button" class="btn btn-sm text-primary border-0 me-1" title="Editar" onclick="SPA.editSkillVisual(this)">
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button type="button" class="btn btn-sm text-danger border-0" title="Remover" onclick="this.closest('li').remove()">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
            `;
            
            lista.appendChild(li);
            sel.value = ""; lvl.value = ""; 
        } else {
            if(window.showToast) showToast("Selecione uma habilidade e a porcentagem.", "warning");
        }
    },

    editSkillVisual: function(btn) {
        const li = btn.closest('li');
        const id = li.dataset.id;
        const nivel = li.dataset.nivel;
        const sel = document.getElementById('skill-select');
        const lvl = document.getElementById('skill-level');
        
        sel.value = id;
        lvl.value = nivel;
        li.remove();
        lvl.focus();
    },

    // --- [GERAL] SUBMIT DE PERFIL (ALUNO) ---
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

            if (res.ok) {
                if(window.showToast) showToast("Perfil salvo com sucesso!");
                this.load('home'); 
            } else {
                if(window.showToast) showToast("Erro ao salvar.", "danger");
                btn.disabled = false; btn.innerText = originalText;
            }
        } catch (err) {
            if(window.showToast) showToast("Erro de conexão.", "danger");
            btn.disabled = false; btn.innerText = originalText;
        }
    },

    // --- [GERAL] LOGOUT ---
    handleLogout: async function() {
        if(window.abrirConfirmacao) {
            abrirConfirmacao(async () => {
                try { 
                    const csrf = getCookie('csrftoken'); 
                    await fetch('/auth/api/logout/', { method: 'POST', headers: { 'X-CSRFToken': csrf } }); 
                } 
                finally { 
                    localStorage.removeItem('accessToken'); 
                    window.location.href = "/"; 
                }
            });
        } else { 
            if(confirm("Sair?")) window.location.href = "/"; 
        }
    },

    // --- [UI] SIDEBAR MOBILE ---
    setupSidebarMobile: function() { 
        const toggle = document.getElementById('hamburgerMenu');
        const close = document.getElementById('sidebarClose');
        const sidebar = document.getElementById('sidebar');
        const toggleFn = () => { sidebar.classList.toggle('active'); document.body.classList.toggle('sidebar-open'); };
        if(toggle) toggle.addEventListener('click', toggleFn);
        if(close) close.addEventListener('click', toggleFn);
    },

    // --- [ALUNO] GITHUB CAROUSEL ---
    loadGithubRepos: async function() {
        const container = document.getElementById('github-card-container');
        if (!container) return; 

        try {
            const response = await fetch('/auth/api/github/repos/');
            const data = await response.json();

            if (data.success && data.repos.length > 0) {
                let carouselHtml = `
                    <div id="carouselGithub" class="carousel slide h-100" data-bs-ride="false">
                        <div class="carousel-inner h-100">
                `;

                data.repos.forEach((repo, index) => {
                    const activeClass = index === 0 ? 'active' : '';
                    let langColor = '#6c757d'; // Default Gray
                    if (repo.language === 'Python') langColor = '#3572A5';
                    if (repo.language === 'JavaScript') langColor = '#f1e05a';
                    if (repo.language === 'HTML') langColor = '#e34c26';
                    if (repo.language === 'Java') langColor = '#b07219';

                    carouselHtml += `
                        <div class="carousel-item ${activeClass} h-100">
                            <div class="cert-slide-content">
                                <div>
                                    <div class="gh-header mb-2">
                                        <i class="bi bi-github fs-2 line-height-1"></i>
                                        <span class="gh-title" style="font-size:1.2rem">${repo.name}</span>
                                    </div>
                                    <p class="text-muted small mb-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; min-height: 4.5em;">
                                        ${repo.description}
                                    </p>
                                    <div class="d-flex align-items-center gap-3">
                                        <div class="d-flex align-items-center">
                                            <span style="width: 10px; height: 10px; background-color: ${langColor}; border-radius: 50%; margin-right: 6px;"></span>
                                            <span class="small fw-bold text-muted">${repo.language}</span>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <i class="bi bi-star-fill text-warning small me-1"></i>
                                            <span class="small text-muted">${repo.stars}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-end w-100 mt-3">
                                    <a href="${repo.url}" target="_blank" class="btn-card-confira">Ver Código</a>
                                </div>
                            </div>
                        </div>
                    `;
                });

                carouselHtml += `</div>`; // Fecha carousel-inner
                if (data.repos.length > 1) {
                    carouselHtml += `
                        <button class="carousel-control-prev" type="button" data-bs-target="#carouselGithub" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#carouselGithub" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        </button>
                    `;
                }
                carouselHtml += `</div>`; // Fecha carousel principal
                container.innerHTML = carouselHtml;

            } else {
                let msg = "Nenhum repositório público.";
                let btnHtml = `<button class="btn-card-confira mt-3" onclick="SPA.load('editar')">Configurar</button>`;
                if(data.message === 'no_link') { msg = "Adicione seu GitHub no perfil."; }
                else if(data.message === 'user_not_found') { msg = "Usuário GitHub não encontrado."; }

                container.innerHTML = `
                    <div class="d-flex flex-column align-items-center justify-content-center h-100 text-center p-3">
                        <i class="bi bi-github display-4 mb-2 opacity-25"></i>
                        <h6 class="fw-bold mb-1">GitHub</h6>
                        <p class="small text-muted mb-0">${msg}</p>
                        ${btnHtml}
                    </div>
                `;
            }
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="d-flex align-items-center justify-content-center h-100 text-muted small">Erro ao carregar GitHub.</div>`;
        }
    },

    // --- [ALUNO] FILTRO DE VAGAS EM TEMPO REAL ---
    setupVagasSearch: function() {
        const input = document.getElementById('input-busca-vagas');
        const container = document.getElementById('lista-vagas-container');
        
        if (!input || !container) return;

        input.addEventListener('keyup', function() {
            const termo = input.value.toLowerCase();
            const cards = container.getElementsByClassName('vaga-card-item');

            Array.from(cards).forEach(card => {
                const titulo = card.querySelector('.vaga-titulo').textContent.toLowerCase();
                const empresa = card.querySelector('.vaga-empresa').textContent.toLowerCase();

                if (titulo.includes(termo) || empresa.includes(termo)) {
                    card.style.display = ""; // Mostra
                } else {
                    card.style.display = "none"; // Esconde
                }
            });
        });
    },

    // --- FUNÇÃO PARA SALVAR VAGA ---
    salvarNovaVaga: async function(form) {
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Salvando...";

        // Pega habilidades múltiplas
        const skillsSelect = document.getElementById('vaga_skills');
        const selectedSkills = Array.from(skillsSelect.selectedOptions).map(o => o.value);

        const dados = {
            empresa: document.getElementById('vaga_empresa').value,
            titulo: document.getElementById('vaga_titulo').value,
            status: document.getElementById('vaga_status').value,
            modalidade: document.getElementById('vaga_modalidade').value,
            cidade: document.getElementById('vaga_cidade').value,
            sobre: document.getElementById('vaga_sobre').value,
            skills: selectedSkills
        };
        
        const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;

        try {
            const response = await fetch('/vagas/api/professor/criar-vaga/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf},
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                const modalEl = document.getElementById('modalCriarVaga');
                bootstrap.Modal.getInstance(modalEl).hide();
                if(window.showToast) showToast("Vaga publicada!");
                this.load('minhas-vagas'); // Recarrega a lista
            } else {
                if(window.showToast) showToast("Erro ao salvar.", "danger");
            }
        } catch (e) { console.error(e); } 
        finally { btn.disabled = false; btn.innerText = "Publicar"; }
    },

    // 1. Abrir Modal para CRIAR
    abrirModalCriar: function() {
        // Limpa o form
        document.getElementById('form-vaga').reset();
        document.getElementById('vaga_id').value = ""; // Vazio = Criar
        document.getElementById('modalVagaTitulo').innerText = "Nova Oportunidade";
        document.getElementById('btnSalvarVaga').innerText = "Publicar Vaga";
        
        // Limpa skills
        this.selectedSkillsIds = [];
        this.renderSkillsUI();

        // Abre modal
        const modal = new bootstrap.Modal(document.getElementById('modalFormVaga'));
        modal.show();
    },

    // 2. Adicionar Skill Visualmente (Ao clicar no botão "Adicionar")
    adicionarSkillUI: function() {
        const select = document.getElementById('select_skills_source');
        const id = select.value;
        const nome = select.options[select.selectedIndex].text;

        if (!id) return; // Nada selecionado

        // Verifica se já não adicionou
        if (this.selectedSkillsIds.includes(id)) {
            if(window.showToast) showToast("Essa habilidade já foi adicionada.", "warning");
            return;
        }

        // Adiciona à lista e desenha na tela
        this.selectedSkillsIds.push(id);
        this.renderSkillsUI(nome, id); // Passamos nome/id para otimizar, mas a função usa o array
    },

    // 3. Renderiza as Tags de Skill na tela
    // 3. Renderiza as Tags de Skill na tela (CORRIGIDA)
    // --- Substitua a função renderSkillsUI inteira por esta ---
    renderSkillsUI: function(novoNome = null, novoId = null) {
        const container = document.getElementById('skills_container');
        
        // PROTEÇÃO 1: Se o container não existe na tela (ex: modal fechado), para aqui.
        if (!container) return;

        let msg = document.getElementById('no_skills_msg');

        // PROTEÇÃO 2: Se a mensagem sumiu, recria ela na memória para não dar erro
        if (!msg) {
            msg = document.createElement('span');
            msg.id = 'no_skills_msg';
            msg.className = 'text-muted small fst-italic w-100 text-center';
            msg.innerText = 'Nenhuma habilidade selecionada.';
        }

        // Cenário A: Lista vazia -> Mostra mensagem
        if (this.selectedSkillsIds.length === 0) {
            container.innerHTML = ''; 
            container.appendChild(msg); 
            msg.style.display = 'block';
            return;
        }

        // Cenário B: Tem skills -> Esconde mensagem
        msg.style.display = 'none';
        // Garante que a mensagem esteja no HTML (mesmo oculta) para ser achada depois
        if (!container.contains(msg)) {
            container.appendChild(msg);
        }

        // Cenário C: Adicionar nova tag visualmente
        if (novoNome && novoId) {
            const tag = document.createElement('div');
            tag.className = 'badge bg-white text-dark border d-flex align-items-center gap-2 px-3 py-2';
            tag.dataset.id = novoId;
            tag.innerHTML = `
                <span>${novoNome}</span>
                <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="SPA.removerSkillUI('${novoId}', this)"></i>
            `;
            container.appendChild(tag);
        }
    },

    // 4. Remover Skill (Ao clicar no X)
    removerSkillUI: function(id, elementoIcone) {
        // Remove do array
        this.selectedSkillsIds = this.selectedSkillsIds.filter(item => item !== id);
        // Remove do HTML
        elementoIcone.parentElement.remove();
        
        // Se ficou vazio, mostra mensagem
        if (this.selectedSkillsIds.length === 0) {
            document.getElementById('no_skills_msg').style.display = 'block';
        }
    },

    // 5. EDITAR VAGA (Carrega dados e abre modal)
    // ATENÇÃO: Adicione window.editarVaga = ... fora do SPA ou use SPA.editarVaga no HTML
    editarVaga: async function(id) {
        try {
            const response = await fetch(`/vagas/api/professor/vaga/${id}/`);
            const json = await response.json();
            
            if (json.success) {
                const data = json.data;

                // Preenche campos
                document.getElementById('vaga_id').value = data.id;
                document.getElementById('vaga_empresa').value = data.empresa;
                document.getElementById('vaga_titulo').value = data.titulo;
                document.getElementById('vaga_cidade').value = data.cidade;
                document.getElementById('vaga_modalidade').value = data.modalidade;
                document.getElementById('vaga_status').value = data.status;
                document.getElementById('vaga_sobre').value = data.sobre;

                // Preenche Skills (Lógica Especial)
                this.selectedSkillsIds = data.skills_ids.map(String); // Garante que são strings
                
                const container = document.getElementById('skills_container');
                container.innerHTML = ''; // Limpa
                
                if (data.skills_data.length > 0) {
                    data.skills_data.forEach(skill => {
                        // Recria visualmente as tags
                        const tag = document.createElement('div');
                        tag.className = 'badge bg-white text-dark border d-flex align-items-center gap-2 px-3 py-2';
                        tag.innerHTML = `
                            <span>${skill.nome}</span>
                            <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="SPA.removerSkillUI('${skill.id}', this)"></i>
                        `;
                        container.appendChild(tag);
                    });
                } else {
                     const msg = document.createElement('span');
                     msg.id = 'no_skills_msg';
                     msg.className = 'text-muted small fst-italic w-100 text-center';
                     msg.innerText = 'Nenhuma habilidade selecionada.';
                     container.appendChild(msg);
                }

                // Ajusta textos do Modal
                document.getElementById('modalVagaTitulo').innerText = "Editar Vaga";
                document.getElementById('btnSalvarVaga').innerText = "Salvar Alterações";

                // Abre Modal
                new bootstrap.Modal(document.getElementById('modalFormVaga')).show();
            }
        } catch (e) {
            console.error(e);
            if(window.showToast) showToast("Erro ao carregar vaga.", "danger");
        }
    },
    // 6. SALVAR UNIFICADO (Decide se cria ou edita)
    salvarVagaUnificado: async function(form) {
        const id = document.getElementById('vaga_id').value;
        const isEdicao = !!id; // Se tem ID, é edição
        
        const url = isEdicao 
            ? `/vagas/api/professor/editar-vaga/${id}/` 
            : `/vagas/api/professor/criar-vaga/`;

        const dados = {
            empresa: document.getElementById('vaga_empresa').value,
            titulo: document.getElementById('vaga_titulo').value,
            cidade: document.getElementById('vaga_cidade').value,
            modalidade: document.getElementById('vaga_modalidade').value,
            status: document.getElementById('vaga_status').value,
            sobre: document.getElementById('vaga_sobre').value,
            skills: this.selectedSkillsIds // Envia o array de IDs
        };

        const csrf = document.querySelector('[name=csrfmiddlewaretoken]').value;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf},
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('modalFormVaga')).hide();
                if(window.showToast) showToast(isEdicao ? "Vaga atualizada!" : "Vaga criada!");
                this.load('minhas-vagas');
            } else {
                if(window.showToast) showToast("Erro ao salvar.", "danger");
            }
        } catch (e) { console.error(e); }
    },

    // 7. VISUALIZAR VAGA (OLHO)
    verVaga: async function(id) {
        try {
            const response = await fetch(`/vagas/api/professor/vaga/${id}/`);
            const json = await response.json();
            
            if (json.success) {
                const data = json.data;
                document.getElementById('view_empresa').innerText = data.empresa;
                document.getElementById('view_titulo').innerText = data.titulo;
                document.getElementById('view_cidade').innerText = data.cidade;
                document.getElementById('view_modalidade').innerText = data.modalidade;
                document.getElementById('view_status').innerText = data.status;
                document.getElementById('view_sobre').innerText = data.sobre;

                // Skills Apenas Leitura
                const container = document.getElementById('view_skills_container');
                container.innerHTML = '';
                if(data.skills_data.length > 0) {
                    data.skills_data.forEach(s => {
                        container.innerHTML += `<span class="badge bg-secondary-subtle text-secondary border px-3">${s.nome}</span>`;
                    });
                } else {
                    container.innerHTML = '<span class="text-muted small">Sem requisitos específicos.</span>';
                }

                new bootstrap.Modal(document.getElementById('modalVerVaga')).show();
            }
        } catch (e) { console.error(e); }
    },
};


/* ============================================================
   SISTEMA DE NOTIFICAÇÕES (TOASTS) E CONFIRMAÇÃO
   ============================================================ */

window.showToast = function(mensagem, tipo = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return; 

    let bgClass = 'bg-success';
    if (tipo === 'danger') bgClass = 'bg-danger';
    if (tipo === 'warning') bgClass = 'bg-warning text-dark';

    const toastId = 'toast_' + Date.now();
    const html = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body fs-6">
                    ${tipo === 'success' ? '<i class="bi bi-check-circle-fill me-2"></i>' : '<i class="bi bi-exclamation-triangle-fill me-2"></i>'}
                    ${mensagem}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => { toastElement.remove(); });
};

let modalConfirmacaoInstancia = null;
let acaoConfirmadaCallback = null;

window.abrirConfirmacao = function(callbackAcao) {
    const modalEl = document.getElementById('modalConfirmacaoDelete');
    if (!modalConfirmacaoInstancia) modalConfirmacaoInstancia = new bootstrap.Modal(modalEl);
    acaoConfirmadaCallback = callbackAcao;
    modalConfirmacaoInstancia.show();
};

document.addEventListener('DOMContentLoaded', () => {
    const btnConfirma = document.getElementById('btnConfirmarExclusao');
    if(btnConfirma) {
        btnConfirma.addEventListener('click', () => {
            if (acaoConfirmadaCallback) acaoConfirmadaCallback();
            if (modalConfirmacaoInstancia) modalConfirmacaoInstancia.hide();
        });
    }
});


/* ============================================================
   LÓGICA DOS MODAIS (PORTFÓLIO E CERTIFICADOS)
   ============================================================ */

let modalInstancia = null;
let modalCertInstancia = null;

// --- Modal Destaque (Habilidades Especiais) ---
window.abrirModalDestaque = function(id = '', titulo = '', descricao = '', cor = 'gray') {
    const modalEl = document.getElementById('modalDestaque');
    const form = document.getElementById('form-destaque');
    
    form.reset(); 
    document.getElementById('destaque_id').value = ""; 

    if (!modalInstancia) modalInstancia = new bootstrap.Modal(modalEl);
    
    if (id) {
        document.getElementById('destaque_id').value = id;
        document.getElementById('destaque_titulo').value = titulo;
        document.getElementById('destaque_descricao').value = descricao;
        if(cor === 'green') document.getElementById('cor_green').checked = true; else document.getElementById('cor_gray').checked = true;
    }

    const btnExcluir = document.getElementById('btn-excluir-destaque');
    if (id) { 
        btnExcluir.style.display = 'block'; 
        btnExcluir.onclick = function() { abrirConfirmacao(() => excluirDestaque(id)); }; 
    }
    else { btnExcluir.style.display = 'none'; }
    modalInstancia.show();
};

// --- Modal Certificado ---
window.abrirModalCertificado = function(elemento) {
    const modalEl = document.getElementById('modalCertificado');
    const form = document.getElementById('form-certificado');

    form.reset(); 
    document.getElementById('cert_id').value = ""; 

    if (!modalCertInstancia) modalCertInstancia = new bootstrap.Modal(modalEl);
    const btnExcluir = document.getElementById('btn-excluir-cert');

    // Verifica se veio um elemento HTML ou um Objeto direto
    let dataset = null;
    if (elemento && elemento.dataset) { dataset = elemento.dataset; } 
    else if (elemento && elemento.id) { dataset = elemento; }

    if (dataset && dataset.id) {
        document.getElementById('cert_id').value = dataset.id;
        document.getElementById('cert_titulo').value = dataset.titulo;
        document.getElementById('cert_instituicao').value = dataset.instituicao;
        document.getElementById('cert_horas').value = dataset.horas;
        document.getElementById('cert_link').value = dataset.link || "";

        btnExcluir.style.display = 'block';
        const id = dataset.id;
        btnExcluir.onclick = function() { abrirConfirmacao(() => excluirCertificado(id)); };
    } else {
        btnExcluir.style.display = 'none';
    }
    modalCertInstancia.show();
};

// --- SUBMIT DOS MODAIS VIA AJAX ---
document.addEventListener('submit', async function(e) {
    const csrfToken = getCookie('csrftoken');

    // Salvar Destaque
    if (e.target.id === 'form-destaque') {
        e.preventDefault();
        const titulo = document.getElementById('destaque_titulo').value.trim();
        if(!titulo) return showToast("O título é obrigatório.", "warning");

        const dados = { 
            id: document.getElementById('destaque_id').value, 
            titulo: titulo, 
            descricao: document.getElementById('destaque_descricao').value, 
            cor: document.querySelector('input[name="destaque_cor"]:checked').value 
        };
        try { 
            await fetch('/auth/api/destaque/salvar/', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrfToken}, body: JSON.stringify(dados) }); 
            modalInstancia.hide(); SPA.load('portfolio'); showToast("Habilidade salva!"); 
        } catch(err) { showToast("Erro ao salvar.", "danger"); }
    }

    // Salvar Certificado
    if (e.target.id === 'form-certificado') {
        e.preventDefault();
        const titulo = document.getElementById('cert_titulo').value.trim();
        const instituicao = document.getElementById('cert_instituicao').value.trim();
        
        if (!titulo || !instituicao) { showToast("Preencha Nome e Instituição.", "warning"); return; }

        const dados = { 
            id: document.getElementById('cert_id').value, 
            titulo: titulo, 
            instituicao: instituicao, 
            horas: document.getElementById('cert_horas').value,
            link: document.getElementById('cert_link').value
        };

        try { 
            await fetch('/auth/api/certificado/salvar/', { method: 'POST', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrfToken}, body: JSON.stringify(dados) }); 
            modalCertInstancia.hide(); SPA.load('portfolio'); showToast("Certificado salvo!"); 
        } catch(err) { showToast("Erro ao salvar.", "danger"); }
    }
});

// --- EXCLUSÃO DE ITENS ---
window.excluirDestaque = async function(id) { 
    const csrfToken = getCookie('csrftoken'); 
    await fetch(`/auth/api/destaque/excluir/${id}/`, { method: 'POST', headers: {'X-CSRFToken': csrfToken} }); 
    modalInstancia.hide(); SPA.load('portfolio'); showToast("Habilidade excluída.");
};

window.excluirCertificado = async function(id) { 
    const csrfToken = getCookie('csrftoken'); 
    await fetch(`/auth/api/certificado/excluir/${id}/`, { method: 'POST', headers: {'X-CSRFToken': csrfToken} }); 
    modalCertInstancia.hide(); SPA.load('portfolio'); showToast("Certificado removido.");
};

window.excluirVaga = async function(id) {
    if(!confirm("Excluir esta vaga?")) return;
    const csrf = getCookie('csrftoken');
    const response = await fetch(`/vagas/api/professor/excluir-vaga/${id}/`, {
        method: 'POST', headers: {'X-CSRFToken': csrf}
    });
    if(response.ok) SPA.load('minhas-vagas');
};

// Expor funções globais para os botões onclick
window.abrirModalCriar = () => SPA.abrirModalCriar();
window.adicionarSkillUI = () => SPA.adicionarSkillUI();
window.verVaga = (id) => SPA.verVaga(id);
window.editarVaga = (id) => SPA.editarVaga(id);

// Função para desenhar o Gráfico de Skills + Legenda Detalhada
window.initSkillsChart = function() {
    const ctx = document.getElementById('skillsChart');
    const legendContainer = document.getElementById('custom-chart-legend');
    
    if (!ctx || !legendContainer) return;

    if (window.mySkillsChart) {
        window.mySkillsChart.destroy();
    }

    try {
        const labels = JSON.parse(document.getElementById('chart-labels').textContent);
        const data = JSON.parse(document.getElementById('chart-data').textContent);
        
        // 1. Calcular o TOTAL para descobrir a porcentagem da "fatia" (Share)
        // Ex: Se tem Nível 90 e Nível 10, o total é 100. O de 90 vale 90%.
        const total = data.reduce((acc, curr) => acc + Number(curr), 0);

        const colors = [
            '#198754', // Verde (CSS)
            '#0d6efd', // Azul (HTML)
            '#ffc107', // Amarelo (JS)
            '#dc3545', // Vermelho (C#)
            '#0dcaf0', '#6f42c1', '#fd7e14'
        ];

        // 2. Criar o Gráfico
        window.mySkillsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data, // Usa os níveis reais para desenhar o tamanho
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                // Tooltip mostra o Nível Real
                                return ` Nível: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });

        // 3. Gerar a Legenda Detalhada (Porcentagem + Nível)
        legendContainer.innerHTML = '';
        
        labels.forEach((label, index) => {
            const nivelReal = Number(data[index]);
            const color = colors[index % colors.length];
            
            // Cálculo da Porcentagem "da Pizza" (Participação)
            // (Nível / Total) * 100
            let sharePercent = 0;
            if (total > 0) {
                sharePercent = Math.round((nivelReal / total) * 100);
            }

            const item = document.createElement('div');
            item.className = 'd-flex justify-content-between align-items-center mb-3 border-bottom pb-2'; // Adicionei espaçamento
            
            // LADO ESQUERDO: Bolinha + Nome
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%;"></span>
                    <span class="fw-bold text-dark small">${label}</span>
                </div>
                
                <div class="text-end lh-1">
                    <div class="fw-bold text-dark h6 mb-0">${sharePercent}%</div>
                    <small class="text-muted" style="font-size: 0.65rem;">Nível: ${nivelReal}</small>
                </div>
            `;
            
            legendContainer.appendChild(item);
        });

    } catch (e) { 
        console.error("Erro ao montar gráfico:", e); 
    }
};

/* ==========================================================================
   LÓGICA DE VAGAS (MODAIS, DETALHES E CANDIDATURA)
   ========================================================================== */

// Variável global para armazenar o ID da vaga atual
let vagaSelecionadaId = null;

/**
 * 1. FUNÇÃO PARA VER DETALHES (Botão Olho)
 * Busca dados da API e configura o botão com base no MATCH
 */
window.verDetalhesVaga = async function(id) {
    const modalEl = document.getElementById('modalDetalhesVaga');
    
    // Verificação de Segurança (Evita erro de backdrop)
    if (!modalEl) {
        console.error("ERRO: Modal 'modalDetalhesVaga' não encontrado.");
        return; 
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Referências aos elementos do DOM
    const elTitulo = document.getElementById('modal-vaga-titulo');
    const elEmpresa = document.getElementById('modal-vaga-empresa');
    const elDescricao = document.getElementById('modal-vaga-descricao');
    const elSkills = document.getElementById('modal-vaga-skills');
    const elTag = document.getElementById('modal-vaga-tag');
    const btnCandidatar = document.getElementById('btn-candidatar-modal');

    // Reset visual enquanto carrega
    elTitulo.innerText = "Carregando...";
    elEmpresa.innerText = "...";
    elDescricao.innerText = "Buscando informações...";
    elSkills.innerHTML = "";
    elTag.innerText = "...";
    
    // Desabilita botão enquanto carrega
    btnCandidatar.className = "btn btn-light border rounded-pill px-4 disabled";
    btnCandidatar.innerText = "Aguarde...";

    try {
        const response = await fetch(`/vagas/api/vaga/${id}/detalhes/`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Preenche dados básicos
        elTitulo.innerText = data.titulo;
        elEmpresa.innerText = `${data.empresa} • ${data.cidade}`;
        elDescricao.innerText = data.descricao;
        elTag.innerText = data.tipo; // Ex: Júnior, Estágio

        // Ajuste de cor da Tag (Estético)
        if(data.tipo === 'ESTAGIO') {
            elTag.className = "badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-2 fw-bold shadow-sm";
            elTag.innerText = "Estágio";
        } else {
            elTag.className = "badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-3 py-2 fw-bold shadow-sm";
        }

        // Renderiza Skills
        elSkills.innerHTML = '';
        if (data.skills && data.skills.length > 0) {
            data.skills.forEach(skill => {
                elSkills.innerHTML += `<span class="badge bg-light text-dark border fw-normal shadow-sm">${skill}</span>`;
            });
        } else {
            elSkills.innerHTML = '<span class="text-muted small">Sem requisitos específicos.</span>';
        }

        // =========================================================
        // AQUI ESTÁ A CORREÇÃO DE SEGURANÇA (BLOQUEIO POR MATCH)
        // =========================================================
        const MATCH_MINIMO = 75; // 75%

        // CASO 1: Usuário já se candidatou
        if (data.ja_candidatou) {
            btnCandidatar.className = "btn btn-secondary rounded-pill px-4 fw-bold disabled";
            btnCandidatar.innerHTML = "<i class='bi bi-check-circle-fill me-2'></i> Já Candidatado";
            btnCandidatar.disabled = true;
            btnCandidatar.onclick = null;
        } 
        // CASO 2: Match Baixo (Bloqueia o botão mesmo dentro do modal)
        else if (data.match_percent < MATCH_MINIMO) {
            btnCandidatar.className = "btn btn-light text-muted border rounded-pill px-4 fw-bold disabled cursor-not-allowed opacity-75";
            // Mostra o motivo do bloqueio
            btnCandidatar.innerHTML = `<i class='bi bi-lock-fill me-2'></i> Requisitos Insuficientes (${data.match_percent}%)`;
            btnCandidatar.disabled = true;
            btnCandidatar.onclick = null;
        } 
        // CASO 3: Liberado
        else {
            btnCandidatar.className = "btn btn-success rounded-pill px-4 fw-bold hover-scale shadow-sm";
            btnCandidatar.innerHTML = "🚀 Quero me candidatar";
            btnCandidatar.disabled = false;
            
            // Define a ação de clique
            btnCandidatar.onclick = () => {
                modal.hide(); // Fecha detalhes
                candidatarVaga(id); // Abre confirmação
            };
        }

    } catch (e) {
        console.error(e);
        elDescricao.innerHTML = `<span class="text-danger">Erro ao carregar: ${e.message}</span>`;
    }
};

/**
 * 2. FUNÇÃO PARA ABRIR O MODAL DE CONFIRMAÇÃO
 */
window.candidatarVaga = function(id) {
    vagaSelecionadaId = id;
    
    const modalEl = document.getElementById('modalConfirmarCandidatura');
    if (!modalEl) return; 

    // Tenta pegar o nome da vaga visualmente para por no texto (Opcional)
    const cardEl = document.querySelector(`.vaga-item button[onclick*="${id}"]`)?.closest('.vaga-item');
    // Se achou o card, pega o título, senão usa texto genérico
    const tituloVaga = cardEl ? cardEl.dataset.texto.split(' ')[0] + "..." : "esta oportunidade"; 
    
    const labelVaga = document.getElementById('nome-vaga-confirmar');
    if(labelVaga) labelVaga.innerText = tituloVaga;

    // Reseta estados visuais
    document.getElementById('step-confirmacao').classList.remove('d-none');
    document.getElementById('step-loading').classList.add('d-none');
    document.getElementById('step-sucesso').classList.add('d-none');
    document.getElementById('step-erro').classList.add('d-none');

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Vincula o botão "Sim"
    document.getElementById('btn-confirma-envio').onclick = processarEnvioCandidatura;
};

/**
 * 3. FUNÇÃO QUE FAZ O POST (ENVIA A CANDIDATURA)
 */
async function processarEnvioCandidatura() {
    if (!vagaSelecionadaId) return;

    // Muda para Loading
    document.getElementById('step-confirmacao').classList.add('d-none');
    document.getElementById('step-loading').classList.remove('d-none');

    try {
        const csrftoken = getCookie('csrftoken'); 

        const response = await fetch(`/vagas/api/vaga/${vagaSelecionadaId}/candidatar/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        // Tira Loading
        document.getElementById('step-loading').classList.add('d-none');

        if (data.success) {
            // Sucesso Visual
            document.getElementById('step-sucesso').classList.remove('d-none');
            
            // Fecha e recarrega após 2s
            setTimeout(() => {
                const modalEl = document.getElementById('modalConfirmarCandidatura');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
                
                // Recarrega a lista para atualizar os botões na tela principal
                if(typeof SPA !== 'undefined') SPA.load('vagas'); 
            }, 2000);

        } else {
            // Erro de Regra (ex: Já candidatou)
            document.getElementById('step-erro').classList.remove('d-none');
            const msgErro = document.getElementById('msg-erro-candidatura');
            if(msgErro) msgErro.innerText = data.message;
        }

    } catch (e) {
        console.error(e);
        document.getElementById('step-loading').classList.add('d-none');
        document.getElementById('step-erro').classList.remove('d-none');
        const msgErro = document.getElementById('msg-erro-candidatura');
        if(msgErro) msgErro.innerText = "Erro de conexão.";
    }
}

//* ==========================================================================
/*LÓGICA DO PROFESSOR (GRADE E AVALIAÇÃO)
========================================================================== */
let candidatoAtualId = null;

// 1. Abrir Modal de Avaliação
window.abrirModalAvaliacao = async function(id) {
 candidatoAtualId = id;
 const modalEl = document.getElementById('modalAvaliarCandidato');
 const modal = new bootstrap.Modal(modalEl);
 modal.show();

 // Refs
 const elNome = document.getElementById('modal-nome-aluno');
 const elSkills = document.getElementById('modal-skills-list');
 const btnAprovar = document.getElementById('btn-aprovar-candidato'); 
 const btnReprovar = document.getElementById('btn-reprovar-candidato'); 

 // Reset visual
 elNome.innerText = "Carregando...";
 elSkills.innerHTML = '<div class="spinner-border spinner-border-sm"></div>';
 
 // Reseta Botões (Habilita tudo inicialmente)
 btnAprovar.disabled = false;
 btnAprovar.className = "btn btn-success w-100 py-2 rounded-pill fw-bold shadow-sm";
 btnAprovar.innerHTML = "Aprovar Candidato";

 btnReprovar.disabled = false;
 btnReprovar.className = "btn btn-outline-danger w-100 py-2 rounded-pill fw-bold";
 btnReprovar.innerHTML = "Recusar";

 try {
     const response = await fetch(`/vagas/api/candidatura/${id}/detalhes/`);
     const data = await response.json();

     elNome.innerText = data.nome_aluno;
     document.getElementById('modal-nome-vaga').innerText = data.nome_vaga;
     document.getElementById('modal-nome-empresa').innerText = data.nome_empresa;
     
     // Badge
     const badge = document.getElementById('modal-match-badge');
     badge.innerText = `${data.match_percent}% Match`;
     
     // Cores Badge
     if(data.match_percent >= 75) badge.className = "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success border border-white shadow-sm fs-6";
     else if(data.match_percent >= 40) badge.className = "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning border border-white shadow-sm fs-6 text-dark";
     else badge.className = "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary border border-white shadow-sm fs-6";

     // --- LÓGICA DE DECISÃO ---
     if (data.status === 'APROVADO') {
         // Já Aprovado
         btnAprovar.disabled = true;
         btnAprovar.innerHTML = "<i class='bi bi-check-circle-fill me-1'></i> Já Aprovado";
         
         btnReprovar.disabled = true;
         btnReprovar.className = "btn btn-light w-100 py-2 rounded-pill text-muted border";

     } else if (data.status === 'REJEITADO') {
         // Já Recusado
         btnReprovar.disabled = true;
         btnReprovar.innerHTML = "<i class='bi bi-x-circle-fill me-1'></i> Já Recusado";
         btnReprovar.className = "btn btn-danger w-100 py-2 rounded-pill fw-bold opacity-75";

         btnAprovar.disabled = true;
         btnAprovar.className = "btn btn-light w-100 py-2 rounded-pill text-muted border";

     } else {
         // Pendente: Verifica Match Mínimo (75%)
         if (data.match_percent < 75) {
             btnAprovar.disabled = true;
             btnAprovar.className = "btn btn-secondary w-100 py-2 rounded-pill fw-bold opacity-50 cursor-not-allowed"; 
             btnAprovar.innerHTML = "<i class='bi bi-lock-fill me-1'></i> Requisitos Insuficientes";
         }
     }

     // Renderiza Skills Coloridas
     elSkills.innerHTML = '';
     if(data.skills_detalhadas && data.skills_detalhadas.length > 0) {
         data.skills_detalhadas.forEach(s => {
             const cor = s.tem ? 'bg-success-subtle text-success border-success-subtle' : 'bg-white text-muted border-light-subtle opacity-50';
             const icone = s.tem ? '<i class="bi bi-check-lg me-1"></i>' : '';
             elSkills.innerHTML += `
                 <span class="badge ${cor} border rounded-pill px-3 py-2 fw-normal">
                     ${icone}${s.nome}
                 </span>`;
         });
     } else {
         elSkills.innerHTML = '<span class="text-muted small">Sem requisitos técnicos.</span>';
     }

 } catch (e) {
     console.error(e);
     elNome.innerText = "Erro ao carregar dados";
 }
};

// 2. Enviar Decisão (Professor)
window.enviarDecisao = async function(decisao) {
 if(!candidatoAtualId) return;

 try {
     const response = await fetch(`/vagas/api/candidatura/${candidatoAtualId}/avaliar/`, {
         method: 'POST',
         headers: {
             'Content-Type': 'application/json',
             'X-CSRFToken': getCookie('csrftoken')
         },
         body: JSON.stringify({ acao: decisao }) 
     });

     const data = await response.json();

     if (data.success) {
         const modalEl = document.getElementById('modalAvaliarCandidato');
         const modal = bootstrap.Modal.getInstance(modalEl);
         modal.hide();
         
         // Recarrega a tabela
         if(typeof SPA !== 'undefined') SPA.load('grade');
     } else {
         alert("Erro: " + data.message);
     }
 } catch (e) {
     console.error(e);
     alert("Erro de conexão.");
 }
};

// Auxiliar para pegar Token CSRF
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

// --- UTILITÁRIO: PEGAR COOKIE DJANGO ---
function getCookie(name) { let cookieValue = null; if (document.cookie && document.cookie !== '') { const cookies = document.cookie.split(';'); for (let i = 0; i < cookies.length; i++) { const cookie = cookies[i].trim(); if (cookie.substring(0, name.length + 1) === (name + '=')) { cookieValue = decodeURIComponent(cookie.substring(name.length + 1)); break; } } } return cookieValue; }