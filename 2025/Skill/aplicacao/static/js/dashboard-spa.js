/* ============================================================
   DASHBOARD SPA - VERSÃO FINAL (COMPLETA)
   ============================================================ */

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

    init: function() {
        this.setupGlobalListeners();
        this.load('home');
        this.setupSidebarMobile();
    },

    setupGlobalListeners: function() {
        document.body.addEventListener('click', (e) => {
            // 1. Navegação
            const routeLink = e.target.closest('[data-route]');
            if (routeLink) {
                e.preventDefault();
                const page = routeLink.getAttribute('data-route');
                this.load(page);
                
                document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
                const liPai = routeLink.closest('li');
                if(liPai) liPai.classList.add('active');
                return;
            }

            // 2. Logout
            if (e.target.closest('#header-logout-btn') || e.target.closest('#btn-logout-sidebar')) {
                e.preventDefault();
                this.handleLogout();
                return;
            }

            // 3. Botão Adicionar Skill (Visual)
            if (e.target.closest('#btn-add-temp')) {
                e.preventDefault();
                SPA.handleAddSkillVisual(); 
            }
        });

        // 4. Submit de Forms
        document.body.addEventListener('submit', (e) => {
            if (e.target.id === 'form-ajax') {
                e.preventDefault();
                this.handleFormSubmit(e.target);
            }
        });
    },

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

            // --- CORREÇÃO AQUI: Chamar o GitHub nas páginas certas ---
            if (pageKey === 'perfil' || pageKey === 'portfolio') {
                this.loadGithubRepos();
            }
            // ---------------------------------------------------------

        } catch (error) {
            if(window.showToast) showToast("Erro ao carregar conteúdo.", "danger");
        }
    },

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

        // 1. CONFIGURAÇÃO DO GRÁFICO (Limpo)
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
                cutout: '75%', // Donut mais fino
                layout: { padding: 10 },
                plugins: { 
                    legend: { display: false }, // Remove a legenda padrão
                    tooltip: { enabled: true },
                    datalabels: { display: false } // Remove textos de cima do gráfico
                }
            }
        });

        // 2. GERAÇÃO DA LEGENDA LATERAL
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

    // --- FUNÇÃO DE ADICIONAR VISUALMENTE ---
    handleAddSkillVisual: function() {
        const sel = document.getElementById('skill-select');
        const lvl = document.getElementById('skill-level');
        const lista = document.getElementById('lista-skills-temp');

        if (sel && lvl && sel.value && lvl.value) {
            // Evita duplicatas visuais
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
            sel.value = ""; lvl.value = ""; // Limpa campos
        } else {
            if(window.showToast) showToast("Selecione uma habilidade e a porcentagem.", "warning");
        }
    },

    // --- EDITAR SKILL (RETORNA PARA OS INPUTS) ---
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

    // --- SUBMIT DO PERFIL ---
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

    handleLogout: async function() {
        if(window.abrirConfirmacao) {
            abrirConfirmacao(async () => {
                try { const csrf = getCookie('csrftoken'); await fetch('/auth/api/logout/', { method: 'POST', headers: { 'X-CSRFToken': csrf } }); } 
                finally { localStorage.removeItem('accessToken'); window.location.href = "/"; }
            });
        } else { if(confirm("Sair?")) window.location.href = "/"; }
    },

    setupSidebarMobile: function() { 
        const toggle = document.getElementById('hamburgerMenu');
        const close = document.getElementById('sidebarClose');
        const sidebar = document.getElementById('sidebar');
        const toggleFn = () => { sidebar.classList.toggle('active'); document.body.classList.toggle('sidebar-open'); };
        if(toggle) toggle.addEventListener('click', toggleFn);
        if(close) close.addEventListener('click', toggleFn);
    },

    // NOVA FUNÇÃO: Carrega e desenha o carrossel do GitHub
    loadGithubRepos: async function() {
        const container = document.getElementById('github-card-container');
        if (!container) return; // Se não estiver na página certa, sai

        try {
            const response = await fetch('/auth/api/github/repos/');
            const data = await response.json();

            if (data.success && data.repos.length > 0) {
                // Monta o HTML do Carrossel (Igual ao de Certificados)
                let carouselHtml = `
                    <div id="carouselGithub" class="carousel slide h-100" data-bs-ride="false">
                        <div class="carousel-inner h-100">
                `;

                data.repos.forEach((repo, index) => {
                    const activeClass = index === 0 ? 'active' : '';
                    
                    // Define cor da linguagem
                    let langColor = '#6c757d';
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

                // Adiciona Setas se tiver mais de 1 repo
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
                // Tratamento de erros/vazio
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
};


/* ============================================================
   SISTEMA DE NOTIFICAÇÕES E CONFIRMAÇÃO
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
   LÓGICA DOS MODAIS (PORTFÓLIO)
   ============================================================ */

let modalInstancia = null;
let modalCertInstancia = null;

// --- Modal Destaque ---
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

// --- Modal Certificado (Atualizado com Objeto e HTML) ---
window.abrirModalCertificado = function(elemento) {
    const modalEl = document.getElementById('modalCertificado');
    const form = document.getElementById('form-certificado');

    form.reset(); 
    document.getElementById('cert_id').value = ""; 

    if (!modalCertInstancia) modalCertInstancia = new bootstrap.Modal(modalEl);
    const btnExcluir = document.getElementById('btn-excluir-cert');

    // Verifica se veio um elemento HTML ou um Objeto direto (do carrossel)
    let dataset = null;
    if (elemento && elemento.dataset) {
        dataset = elemento.dataset; 
    } else if (elemento && elemento.id) {
        // Compatibilidade caso venha de um objeto JS puro
        dataset = elemento; 
    }

    if (dataset && dataset.id) {
        document.getElementById('cert_id').value = dataset.id;
        document.getElementById('cert_titulo').value = dataset.titulo;
        document.getElementById('cert_instituicao').value = dataset.instituicao;
        document.getElementById('cert_horas').value = dataset.horas;
        document.getElementById('cert_link').value = dataset.link || "";

        btnExcluir.style.display = 'block';
        const id = dataset.id;
        btnExcluir.onclick = function() { 
            abrirConfirmacao(() => excluirCertificado(id)); 
        };
    } else {
        btnExcluir.style.display = 'none';
    }
    modalCertInstancia.show();
};

// --- SUBMIT DOS MODAIS ---
document.addEventListener('submit', async function(e) {
    const csrfToken = getCookie('csrftoken');

    // Salvar Destaque
    if (e.target.id === 'form-destaque') {
        e.preventDefault();
        const titulo = document.getElementById('destaque_titulo').value.trim();
        if(!titulo) return showToast("O título é obrigatório.", "warning");

        const dados = { id: document.getElementById('destaque_id').value, titulo: titulo, descricao: document.getElementById('destaque_descricao').value, cor: document.querySelector('input[name="destaque_cor"]:checked').value };
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

// --- EXCLUIR ---
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

function getCookie(name) { let cookieValue = null; if (document.cookie && document.cookie !== '') { const cookies = document.cookie.split(';'); for (let i = 0; i < cookies.length; i++) { const cookie = cookies[i].trim(); if (cookie.substring(0, name.length + 1) === (name + '=')) { cookieValue = decodeURIComponent(cookie.substring(name.length + 1)); break; } } } return cookieValue; }