from django.urls import path
from . import views

urlpatterns = [
    path('partial/feed/', views.partial_vagas_view, name='partial-vagas-feed'),
    path('partial/home/', views.partial_home_view, name='partial-home'),
    path('partial/professor/home/', views.partial_home_professor_view, name='partial-home-prof'),
    path('partial/professor/perfil/', views.partial_perfil_professor_view, name='partial-perfil-prof'),
    path('partial/professor/minhas-vagas/', views.partial_minhas_vagas_view, name='partial-minhas-vagas'),
    path('api/professor/criar-vaga/', views.api_salvar_vaga, name='api-criar-vaga'),
    path('api/professor/excluir-vaga/<int:vaga_id>/', views.api_excluir_vaga, name='api-excluir-vaga'),
    path('api/professor/vaga/<int:vaga_id>/', views.api_detalhes_vaga, name='api-detalhes-vaga'),
    path('api/professor/editar-vaga/<int:vaga_id>/', views.api_editar_vaga, name='api-editar-vaga'),
    path('api/vaga/<int:vaga_id>/detalhes/', views.api_detalhes_vaga, name='api-vaga-detalhes'),
    path('api/vaga/<int:vaga_id>/candidatar/', views.api_candidatar_vaga, name='api-vaga-candidatar'),
]