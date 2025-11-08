from django.db import models

from django.db import models
from django.contrib.auth.models import User # <-- O Usuário padrão do Django

# -------------------------------------------------------------------
# O seu diagrama tinha 'usuario' e 'cadastro'.
# Vamos unificá-los em um modelo 'Cadastro' que "expande"
# o 'User' padrão do Django. O 'User' cuidará do login/senha,
# e o 'Cadastro' cuidará dos dados do seu sistema (matrícula, campus).
# -------------------------------------------------------------------

class Cadastro(models.Model):
    # Ligação 1-para-1: Cada User do Django terá um (e apenas um) 'Cadastro'
    # 'primary_key=True' diz que o ID do Cadastro será o mesmo ID do User
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    
    # --- Campos da tabela 'cadastro' ---
    nome = models.CharField(max_length=45)
    matricula = models.IntegerField(unique=True) # Garante que não haja matrículas repetidas
    campus = models.CharField(max_length=30)
    
    # --- Campo da tabela 'usuario' (tipoDoCadastro) ---
    TIPO_CHOICES = (
        (1, 'Aluno'),
        (2, 'Professor'),
    )
    tipoDoCadastro = models.IntegerField(choices=TIPO_CHOICES, default=1) # 1 = Aluno

    def __str__(self):
        # Isso ajuda a identificar o objeto no painel Admin do Django
        return self.nome