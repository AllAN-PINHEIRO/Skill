# Imports para MVT (verifique se estão no topo do arquivo)
import json
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404 # Essencial para MVT
from django.contrib.auth.models import User
import requests
from .models import PerfilAluno, Habilidade, HabilidadeAluno, Cadastro, Certificado, HabilidadeDestaque, PerfilProfessor

# --- NOVOS IMPORTS PARA DRF ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import CadastroSerializer, MeuPerfilSerializer, PasswordResetSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.decorators import login_required
from .utils import is_institutional_email 
from django.contrib.auth import logout

# --- VIEWS DE PÁGINA (MVT) - Permanecem as mesmas ---
def homepage_view(request):
    return render(request, 'index.html')

def login_page_view(request):
    return render(request, 'login.html')

def register_page_view(request):
    return render(request, 'register.html')

def forgot_password_page_view(request):
    return render(request, 'forgot-password.html')

def reset_password_page_view(request, uidb64, token):
    context = {'uidb64': uidb64,'token': token}
    return render(request, 'reset-password.html', context)

# ==============================================================================
# 1. A PORTA DE ENTRADA (ANTIGA dashboard_aluno_page_view)
# Agora ela serve a CASCA (SHELL) do sistema.
# ==============================================================================
@login_required(login_url='/auth/login/')
def dashboard_shell_view(request): # Você pode manter o nome antigo se preferir
    """
    Serve a estrutura base (Menu + Topo + JS).
    O conteúdo do meio será carregado via AJAX depois.
    """
    print(f"--- ACESSO AO DASHBOARD (SHELL) ---")
    
    try:
        cadastro = get_object_or_404(Cadastro, user=request.user)
        
        # 1. Verificação de Segurança (Só Aluno)
        if cadastro.tipoDoCadastro != 1:
            print("ACESSO NEGADO: Não é aluno.")
            return redirect('home')

        # NOTA: Removemos o 'if not hasattr... redirect' 
        # Motivo: Se não tiver perfil, a Home vai mostrar o botão "Cadastrar Agora"
        # e o formulário abrirá dentro do dashboard, sem sair da tela.

        context = {
            'nome_usuario': cadastro.nome 
        }
        # Renderiza a CASCA nova que criamos
        return render(request, 'dashboard-aluno.html', context)
        
    except Exception as e:
        print(f"ERRO: {e}")
        return redirect('home')


@login_required(login_url='/auth/login/') 
def dashboard_professor_page_view(request):
    """
    Serve a página principal do Professor com verificação de primeiro acesso.
    """
    try:
        cadastro = get_object_or_404(Cadastro, user=request.user)

        if cadastro.tipoDoCadastro != 2:
            return redirect('home')

        # Lógica de Primeiro Acesso:
        # Se NÃO tem perfil criado, é o primeiro acesso (True)
        primeiro_acesso = not hasattr(request.user, 'perfil_professor')

        context = {
            'nome_usuario': cadastro.nome,
            'primeiro_acesso': primeiro_acesso 
        }
        return render(request, 'dashboard-professor.html', context)

    except Exception as e:
        print(f"ERRO: {e}")
        return redirect('home')
    

# 1. VIEW DA PÁGINA (HTML)
@login_required(login_url='/auth/login/')
def completar_perfil_page_view(request):
    """
    Renderiza a página de cadastro de perfil.
    Passamos as habilidades cadastradas para preencher o <select> no HTML.
    """
    # Verifica se já tem perfil para evitar acesso duplicado
    if hasattr(request.user, 'perfil_aluno'):
        return redirect('contas:dashboard-aluno')

    # Busca todas as skills do banco para o aluno escolher
    habilidades = Habilidade.objects.all()
    
    context = {
        'habilidades': habilidades
    }
    return render(request, 'completar-perfil.html', context)

# ==============================================================================
# 2. OS PEDAÇOS (PARTIALS) - Chamados pelo JavaScript
# ==============================================================================

