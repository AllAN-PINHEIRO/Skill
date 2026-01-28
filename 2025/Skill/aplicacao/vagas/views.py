import json # <--- NOVO IMPORT
from django.shortcuts import render, get_object_or_404 # <--- ADICIONADO get_object_or_404
from django.http import JsonResponse # <--- NOVO IMPORT
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from contas.models import Cadastro, HabilidadeAluno, PerfilAluno, PerfilProfessor, Habilidade # <--- ADICIONADO Habilidade
from .models import Vaga, Candidatura
from django.views.decorators.http import require_POST


# =========================================================
# 1. VIEW DO ALUNO (FEED DE VAGAS)
# =========================================================
@login_required
def partial_vagas_view(request):
    # 1. Filtro de Busca
    termo = request.GET.get('q', '').strip()
    
    # Pega TODAS as abertas inicialmente
    todas_vagas = Vaga.objects.filter(status='ABERTA').order_by('-criado_em')
    
    if termo:
        todas_vagas = todas_vagas.filter(titulo__icontains=termo) | todas_vagas.filter(empresa__icontains=termo)

    # 2. Match e Filtragem
    vagas_finais = [] # Lista que vai para o template
    
    skills_aluno = set()
    if hasattr(request.user, 'perfil_aluno'):
        skills_aluno = set(request.user.perfil_aluno.habilidades.values_list('id', flat=True))

    for vaga in todas_vagas:
        skills_vaga = set(vaga.habilidades.values_list('id', flat=True))
        match = 0
        
        if not skills_vaga:
            match = 100 # Vaga sem requisitos = Match total
        else:
            comum = skills_aluno.intersection(skills_vaga)
            match = int((len(comum) / len(skills_vaga)) * 100)
        
        vaga.match_percent = match
        
        # --- REGRA DE OURO ---
        # Só adiciona na lista se tiver ALGUM match (> 0)
        if match > 0:
            vagas_finais.append(vaga)

    # 3. Estatísticas (Baseadas apenas no que o aluno PODE ver)
    total_candidaturas = 0
    if request.user.is_authenticated:
        total_candidaturas = Candidatura.objects.filter(aluno=request.user).count()

    # Ordena: As com maior match aparecem primeiro
    vagas_finais.sort(key=lambda x: x.match_percent, reverse=True)

    context = {
        'vagas': vagas_finais, # Enviamos a lista filtrada
        'stats': {
            'enviadas': total_candidaturas,
            'disponiveis': len(vagas_finais)
        }
    }
    
    return render(request, 'partials/vagas.html', context)

