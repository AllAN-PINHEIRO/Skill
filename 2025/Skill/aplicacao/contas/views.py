from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import bd
import bcrypt

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            conexao = bd.conectar_bd()
            cursor = conexao.cursor(dictionary=True)

            query = "SELECT * FROM usuario WHERE email_usu = %s"
            cursor.execute(query, (username,))
            usuario = cursor.fetchone()

            if usuario:
                # Verifica senha usando bcrypt
                if bcrypt.checkpw(password.encode(), usuario['senha'].encode()):
                    resposta = {'message': 'Login bem-sucedido'}
                    status_code = 200
                else:
                    resposta = {'message': 'Senha incorreta'}
                    status_code = 401
            else:
                resposta = {'message': 'Usuário não encontrado'}
                status_code = 401

            cursor.close()
            conexao.close()

            return JsonResponse(resposta, status=status_code)

        except Exception as e:
            return JsonResponse({"message": f"Erro: {str(e)}"}, status=400)

    return JsonResponse({"message": "Método não permitido"}, status=405)


def teste_conexao(request):
    try:
        conexao = bd.criar_conexao()
        cursor = conexao.cursor()
        cursor.execute("SELECT 1")  # Query simples só para testar
        resultado = cursor.fetchone()
        cursor.close()
        conexao.close()

        return JsonResponse({"status": "OK", "resultado": resultado})

    except Exception as e:
        return JsonResponse({"status": "ERRO", "mensagem": str(e)})

