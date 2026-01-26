from django.urls import path
from . import views
from .views import api_github_repos # Não esqueça de importar

app_name = 'contas'

urlpatterns = [
    # 1. ROTAS DE PÁGINA (HTML) - O que o usuário vê no navegador
    path('', views.homepage_view, name='home'),
    path('login/', views.login_page_view, name='login-page'),
    path('register/', views.register_page_view, name='register-page'),
    path('forgot-password/', views.forgot_password_page_view, name='forgot-password'),
    path('reset-password/<uidb64>/<token>/', views.reset_password_page_view, name='reset-password'),
    path('dashboard-aluno/', views.dashboard_shell_view, name='dashboard-aluno'),
    path('dashboard-professor/', views.dashboard_professor_page_view, name='dashboard-professor'),
    path('completar-perfil/', views.completar_perfil_page_view, name='completar-perfil'),
    path('partial/home/', views.partial_home_view, name='partial-home'),
    path('partial/perfil/', views.partial_perfil_view, name='partial-perfil'),
    path('partial/editar/', views.partial_editar_perfil_view, name='partial-editar'),
    path('partial/portfolio/', views.partial_portfolio_view, name='partial-portfolio'),

    # 2. ROTAS DE API (JSON) - O que o JavaScript chama
    path('api/login/', views.LoginAPIView.as_view(), name='api-login'),
    path('api/register/', views.RegisterAPIView.as_view(), name='api-register'),
    path('api/forgot-password/', views.ForgotPasswordAPIView.as_view(), name='api-forgot-password'),
    path('api/reset-password/', views.ResetPasswordAPIView.as_view(), name='api-reset-password'),
    path('api/completar-perfil/', views.api_completar_perfil, name='api-completar-perfil'),
    path('api/meu-perfil/', views.MeuPerfilAPIView.as_view(), name='api-meu-perfil'),
    path('api/logout/', views.LogoutAPIView.as_view(), name='api-logout'),
    path('api/destaque/salvar/', views.api_salvar_destaque, name='api-salvar-destaque'),
    path('api/destaque/excluir/<int:destaque_id>/', views.api_excluir_destaque, name='api-excluir-destaque'),
    path('api/certificado/salvar/', views.api_salvar_certificado, name='api-salvar-certificado'),
    path('api/certificado/excluir/<int:cert_id>/', views.api_excluir_certificado, name='api-excluir-certificado'),
    path('api/github/repos/', api_github_repos, name='api_github_repos'),
    path('api/professor/salvar-perfil/', views.api_salvar_perfil_professor, name='api-salvar-perfil-prof'),
]