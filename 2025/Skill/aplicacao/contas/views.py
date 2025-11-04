# Imports para MVT (verifique se estão no topo do arquivo)
from django.shortcuts import render, redirect # Essencial para MVT
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
# Remova: from django.views.decorators.csrf import csrf_exempt
# Remova: import json

def homepage_view(request):
    # Esta função simplesmente diz ao Django:
    # "Encontre o arquivo 'index.html' na pasta 'templates' e o retorne"
    
    # Define o "contexto" (dados a enviar para o HTML). Por enquanto, está vazio.
    contexto = {} 
    
    return render(request, 'index.html', contexto)

def login_view(request):
    # Caminho 1: Se o usuário está enviando o formulário
    if request.method == 'POST':
        
        # 1. Pega os dados do formulário HTML (NÃO MAIS JSON)
        email = request.POST.get('email')
        password = request.POST.get('password')

        if not email or not password:
            context = {'error_message': 'Por favor, preencha o email e a senha.'}
            return render(request, 'login.html', context)

        # 2. Verifica o email (Usando o Model)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            context = {'error_message': 'Usuário não encontrado.'}
            return render(request, 'login.html', context)
        
        # 3. Autentica (Usando o sistema do Django)
        authenticated_user = authenticate(request, username=user.username, password=password)

        if authenticated_user is not None:
            # 4. Faz o login e REDIRECIONA para a homepage
            login(request, authenticated_user)
            # 'home' é o 'name' da sua homepage no urls.py
            return redirect('home') 
        else:
            # 5. Devolve a página de login com uma mensagem de erro
            context = {'error_message': 'Senha incorreta.'}
            return render(request, 'login.html', context)

    # Caminho 2: Se o usuário está apenas visitando a página
    else:
        # Apenas mostre a página de login em branco
        return render(request, 'login.html')

# (Faça o mesmo para a register_view)