# Em aplicacao/Skill/urls.py
from django.contrib import admin
from django.urls import path
from contas import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Homepage
    path('', views.homepage_view, name='home'), 

    # Rotas da API que criamos
    path('login/', views.login_view, name='login'),
    # vai ser criado path('register/', views.register_view, name='register'),
]