@login_required
def partial_home_view(request):
    labels = []
    data_values = []
    tem_skills = False
    
    # 1. BUSCAR O NOME DO USUÁRIO (Correção)
    nome_aluno = "Aluno"
    try:
        cadastro = Cadastro.objects.get(user=request.user)
        nome_aluno = cadastro.nome
    except Cadastro.DoesNotExist:
        pass

    # Lógica do Gráfico (Mantida)
    if hasattr(request.user, 'perfil_aluno'):
        perfil = request.user.perfil_aluno
        skills = HabilidadeAluno.objects.filter(perfil=perfil).order_by('-nivel')
        
        if skills.exists():
            tem_skills = True
            for s in skills:
                labels.append(s.habilidade.nome)
                try:
                    nivel_int = int(s.nivel)
                except:
                    nivel_int = 0
                data_values.append(nivel_int)

    # 2. ENVIAR 'dados' NO CONTEXTO (Correção)
    context = {
        'dados': {'nome': nome_aluno}, # <--- O HTML espera {{ dados.nome }}
        'skill_labels': json.dumps(labels),
        'skill_data': json.dumps(data_values),
        'tem_skills': tem_skills
    }
    return render(request, 'partials/home.html', context)


# PEDAÇO B: PERFIL (Visualização)
@login_required
def partial_perfil_view(request):
    # Usa seu serializer para formatar os dados bonitinhos
    serializer = MeuPerfilSerializer(request.user)
    # --- NOVO: BUSCA OS CERTIFICADOS PARA O SLIDER ---
    certificados = []
    if hasattr(request.user, 'perfil_aluno'):
        certificados = request.user.perfil_aluno.certificados.all().order_by('-id')
        
    return render(request, 'partials/perfil.html', {
        'dados': serializer.data,
        'certificados': certificados # <--- PASSAR PARA O HTML
    })


# PEDAÇO C: EDITAR/CADASTRAR (ANTIGA completar_perfil_page_view)
@login_required
def partial_editar_perfil_view(request):
    """
    Antiga 'completar_perfil_page_view'.
    Agora retorna apenas o <form> HTML para ser injetado no dashboard.
    """
    # Busca habilidades para o <select> (Lógica original mantida)
    habilidades = Habilidade.objects.all()
    
    # Se já tiver perfil, mandamos os dados para preencher os campos (Edição)
    perfil = getattr(request.user, 'perfil_aluno', None)
    
    context = {
        'habilidades': habilidades,
        'perfil': perfil
    }
    # Renderiza apenas o pedaço do formulário
    return render(request, 'partials/form-perfil.html', context)

# 1. ATUALIZE A VIEW DE LEITURA (partial_portfolio_view)
@login_required
def partial_portfolio_view(request):
    serializer = MeuPerfilSerializer(request.user)
    
    destaques = []
    certificados = []
    
    if hasattr(request.user, 'perfil_aluno'):
        # Pega os 4 destaques
        destaques = request.user.perfil_aluno.habilidades_destaque.all()[:4]
        # Pega todos os certificados
        certificados = request.user.perfil_aluno.certificados.all()

    context = {
        'dados': serializer.data,
        'destaques': destaques,
        'certificados': certificados # <--- PASSAR PARA O HTML
    }
    return render(request, 'partials/portfolio.html', context)

