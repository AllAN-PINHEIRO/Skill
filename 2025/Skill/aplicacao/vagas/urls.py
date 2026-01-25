from django.urls import path
from . import views

urlpatterns = [
    path('partial/feed/', views.partial_vagas_view, name='partial-vagas-feed'),
]