@login_required
def partial_home_view(request):
    # 1. PEGAR NOME
    nome_usuario = "Aluno"
    try:
        if hasattr(request.user, 'cadastro'):
            nome_usuario = request.user.cadastro.nome
    except: pass

    # 2. PEGAR SKILLS (Agora com NÍVEIS REAIS)
    skills_ids = set()
    skill_labels = []
    skill_data = [] 
    tem_skills = False

    try:
        if hasattr(request.user, 'perfil_aluno'):
            perfil = request.user.perfil_aluno
            
            # [MUDANÇA CRUCIAL] 
            # Em vez de pegar direto as habilidades, pegamos a relação HabilidadeAluno
            # Ordenamos por '-nivel' para as maiores aparecerem primeiro
            skills_rels = HabilidadeAluno.objects.filter(perfil=perfil).order_by('-nivel')
            
            if skills_rels.exists():
                tem_skills = True
                
                for item in skills_rels:
                    # Guarda o ID para calcular o Match das vagas logo abaixo
                    skills_ids.add(item.habilidade.id)
                    
                    # Guarda o Nome para o Gráfico
                    skill_labels.append(item.habilidade.nome)
                    
                    # [AQUI ESTÁ A CORREÇÃO]
                    # Pega o nível real (ex: 30, 55, 90) em vez de fixar em 100
                    skill_data.append(item.nivel)

    except Exception as e:
        print(f"Erro ao carregar skills: {e}")

    # 3. MATCH DE VAGAS (Lógica mantém a mesma, mas usa os IDs reais carregados acima)
    vagas_finais = []
    todas_vagas = Vaga.objects.filter(status__in=['ABERTA', 'ATIVA']).order_by('-criado_em')

    for vaga in todas_vagas:
        skills_vaga = set(vaga.habilidades.values_list('id', flat=True))
        total = len(skills_vaga)
        
        match = 0
        if total == 0:
            match = 100
        else:
            comum = skills_ids.intersection(skills_vaga)
            match = int((len(comum) / total) * 100)
        
        vaga.match_percent = match
        
        # Filtro: Mostra se tiver match maior que 0%
        if match > 0:
            vagas_finais.append(vaga)

    # Ordena e pega Top 3
    vagas_finais.sort(key=lambda x: x.match_percent, reverse=True)
    vagas_recentes = vagas_finais[:3]

    # CONTEXTO FINAL
    context = {
        'dados': {'nome': nome_usuario},
        'tem_skills': tem_skills,
        'skill_labels': json.dumps(skill_labels),
        'skill_data': json.dumps(skill_data), # Agora envia os dados reais
        'vagas_recentes': vagas_recentes
    }
    
    return render(request, 'partials/home.html', context)

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
        vaga = Vaga.objects.get(id=vaga_id)
        
        # 1. Verifica Candidatura (Mantido)
        ja_candidatou = False
        if Candidatura.objects.filter(aluno=request.user, vaga=vaga).exists():
            ja_candidatou = True

        # 2. CALCULAR MATCH (NOVO!)
        match = 0
        if hasattr(request.user, 'perfil_aluno'):
            skills_aluno = set(request.user.perfil_aluno.habilidades.values_list('id', flat=True))
            skills_vaga = set(vaga.habilidades.values_list('id', flat=True))
            
            if not skills_vaga:
                match = 100
            else:
                comum = skills_aluno.intersection(skills_vaga)
                match = int((len(comum) / len(skills_vaga)) * 100)

        data = {
            'id': vaga.id,
            'titulo': vaga.titulo,
            'empresa': vaga.empresa,
            'descricao': vaga.descricao,
            'modalidade': vaga.get_modalidade_display(),
            'tipo': vaga.get_tipo_display(),
            'cidade': vaga.cidade,
            'skills': [s.nome for s in vaga.habilidades.all()],
            'ja_candidatou': ja_candidatou,
            'match_percent': match  # <--- Enviando o Match para o JS
        }
        return JsonResponse(data)
    except Vaga.DoesNotExist:
        return JsonResponse({'error': 'Vaga não encontrada'}, status=404)
    except Exception as e:
        print(f"ERRO API: {e}")
        return JsonResponse({'error': str(e)}, status=500)

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

# 1. API DE DETALHES (Corrigida)
@login_required
def api_detalhes_vaga(request, vaga_id):
    try:
        vaga = Vaga.objects.get(id=vaga_id)
        
        # Verifica se o aluno já se candidatou
        ja_candidatou = False
        
        # CORREÇÃO AQUI:
        # O modelo Candidatura espera um User, não um PerfilAluno.
        # Então usamos 'aluno=request.user'
        if Candidatura.objects.filter(aluno=request.user, vaga=vaga).exists():
            ja_candidatou = True

        data = {
            'id': vaga.id,
            'titulo': vaga.titulo,
            'empresa': vaga.empresa,
            'descricao': vaga.descricao,
            'modalidade': vaga.get_modalidade_display(),
            'tipo': vaga.get_tipo_display(),
            'cidade': vaga.cidade,
            'skills': [s.nome for s in vaga.habilidades.all()],
            'ja_candidatou': ja_candidatou
        }
        return JsonResponse(data)
    except Vaga.DoesNotExist:
        return JsonResponse({'error': 'Vaga não encontrada'}, status=404)
    except Exception as e:
        # Isso vai te ajudar a ver erros futuros no terminal sem quebrar a tela
        print(f"ERRO API DETALHES: {e}") 
        return JsonResponse({'error': str(e)}, status=500)


# 2. API DE CANDIDATAR (Corrigida)
@login_required
@require_POST
def api_candidatar_vaga(request, vaga_id):
    # Removido a checagem de perfil_aluno pois o banco pede User
    
    vaga = get_object_or_404(Vaga, id=vaga_id)
    usuario = request.user # <--- Usamos o User direto
    
    # Verifica duplicidade
    if Candidatura.objects.filter(aluno=usuario, vaga=vaga).exists():
        return JsonResponse({'success': False, 'message': 'Você já se candidatou a esta vaga!'})

    # Cria a candidatura
    # CORREÇÃO AQUI TAMBÉM: Enviamos o usuario (request.user)
    Candidatura.objects.create(aluno=usuario, vaga=vaga)
    
    return JsonResponse({'success': True, 'message': 'Candidatura enviada com sucesso!'})

