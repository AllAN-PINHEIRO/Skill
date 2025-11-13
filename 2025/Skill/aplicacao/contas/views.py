# Imports para MVT (verifique se estão no topo do arquivo)
from django.http import HttpResponse
from django.shortcuts import render, redirect # Essencial para MVT
from django.contrib.auth.models import User
from .models import Cadastro

# --- NOVOS IMPORTS PARA DRF ---
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CadastroSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

# --- VIEWS DE PÁGINA (MVT) - Permanecem as mesmas ---
def homepage_view(request):
    # Esta função simplesmente diz ao Django:
    # "Encontre o arquivo 'index.html' na pasta 'templates' e o retorne"
    return render(request, 'index.html')

def login_page_view(request):
    """Serve a "casca" da página de login 'login.html'."""
    return render(request, 'login.html')

def register_page_view(request):
    """Serve a "casca" da página de registro 'register.html'."""
    return render(request, 'register.html')

def forgot_password_page_view(request):
    return render(request, 'forgot-password.html')

# --- VIEWS DE API (DRF) - As novas versões ---

class LoginAPIView(APIView):
    """
    API de Login com DRF. Recebe email e senha, retorna tokens JWT
    e o TIPO DE USUÁRIO.
    """
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        # Usamos o email como username para autenticar
        user = authenticate(username=email, password=password)

        if user:
            # --- A "CORREÇÃO" ESTÁ AQUI ---
            
            # 1. O usuário está autenticado, agora buscamos o 'Cadastro' dele.
            try:
                # O Django acessa o 'Cadastro' ligado ao 'user'
                # (Isso funciona por causa do OneToOneField)
                user_type = user.cadastro.tipoDoCadastro
            except Cadastro.DoesNotExist:
                # Caso de fallback (não deve acontecer se o registro estiver correto)
                return Response(
                    {'message': 'Erro: Usuário autenticado mas sem perfil de cadastro.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 2. Geramos os tokens
            refresh = RefreshToken.for_user(user)

            # 3. Retornamos TUDO no JSON
            return Response({
                'message': 'Login bem-sucedido!',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_type': user_type  # <-- ADICIONADO (ex: 1 para Aluno, 2 para Professor)
            })
        
        # Se 'user' for None (senha errada ou email não existe)
        return Response({'message': 'Email ou senha inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)

class RegisterAPIView(APIView):
    """
    API de Registro com DRF. Usa o CadastroSerializer para fazer todo o trabalho pesado.
    """
    def post(self, request):
        serializer = CadastroSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save() # <-- A mágica acontece aqui! Chama o .create() do serializer.
            return Response({'message': 'Usuário criado com sucesso!'}, status=status.HTTP_201_CREATED)
        
        # Se a validação falhar, o DRF retorna um JSON com todos os erros.
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class ForgotPasswordAPIView(APIView):
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'Se um usuário com esse email existir, um link de redefinição de senha será enviado.'}, status=status.HTTP_200_OK)
        
        user = User.objects.filter(email=email).first()

        if user:
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_path = f'/auth/reset-password-confirm/{uid}/{token}/'
            reset_link = request.build_absolute_uri(reset_path)

            subject = 'Redefinição de Senha - Match Skills'
            message = (
                f'Olá, {user.username}!\n\n'
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
                # Log the exception (in real applications, consider logging this to a file)
                print(f"Erro ao enviar email: {e}")

        return Response({'Se um usuário com esse email existir, um link de redefinição de senha será enviado.'}, status=status.HTTP_200_OK)