from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Vaga 

@login_required
def partial_vagas_view(request):
    # Busca todas as vagas ativas
    vagas = Vaga.objects.filter(status='ATIVA').order_by('-criado_em')
    
    context = {
        'vagas': vagas
    }
    
    return render(request, 'partials/vagas.html', context)