# =========================================================
# CORREÇÃO 1: VIEW DA GRADE (LISTA)
# =========================================================
@login_required
def partial_grade_view(request):
    # Busca candidaturas das vagas deste professor
    candidaturas = Candidatura.objects.filter(
        vaga__professor=request.user 
    ).select_related('aluno', 'vaga', 'aluno__perfil_aluno').order_by('-data_aplicacao') 

    # --- LÓGICA DE CÁLCULO DE MATCH PARA A TABELA ---
    for c in candidaturas:
        try:
            # 1. Pega IDs das skills da Vaga
            skills_vaga = set(c.vaga.habilidades.values_list('id', flat=True))
            
            # 2. Pega IDs das skills do Aluno
            skills_aluno = set()
            if hasattr(c.aluno, 'perfil_aluno'):
                skills_aluno = set(c.aluno.perfil_aluno.habilidades.values_list('id', flat=True))
            
            # 3. Calcula
            if not skills_vaga:
                c.match_real = 100 # Se a vaga não exige nada, é 100%
            else:
                comum = skills_aluno.intersection(skills_vaga)
                c.match_real = int((len(comum) / len(skills_vaga)) * 100)
        except:
            c.match_real = 0

    context = {
        'candidaturas': candidaturas
    }
    return render(request, 'partials/grade.html', context)

# =========================================================
# CORREÇÃO 2: API PARA DAR MATCH OU RECUSAR
# =========================================================
@login_required
@require_POST
def api_avaliar_candidatura(request, id_candidatura):
    data = json.loads(request.body)
    acao = data.get('acao') 
    
    # CORRIGIDO: Aqui também mudamos para 'vaga__professor'
    # Isso garante que só o dono da vaga pode avaliar o aluno
    candidatura = get_object_or_404(Candidatura, id=id_candidatura, vaga__professor=request.user)
    
    if acao == 'APROVAR':
        candidatura.status = 'APROVADO'
        msg = "Sucesso! O match foi realizado."
    elif acao == 'REJEITAR': 
        candidatura.status = 'REJEITADO'
        msg = "Candidatura marcada como não selecionada."
    else:
        return JsonResponse({'success': False, 'message': 'Ação inválida'})
        
    candidatura.save()
    
    return JsonResponse({'success': True, 'message': msg})

# API DETALHES (MODAL)
@login_required
def api_detalhes_candidatura(request, id_candidatura):
    # Busca a candidatura
    c = get_object_or_404(Candidatura, id=id_candidatura)
    
    # [REMOVIDO] A lógica de atualizar para 'VISUALIZADO' foi retirada.
    # O status agora se mantém inalterado ao apenas abrir o modal.

    # --- CÁLCULO DE SKILLS PARA O MODAL ---
    skills_vaga_objs = c.vaga.habilidades.all()
    lista_skills_formatada = []
    
    # Pega skills do aluno para comparar
    skills_aluno_ids = []
    if hasattr(c.aluno, 'perfil_aluno'):
        skills_aluno_ids = list(c.aluno.perfil_aluno.habilidades.values_list('id', flat=True))

    match_percent = 0
    skills_vaga_ids = set(s.id for s in skills_vaga_objs)
    
    if skills_vaga_ids:
        comum = set(skills_aluno_ids).intersection(skills_vaga_ids)
        match_percent = int((len(comum) / len(skills_vaga_ids)) * 100)
    elif not skills_vaga_ids:
        match_percent = 100

    # Monta lista visual (Verde se tem, Cinza se falta)
    for skill in skills_vaga_objs:
        tem_skill = skill.id in skills_aluno_ids
        lista_skills_formatada.append({
            'nome': skill.nome,
            'tem': tem_skill # True ou False
        })

    # Lógica para pegar o nome correto (Cadastro > FullName > Username)
    nome_real = c.aluno.username
    try:
        if hasattr(c.aluno, 'cadastro') and c.aluno.cadastro.nome:
            nome_real = c.aluno.cadastro.nome
        elif c.aluno.get_full_name():
            nome_real = c.aluno.get_full_name()
    except:
        pass

    data = {
        'id': c.id,
        'nome_aluno': nome_real, # Agora busca o nome do cadastro
        'nome_vaga': c.vaga.titulo,
        'nome_empresa': c.vaga.empresa,
        'email': c.aluno.email,
        'skills_detalhadas': lista_skills_formatada,
        'data': c.data_aplicacao.strftime('%d/%m/%Y'),
        'match_percent': match_percent,
        'status': c.status,
    }
    return JsonResponse(data)