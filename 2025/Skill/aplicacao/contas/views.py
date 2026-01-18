# Imports para MVT (verifique se estão no topo do arquivo)
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404 # Essencial para MVT
from django.contrib.auth.models import User
from .models import Cadastro
from .models import PerfilAluno, Habilidade, HabilidadeAluno

# --- NOVOS IMPORTS PARA DRF ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
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
    Serve a página principal (dashboard) do Professor.
    """
    print(f"--- TENTATIVA DE ACESSO AO DASHBOARD PROFESSOR ---")
    print(f"Usuário: {request.user.email}")

    try:
        cadastro = get_object_or_404(Cadastro, user=request.user)
        print(f"Tipo do Cadastro no Banco: {cadastro.tipoDoCadastro}")

        if cadastro.tipoDoCadastro != 2:
            print(f"ACESSO NEGADO: Tipo {cadastro.tipoDoCadastro} não é 2 (Professor). Redirecionando para Home.")
            return redirect('home')

        print("ACESSO PERMITIDO: Renderizando dashboard-professor.html")
        context = {
            'nome_usuario': cadastro.nome 
        }
        return render(request, 'dashboard-professor.html', context)

    except Exception as e:
        print(f"ERRO CRÍTICO NO DASHBOARD: {e}")
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

# PEDAÇO A: HOME (O Miolo com Gráficos)
@login_required
def partial_home_view(request):
    # Lógica para o Gráfico (que já existia)
    labels = []
    data_values = []
    
    if hasattr(request.user, 'perfil_aluno'):
        skills = HabilidadeAluno.objects.filter(perfil=request.user.perfil_aluno).order_by('-nivel')
        for s in skills:
            labels.append(s.habilidade.nome)
            data_values.append(s.nivel)
            
    context = {
        'skill_labels': labels,
        'skill_data': data_values
    }
    return render(request, 'partials/home.html', context)


# PEDAÇO B: PERFIL (Visualização)
@login_required
def partial_perfil_view(request):
    # Usa seu serializer para formatar os dados bonitinhos
    serializer = MeuPerfilSerializer(request.user)
    return render(request, 'partials/perfil.html', {'dados': serializer.data})


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

# --- VIEWS DE API (DRF) - As novas versões ---

class LoginAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'message': 'Email e senha são obrigatórios.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # A "Correção": A chamada deve ser 'is_institutional_email' (minúsculo)
        if not is_institutional_email(email):
            return Response({'message': 'Por favor, use um email institucional válido.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)

        if user:
            # ============================================================
            # CORREÇÃO BLINDADA DE SESSÃO
            # ============================================================
            # 1. Usamos 'request._request' para garantir que o Django 
            #    manipule a sessão HTTP padrão, não a do DRF.
            login(request._request, user)
            
            # 2. Forçamos o salvamento da sessão no banco de dados agora.
            request._request.session.save()
            
            print(f"Sessão criada para: {user.email}") # Log de confirmação
            # ============================================================

            try:
                user_type = user.cadastro.tipoDoCadastro
                # --- LÓGICA DE VERIFICAÇÃO DE PERFIL ---
                tem_perfil = False
                if user_type == 1: # Se for Aluno
                    # Verifica se existe a relação 'perfil_aluno' criada
                    tem_perfil = hasattr(user, 'perfil_aluno')
                # ---------------------------------------
            except Cadastro.DoesNotExist:
                return Response(
                    {'message': 'Erro: Usuário autenticado mas sem perfil de cadastro.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
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
    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save() 
            return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class ForgotPasswordAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'message': 'O campo de e-mail é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # A "Correção": A chamada deve ser 'is_institutional_email' (minúsculo)
        if not is_institutional_email(email):
            return Response(
                {'message': 'Este e-mail não é institucional.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {'message': 'Este e-mail não está cadastrando em nosso sistema.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        reset_path = f'/auth/reset-password/{uid}/{token}/'
        reset_link = request.build_absolute_uri(reset_path)

        subject = 'Redefinição de Senha - Match Skills'
        message = (
            f'Olá, {user.cadastro.nome}!\n\n' # Corrigido para user.cadastro.nome
            f'Você solicitou uma redefinição de senha. Clique no link abaixo para redefinir sua senha:\n\n'
            f'{reset_link}\n\n'
            f'Se você não solicitou isso, ignore este email.\n\n'
            f'Atenciosamente,\nEquipe Match Skills'
        )

        try:
            send_mail(
                subject,
                message,
                'naoresponda@matchskills.com',
                [email],
                fail_silently=False,
            ) 
        except Exception as e:
            print(f"Erro ao enviar email: {e}")
            return Response(
                {'message': 'Erro interno ao tentar enviar o e-mail.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'Se um usuário com esse email existir, um link de redefinição de senha será enviado.'}, status=status.HTTP_200_OK)
    
class ResetPasswordAPIView(APIView):
    def post(self, request):
         # Passa os dados do JSON (request.data) para o serializer
        serializer = PasswordResetSerializer(data=request.data)
            
        # 1. 'is_valid()' chama a função 'validate' do serializer
        if serializer.is_valid():
             # 2. 'save()' chama a função 'save' do serializer
            serializer.save()
            return Response(
                {'message': 'Senha redefinida com sucesso! Você já pode fazer login.'}, status=status.HTTP_200_OK)
            
            # 3. Se a validação falhar (senhas não batem, token inválido),
            # o serializer envia os erros.
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# 2. VIEW DA API (Salvar dados)
class CompletarPerfilAPIView(APIView):
    permission_classes = [IsAuthenticated] # Só quem está logado pode acessar

    def post(self, request):
        user = request.user
        data = request.data

        try:
            # 1. Cria o PerfilAluno
            perfil = PerfilAluno.objects.create(
                user=user,
                resumo=data.get('resumo', ''),
                linkedin=data.get('linkedin', ''),
                github=data.get('github', '')
            )

            # 2. Salva as Habilidades
            skills_data = data.get('skills', []) # Espera uma lista: [{'id': 1, 'nivel': 80}, ...]
            
            for skill_item in skills_data:
                habilidade_id = skill_item.get('id')
                nivel = skill_item.get('nivel')
                
                if habilidade_id and nivel:
                    habilidade = Habilidade.objects.get(id=habilidade_id)
                    HabilidadeAluno.objects.create(
                        perfil=perfil,
                        habilidade=habilidade,
                        nivel=nivel
                    )

            return Response({'message': 'Perfil criado com sucesso!'}, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Erro ao salvar perfil: {e}")
            return Response({'message': 'Erro ao processar dados.'}, status=status.HTTP_400_BAD_REQUEST)
        
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
        