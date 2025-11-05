# Imports para MVT (verifique se estão no topo do arquivo)
import json
from django.http import JsonResponse
from django.shortcuts import render, redirect # Essencial para MVT
from django.contrib.auth import authenticate, login
from django.db import IntegrityError
from .models import Cadastro
from django.contrib.auth.models import User
# Remova: from django.views.decorators.csrf import csrf_exempt
# Remova: import json

def homepage_view(request):
    # Esta função simplesmente diz ao Django:
    # "Encontre o arquivo 'index.html' na pasta 'templates' e o retorne"
    return render(request, 'index.html')

def login_page_view(request):
    """Serve a "casca" da página de login 'login.html'."""
    return render(request, 'login.html')

def api_login_view(request):
    """
    API que processa o login (via JSON) e retorna JSON.
    Esta view usa a segurança CSRF do Django.
    """
    if request.method == 'POST':
        try:
            # Carrega o JSON do corpo da requisição
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return JsonResponse({'message': 'Email e senha são obrigatórios'}, status=400)

            # Encontra o usuário pelo email (O "M" do MVT)
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return JsonResponse({'message': 'Usuário não encontrado'}, status=401)
            
            # Autentica (A "Segurança do Django")
            authenticated_user = authenticate(request, username=user.username, password=password)

            if authenticated_user is not None:
                login(request, authenticated_user) # Cria a sessão
                return JsonResponse({'message': 'Login bem-sucedido'}, status=200)
            else:
                return JsonResponse({'message': 'Senha incorreta'}, status=401)

        except Exception as e:
            return JsonResponse({"message": f"Erro: {str(e)}"}, status=500)
    
    return JsonResponse({"message": "Método não permitido"}, status=405)

def register_page_view(request):
    """Serve a "casca" da página de registro 'register.html'."""
    return render(request, 'register.html')

def api_register_view(request):
    """
    API que processa o registro (via JSON) e retorna JSON.
    Esta view usa a segurança CSRF do Django.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            nome_cadastro = data.get('nome')
            matricula = data.get('matricula')
            campus = data.get('campus')
            
            # O 'username' do Django é obrigatório. Vamos usar o email.
            username = email

            # Validação básica
            if not all([email, password, nome_cadastro, matricula, campus]):
                return JsonResponse({'message': 'Todos os campos são obrigatórios'}, status=400)

            # 1. Tenta criar o User (cuida da senha criptografada)
            try:
                new_user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password
                )
            except IntegrityError:
                return JsonResponse({'message': 'Este email já está cadastrado.'}, status=400)

            # 2. Tenta criar o Cadastro (perfil) e ligar ao User
            try:
                Cadastro.objects.create(
                    user=new_user,
                    nome_cadastro=nome_cadastro,
                    matricula=matricula,
                    campus=campus,
                    tipoDoCadastro=1 # Define como Aluno (tipo 1) por padrão
                )
            except IntegrityError:
                # Se a matrícula já existe, apaga o User que acabamos de criar.
                # Isso é um "rollback" manual.
                new_user.delete()
                return JsonResponse({'message': 'Esta matrícula já está cadastrada.'}, status=400)
            except Exception as e:
                # Se outro erro ocorrer, também faz o rollback
                new_user.delete()
                return JsonResponse({'message': f'Erro ao criar cadastro: {e}'}, status=500)

            # Se tudo deu certo
            return JsonResponse({'message': 'Usuário cadastrado com sucesso! Você já pode fazer o login.'}, status=201)

        except json.JSONDecodeError:
            return JsonResponse({"message": "JSON inválido"}, status=400)
        except Exception as e:
            # Captura qualquer outro erro
            return JsonResponse({"message": f"Erro inesperado: {str(e)}"}, status=500)

    return JsonResponse({"message": "Método não permitido"}, status=405)