@login_required
def api_salvar_destaque(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            perfil = request.user.perfil_aluno
            
            # Se vier um ID, é EDIÇÃO. Se não, é CRIAÇÃO.
            destaque_id = data.get('id')
            
            if destaque_id:
                # Atualizar existente
                destaque = get_object_or_404(HabilidadeDestaque, id=destaque_id, perfil=perfil)
                destaque.titulo = data.get('titulo')
                destaque.descricao = data.get('descricao')
                destaque.cor = data.get('cor')
                destaque.save()
            else:
                # Criar novo (Limite de 4 cards para não quebrar layout)
                if perfil.habilidades_destaque.count() >= 4:
                    return JsonResponse({'success': False, 'message': 'Limite de 4 habilidades atingido.'}, status=400)
                
                HabilidadeDestaque.objects.create(
                    perfil=perfil,
                    titulo=data.get('titulo'),
                    descricao=data.get('descricao'),
                    cor=data.get('cor')
                )
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    return JsonResponse({'success': False}, status=400)

@login_required
def api_excluir_destaque(request, destaque_id):
    if request.method == 'POST':
        try:
            destaque = get_object_or_404(HabilidadeDestaque, id=destaque_id, perfil=request.user.perfil_aluno)
            destaque.delete()
            return JsonResponse({'success': True})
        except:
            return JsonResponse({'success': False}, status=400)
        
# 2. NOVA API PARA SALVAR CERTIFICADO
@login_required
def api_salvar_certificado(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            perfil = request.user.perfil_aluno
            cert_id = data.get('id')
            titulo = data.get('titulo', '').strip()
            instituicao = data.get('instituicao', '').strip()
            horas = data.get('horas', '').strip()
            link = data.get('link', '').strip() 

            if not titulo or not instituicao:
                return JsonResponse({'success': False, 'message': 'Preencha o nome do curso e a instituição.'}, status=400)

            if cert_id and str(cert_id).strip() != "":
                # EDIÇÃO
                cert = get_object_or_404(Certificado, id=cert_id, perfil=perfil)
                cert.titulo = titulo
                cert.instituicao = instituicao
                cert.horas = horas
                cert.link_certificado = link # Salva o link
                cert.save()
            else:
                # CRIAÇÃO
                Certificado.objects.create(
                    perfil=perfil,
                    titulo=titulo,
                    instituicao=instituicao,
                    horas=horas,
                    link_certificado=link # Salva o link
                )
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
    return JsonResponse({'success': False}, status=405)

# Não esqueça da função de excluir também
@login_required
def api_excluir_certificado(request, cert_id):
    if request.method == 'POST':
        try:
            # Garante que só exclui se pertencer ao usuário logado
            cert = get_object_or_404(Certificado, id=cert_id, perfil=request.user.perfil_aluno)
            cert.delete()
            return JsonResponse({'success': True})
        except Exception as e:
             return JsonResponse({'success': False, 'message': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)

@login_required
def api_github_repos(request):
    try:
        perfil = request.user.perfil_aluno
        github_url = perfil.github
        
        if not github_url:
            return JsonResponse({'success': False, 'message': 'GitHub não cadastrado.'})

        # 1. Extrair o username da URL (aceita formatos variados)
        # Ex: https://github.com/usuario/ -> usuario
        username = github_url.rstrip('/').split('/')[-1]
        
        if not username:
             return JsonResponse({'success': False, 'message': 'Username inválido.'})

        # 2. Consumir API do GitHub (Buscando repos públicos)
        url_api = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=6"
        response = requests.get(url_api, timeout=5)

        if response.status_code == 200:
            repos_raw = response.json()
            repos_clean = []
            
            for repo in repos_raw:
                repos_clean.append({
                    'name': repo['name'],
                    'description': repo['description'] or "Sem descrição.",
                    'language': repo['language'] or "Outros",
                    'stars': repo['stargazers_count'],
                    'url': repo['html_url'],
                    'updated_at': repo['updated_at']
                })
            
            return JsonResponse({'success': True, 'repos': repos_clean})
        else:
            return JsonResponse({'success': False, 'message': 'Usuário GitHub não encontrado.'})

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)})

# --- VIEWS DE API (DRF) - As novas versões ---

