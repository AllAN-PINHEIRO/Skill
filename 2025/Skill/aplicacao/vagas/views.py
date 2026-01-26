import json # <--- NOVO IMPORT
from django.shortcuts import render, get_object_or_404 # <--- ADICIONADO get_object_or_404
from django.http import JsonResponse # <--- NOVO IMPORT
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from contas.models import Cadastro, PerfilAluno, PerfilProfessor, Habilidade # <--- ADICIONADO Habilidade
from .models import Vaga 

# =========================================================
# 1. VIEW DO ALUNO (FEED DE VAGAS)
# =========================================================
@login_required
def partial_vagas_view(request):
    vagas = Vaga.objects.filter(status='ABERTA').order_by('-criado_em') # Ajustado para 'ABERTA' conforme novo model
    context = {'vagas': vagas}
    return render(request, 'partials/vagas.html', context)

# =========================================================
# 2. VIEW DO PROFESSOR (HOME DASHBOARD)
# =========================================================
@login_required
def partial_home_professor_view(request):
    nome_usuario = "Professor"
    try:
        nome_usuario = request.user.cadastro.nome
    except: pass

    # Vagas Recentes
    vagas_recentes = Vaga.objects.filter(professor=request.user).order_by('-criado_em')[:3]
    
    # Alunos
    alunos = User.objects.filter(cadastro__tipoDoCadastro=1).select_related('cadastro')[:5]

    context = {
        'nome_usuario': nome_usuario,
        'vagas_recentes': vagas_recentes,
        'alunos_tabela': alunos
    }
    return render(request, 'partials/home-professor.html', context)

# =========================================================
# 3. PERFIL DO PROFESSOR
# =========================================================
@login_required
def partial_perfil_professor_view(request):
    usuario = request.user
    
    # Lógica de Nome e Iniciais
    nome_completo = "Professor"
    iniciais = "IF"
    
    if hasattr(usuario, 'cadastro') and usuario.cadastro.nome:
        nome_completo = usuario.cadastro.nome
    elif usuario.get_full_name():
        nome_completo = usuario.get_full_name()
    else:
        nome_completo = usuario.username

    try:
        partes = nome_completo.strip().split()
        if len(partes) > 1:
            iniciais = f"{partes[0][0]}{partes[-1][0]}".upper()
        elif len(partes) == 1 and len(partes[0]) >= 2:
            iniciais = partes[0][:2].upper()
        else:
            iniciais = partes[0][0].upper()
    except: pass
    
    # Dados complementares
    matricula = "Não informada"
    cidade = "Não informada"
    try: 
        if hasattr(usuario, 'cadastro'):
            matricula = usuario.cadastro.matricula
            cidade = usuario.cadastro.campus
    except: pass

    bio = "Sem biografia cadastrada."
    telefone = "Sem contato."
    try:
        if hasattr(usuario, 'perfil_professor'):
            perfil = usuario.perfil_professor
            bio = perfil.bio if perfil.bio else bio
            telefone = perfil.telefone if perfil.telefone else telefone
    except: pass

    qtd_vagas = Vaga.objects.filter(professor=usuario, status='ABERTA').count()
    indicacoes = User.objects.filter(cadastro__tipoDoCadastro=1).select_related('cadastro')[:5]

    context = {
        'usuario': usuario,
        'nome_completo': nome_completo,
        'iniciais': iniciais,
        'matricula': matricula,
        'cidade': cidade,
        'bio': bio,
        'telefone': telefone,
        'qtd_vagas': qtd_vagas,
        'indicacoes': indicacoes
    }
    return render(request, 'partials/perfil-professor.html', context)

# =========================================================
# 4. GESTÃO DE VAGAS (MINHAS VAGAS - PROFESSOR) [NOVO]
# =========================================================

