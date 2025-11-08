# Em aplicacao/Skill/urls.py
from django.contrib import admin
from django.urls import path, include
from contas import views

urlpatterns = [
  # Rotas páginas do MVT
    path('admin/', admin.site.urls),
    path('auth/', include('contas.urls', namespace='contas')),
    path('', views.homepage_view, name='home'),
]