class LoginAPIView(APIView):
    # LIBERA O ACESSO PÚBLICO (Correção do Erro 401)
    permission_classes = [AllowAny] 

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'message': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not is_institutional_email(email):
            return Response({'message': 'Por favor, use um email institucional válido.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)

        if user:
            # Mantém a sessão do Django ativa (híbrido)
            login(request._request, user)
            request._request.session.save()
            
            print(f"Sessão criada para: {user.email}") 

            try:
                user_type = user.cadastro.tipoDoCadastro
                tem_perfil = False
                if user_type == 1: 
                    tem_perfil = hasattr(user, 'perfil_aluno')
            except Cadastro.DoesNotExist:
                return Response({'message': 'Erro: Usuário sem cadastro.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Gera o Token JWT
            refresh = RefreshToken.for_user(user)

            return Response({
                'message': 'Login bem-sucedido!',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_type': user_type,
                'tem_perfil': tem_perfil
            })
        
        return Response({'message': 'Email ou senha inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # 2. API PARA SAIR (LOGOUT)
class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # 1. Invalida o refresh token (Opcional, se estiver usando blacklist app)
            # refresh_token = request.data.get("refresh")
            # token = RefreshToken(refresh_token)
            # token.blacklist()

            # 2. Mata a sessão do Django (Importante pois usamos sessão híbrida)
            logout(request)
            
            return Response({'message': 'Logout realizado com sucesso.'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({'message': 'Erro ao realizar logout.'}, status=status.HTTP_400_BAD_REQUEST)

class RegisterAPIView(APIView):
    # LIBERA O ACESSO PÚBLICO (Para criar conta não precisa estar logado)
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save() 
            return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class ForgotPasswordAPIView(APIView):
    # LIBERA O ACESSO PÚBLICO (Esqueci a senha)
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'message': 'O campo de e-mail é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not is_institutional_email(email):
            return Response({'message': 'Este e-mail não é institucional.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()

        if not user:
            return Response({'message': 'Este e-mail não está cadastrando.'}, status=status.HTTP_404_NOT_FOUND)
        
        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Ajuste para URL absoluta se necessário, mas o path relativo funciona se for o mesmo domínio
        reset_path = f'/auth/reset-password/{uid}/{token}/'
        reset_link = request.build_absolute_uri(reset_path)

        subject = 'Redefinição de Senha - Match Skills'
        message = f'Olá, {user.cadastro.nome}!\n\nClique para redefinir: {reset_link}'

        try:
            send_mail(subject, message, 'naoresponda@matchskills.com', [email], fail_silently=False) 
        except Exception as e:
            return Response({'message': 'Erro interno ao enviar e-mail.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'Link de redefinição enviado.'}, status=status.HTTP_200_OK)
    
class ResetPasswordAPIView(APIView):
    # LIBERA O ACESSO PÚBLICO (Redefinir a senha)
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Senha redefinida com sucesso!'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# 2. VIEW DA API (Salvar dados)
@login_required
def api_completar_perfil(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = request.user

            # 1. get_or_create: A mágica que corrige o erro.
            # Se o perfil existe, ele pega. Se não, ele cria.
            perfil, created = PerfilAluno.objects.get_or_create(user=user)

            # 2. Atualiza os dados básicos
            perfil.resumo = data.get('resumo', '')
            perfil.linkedin = data.get('linkedin', '')
            perfil.github = data.get('github', '')
            perfil.save()

            # 3. Atualiza as Skills (Apaga as velhas e cria as novas)
            skills_data = data.get('skills', [])
            
            if skills_data:
                # Limpa skills anteriores para não duplicar (ex: ter 2x Java)
                HabilidadeAluno.objects.filter(perfil=perfil).delete()

                for skill_item in skills_data:
                    habilidade_id = skill_item.get('id')
                    nivel = skill_item.get('nivel')
                    
                    if habilidade_id and nivel:
                        # Busca o objeto Habilidade (Java, Python...)
                        habilidade_obj = Habilidade.objects.get(id=habilidade_id)
                        
                        HabilidadeAluno.objects.create(
                            perfil=perfil,
                            habilidade=habilidade_obj,
                            nivel=nivel
                        )

            return JsonResponse({'success': True, 'message': 'Perfil salvo com sucesso!'})

        except Exception as e:
            print(f"Erro ao salvar perfil: {e}") # Log no terminal
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Método não permitido'}, status=405)
        
# 1. API PARA PEGAR OS DADOS (GET)
class MeuPerfilAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            # Serializa o usuário atual usando o serializer unificado
            serializer = MeuPerfilSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'message': f'Erro ao recuperar perfil: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
@login_required
def api_salvar_perfil_professor(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # get_or_create: Se o perfil não existir, ele cria. Se existir, ele pega.
            perfil, created = PerfilProfessor.objects.get_or_create(user=request.user)
            
            perfil.bio = data.get('bio', '')
            perfil.telefone = data.get('telefone', '')
            perfil.save()
            
            return JsonResponse({'success': True, 'message': 'Dados salvos com sucesso!'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)
            
    return JsonResponse({'success': False}, status=405)
        