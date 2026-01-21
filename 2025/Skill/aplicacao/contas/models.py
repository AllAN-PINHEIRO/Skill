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
    
class Habilidade(models.Model):
    """
    Representa uma competência técnica (Ex: Java, Python, SQL).
    """
    nome = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nome

class PerfilAluno(models.Model):
    """
    Expansão do Aluno: Contém dados profissionais e link com User.
    """
    # Relacionamento 1-para-1 com o User do Django (igual ao Cadastro)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_aluno')
    
    resumo = models.TextField(blank=True, help_text="Breve resumo sobre você")
    linkedin = models.URLField(blank=True, null=True)
    github = models.URLField(blank=True, null=True)
    
    # Relacionamento Muitos-para-Muitos com Habilidade (via tabela intermediária)
    habilidades = models.ManyToManyField(Habilidade, through='HabilidadeAluno')

    def __str__(self):
        return f"Perfil de {self.user.username}"

class HabilidadeAluno(models.Model):
    """
    Tabela intermediária que guarda o nível de conhecimento (0-100%) da skill.
    """
    perfil = models.ForeignKey(PerfilAluno, on_delete=models.CASCADE)
    habilidade = models.ForeignKey(Habilidade, on_delete=models.CASCADE)
    nivel = models.IntegerField(default=0, help_text="Nível de 0 a 100")

    class Meta:
        unique_together = ('perfil', 'habilidade') # Evita duplicatas

class HabilidadeDestaque(models.Model):
    perfil = models.ForeignKey(PerfilAluno, on_delete=models.CASCADE, related_name='habilidades_destaque')
    titulo = models.CharField(max_length=50) # Ex: "Desenvolvimento Back-end"
    descricao = models.TextField(max_length=150) # Ex: "Construção de APIs robustas..."
    cor = models.CharField(max_length=20, default='gray') # 'green' ou 'gray'
    
    def __str__(self):
        return self.titulo