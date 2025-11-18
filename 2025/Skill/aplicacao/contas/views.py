# Imports para MVT (verifique se estão no topo do arquivo)
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404 # Essencial para MVT
from django.contrib.auth.models import User
from .models import Cadastro

# --- NOVOS IMPORTS PARA DRF ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CadastroSerializer, PasswordResetSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.decorators import login_required
from .utils import is_institutional_email 

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

@login_required(login_url='/auth/login/') 
def dashboard_aluno_page_view(request):
    """
    Serve a página principal (dashboard) do Aluno.
    """
    # DIAGNÓSTICO: Quem está tentando entrar?
    print(f"--- TENTATIVA DE ACESSO AO DASHBOARD ALUNO ---")
    print(f"Usuário: {request.user.email}")
    
    try:
        cadastro = get_object_or_404(Cadastro, user=request.user)
        print(f"Tipo do Cadastro no Banco: {cadastro.tipoDoCadastro}")
        
        # Verifica o tipo (Lembre-se: 1=Aluno, 2=Professor)
        if cadastro.tipoDoCadastro != 1:
            print(f"ACESSO NEGADO: Tipo {cadastro.tipoDoCadastro} não é 1 (Aluno). Redirecionando para Home.")
            return redirect('home') 

        print("ACESSO PERMITIDO: Renderizando dashboard-aluno.html")
        context = {
            'nome_usuario': cadastro.nome 
        }
        return render(request, 'dashboard-aluno.html', context)
        
    except Exception as e:
        print(f"ERRO CRÍTICO NO DASHBOARD: {e}")
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
                'user_type': user_type 
            })
        
        return Response({'message': 'Email ou senha inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)

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