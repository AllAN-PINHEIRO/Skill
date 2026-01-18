// Função para preencher o HTML com os dados do JSON (Versão para novo CSS)
function preencherTela(data) {
    // Dados Básicos
    document.getElementById('user-nome').innerText = data.nome;
    document.getElementById('user-campus').innerText = data.campus;
    document.getElementById('user-matricula').innerText = data.matricula; // Removido o texto "Matrícula:" pois já está no ícone
    
    // Perfil
    const perfil = data.perfil;
    document.getElementById('user-resumo').innerText = perfil.resumo || "Sem resumo profissional cadastrado.";

    // Links Sociais (Botões redondos novos)
    const socialDiv = document.getElementById('social-links');
    let socialHtml = '';
    if (perfil.linkedin) {
        socialHtml += `<a href="${perfil.linkedin}" target="_blank" class="btn btn-social btn-linkedin" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
    }
    if (perfil.github) {
        socialHtml += `<a href="${perfil.github}" target="_blank" class="btn btn-social btn-github" title="GitHub"><i class="fab fa-github"></i></a>`;
    }
    // Se não tiver links, mostra uma mensagem discreta
    if (socialHtml === '') {
        socialHtml = '<span class="text-muted small">Sem redes sociais vinculadas.</span>';
    }
    socialDiv.innerHTML = socialHtml;

    // Skills (Novas barras animadas)
    const skillsDiv = document.getElementById('skills-container');
    if (perfil.habilidades && perfil.habilidades.length > 0) {
        // Atualiza o badge com a contagem
        document.getElementById('skill-count-badge').innerText = `${perfil.habilidades.length} Skills`;

        const skillsHtml = perfil.habilidades.map(skill => `
            <div class="skill-item-container">
                <div class="skill-info">
                    <span class="skill-name"><i class="fas fa-code text-success me-2"></i>${skill.nome_habilidade}</span>
                    <span class="skill-percentage">${skill.nivel}%</span>
                </div>
                <div class="progress">
                    <div class="progress-bar progress-bar-animated-gradient" role="progressbar" style="width: ${skill.nivel}%" aria-valuenow="${skill.nivel}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `).join('');
        skillsDiv.innerHTML = skillsHtml;
    } else {
        document.getElementById('skill-count-badge').innerText = "0 Skills";
        skillsDiv.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-ghost fa-3x mb-3 text-secondary opacity-50"></i>
                <p>Nenhuma habilidade cadastrada ainda.</p>
                <a href="/auth/completar-perfil/" class="btn btn-outline-success btn-sm mt-2">Adicionar Skills</a>
            </div>
        `;
    }
}