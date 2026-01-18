document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. Menu Mobile ---
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');

    function toggleSidebar() {
        if(sidebar) sidebar.classList.toggle('active');
        if(sidebarOverlay) sidebarOverlay.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
    }

    if(hamburgerMenu) hamburgerMenu.addEventListener('click', toggleSidebar);
    if(sidebarClose) sidebarClose.addEventListener('click', toggleSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    document.querySelectorAll('.sidebar-menu a').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 992) toggleSidebar();
        });
    });

    // --- 2. Gráfico Radar ---
    const ctx = document.getElementById('skillsChart');
    const labelsTag = document.getElementById('dado-labels');
    const dataTag = document.getElementById('dado-valores');

    if (ctx && labelsTag && dataTag) {
        const labels = JSON.parse(labelsTag.textContent);
        const dataValues = JSON.parse(dataTag.textContent);

        new Chart(ctx, {
            type: 'radar', 
            data: {
                labels: labels,
                datasets: [{
                    label: 'Nível',
                    data: dataValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)', 
                    borderColor: '#10b981', 
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: { backdropColor: 'transparent', display: false }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- 3. Logout ---
    async function logoutSystem(e) {
        e.preventDefault(); 
        if(!confirm("Tem certeza que deseja sair do sistema?")) return;

        try {
            const getCookie = (name) => {
                let v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
                return v ? v[2] : null;
            }

            await fetch('/auth/api/logout/', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
        } catch (error) {
            console.error("Erro logout:", error);
        } finally {
            localStorage.removeItem('accessToken');
            window.location.href = "/";
        }
    }

    const btnHeader = document.getElementById('header-logout-btn');
    const btnSidebar = document.getElementById('btn-logout-sidebar');

    if (btnHeader) btnHeader.addEventListener('click', logoutSystem);
    if (btnSidebar) {
        const link = btnSidebar.querySelector('a');
        if(link) link.addEventListener('click', logoutSystem);
        else btnSidebar.addEventListener('click', logoutSystem);
    }
});