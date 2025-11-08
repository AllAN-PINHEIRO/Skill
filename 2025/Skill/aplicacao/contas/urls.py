from django.urls import path
from . import views

app_name = 'contas'

urlpatterns = [
    # 1. ROTAS DE PÁGINA (HTML) - O que o usuário vê no navegador
    path('', views.homepage_view, name='home'),
    path('login/', views.login_page_view, name='login-page'),
    path('register/', views.register_page_view, name='register-page'),

    # 2. ROTAS DE API (JSON) - O que o JavaScript chama
    path('api/login/', views.LoginAPIView.as_view(), name='api-login'),
    path('api/register/', views.RegisterAPIView.as_view(), name='api-register'),
]