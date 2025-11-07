from django.urls import path
from . import views

urlpatterns = [
  # Rotas da API que criamos
    path('login/', views.login_page_view, name='login-page'),
    path('register/', views.register_page_view, name='register-page'),

    # 2. ROTAS DE API (JSON) - O que o JavaScript chama
    path('auth/login/', views.api_login_view, name='auth-login'),
    path('auth/register/', views.api_register_view, name='auth-register'),
]