@login_required
def partial_minhas_vagas_view(request):
    """
    Carrega a lista de vagas criadas pelo professor logado
    e as habilidades para o modal de criação.
    """
    # Busca apenas vagas deste professor
    vagas = Vaga.objects.filter(professor=request.user).order_by('-criado_em')
    
    # Busca habilidades para o Select Multiple do Modal
    todas_habilidades = Habilidade.objects.all().order_by('nome')
    
    context = {
        'vagas': vagas,
        'todas_habilidades': todas_habilidades
    }
    return render(request, 'partials/professor-vagas.html', context)

@login_required
def api_salvar_vaga(request):
    """
    Recebe o JSON do modal e salva a vaga no banco.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Cria a vaga
            nova_vaga = Vaga.objects.create(
                professor=request.user,
                empresa=data.get('empresa'),
                titulo=data.get('titulo'),       # Cargo
                cidade=data.get('cidade'),       # Cidade
                modalidade=data.get('modalidade'), # Presencial/Hibrido/Remoto
                status=data.get('status'),       # Aberta/Cancelada/Etc
                descricao=data.get('sobre'),     # Sobre a vaga
                tipo='ESTAGIO'                   # Padrão ou adicione no form se quiser
            )
            
            # Adiciona as Habilidades (Match)
            skills_ids = data.get('skills', [])
            if skills_ids:
                habilidades = Habilidade.objects.filter(id__in=skills_ids)
                nova_vaga.habilidades.set(habilidades)
            
            nova_vaga.save()
            
            return JsonResponse({'success': True, 'message': 'Vaga criada com sucesso!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False}, status=405)

@login_required
def api_excluir_vaga(request, vaga_id):
    """
    Exclui uma vaga específica do professor.
    """
    if request.method == 'POST':
        try:
            # Garante que só apaga se a vaga for DO professor logado
            vaga = get_object_or_404(Vaga, id=vaga_id, professor=request.user)
            vaga.delete()
            return JsonResponse({'success': True, 'message': 'Vaga excluída com sucesso.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    return JsonResponse({'success': False}, status=405)

# --- API: OBTER DETALHES DA VAGA (Para Edição e Visualização) ---
@login_required
def api_detalhes_vaga(request, vaga_id):
    try:
        vaga = get_object_or_404(Vaga, id=vaga_id, professor=request.user)
        
        # Prepara a lista de IDs das habilidades que essa vaga já tem
        skills_ids = list(vaga.habilidades.values_list('id', flat=True))
        # Prepara os nomes das habilidades também (para mostrar visualmente)
        skills_data = list(vaga.habilidades.values('id', 'nome'))

        data = {
            'id': vaga.id,
            'empresa': vaga.empresa,
            'titulo': vaga.titulo,
            'cidade': vaga.cidade,
            'modalidade': vaga.modalidade,
            'status': vaga.status,
            'sobre': vaga.descricao,
            'skills_ids': skills_ids, # Lista de IDs [1, 5, 9]
            'skills_data': skills_data # Lista de Objetos [{'id':1, 'nome':'Java'}]
        }
        return JsonResponse({'success': True, 'data': data})
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)

# --- API: ATUALIZAR (EDITAR) VAGA ---
@login_required
def api_editar_vaga(request, vaga_id):
    if request.method == 'POST':
        try:
            vaga = get_object_or_404(Vaga, id=vaga_id, professor=request.user)
            data = json.loads(request.body)
            
            # Atualiza campos simples
            vaga.empresa = data.get('empresa')
            vaga.titulo = data.get('titulo')
            vaga.cidade = data.get('cidade')
            vaga.modalidade = data.get('modalidade')
            vaga.status = data.get('status')
            vaga.descricao = data.get('sobre')
            
            # Atualiza Habilidades (Limpa as antigas e põe as novas)
            skills_ids = data.get('skills', [])
            if skills_ids:
                habilidades = Habilidade.objects.filter(id__in=skills_ids)
                vaga.habilidades.set(habilidades)
            else:
                vaga.habilidades.clear() # Se mandou vazio, remove todas
            
            vaga.save()
            return JsonResponse({'success': True, 'message': 'Vaga atualizada com sucesso!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    return JsonResponse({'success': False}, status=405)