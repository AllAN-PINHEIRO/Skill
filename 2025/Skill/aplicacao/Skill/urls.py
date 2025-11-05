# Em aplicacao/Skill/urls.py
from django.contrib import admin
from django.urls import path
from contas import views

urlpatterns = [
  # Rotas páginas do MVT
    path('admin/', admin.site.urls),
    path('', views.homepage_view, name='home'), 

    # Rotas da API que criamos
    path('login/', views.login_page_view, name='login-page'),
    path('register/', views.register_page_view, name='register-page'),

    # 2. ROTAS DE API (JSON) - O que o JavaScript chama
    path('api/login/', views.api_login_view, name='api-login'),
    path('api/register/', views.api_register_view, name='api-register'),
]