from django.db import models
from django.contrib.auth.models import User
from contas.models import Habilidade 

# --- ATENÇÃO: NÃO COLOQUE 'from .models import Vaga' AQUI! ---

class Vaga(models.Model):
    # --- OPÇÕES ATUALIZADAS PARA O NOVO LAYOUT ---
    STATUS_CHOICES = (
        ('ABERTA', 'Aberta'),
        ('EM_ANDAMENTO', 'Em Andamento (Futuro)'),
        ('EM_ESPERA', 'Em Espera'),
        ('CANCELADA', 'Cancelada'),
        ('FECHADA', 'Encerrada'), # Mantido para compatibilidade
    )
    
    MODALIDADE_CHOICES = (
        ('PRESENCIAL', 'Presencial'),
        ('HIBRIDO', 'Híbrido'),
        ('REMOTO', 'Remoto'),
    )

    TIPO_VAGA_CHOICES = (
        ('ESTAGIO', 'Estágio'),
        ('JUNIOR', 'Júnior'),
        ('PLENO', 'Pleno'),
        ('SENIOR', 'Sênior'),
    )

    professor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vagas_criadas', null=True, blank=True)
    
    # Habilidades para o Match (Relacionamento M2M)
    habilidades = models.ManyToManyField(Habilidade, related_name='vagas', blank=True)

    titulo = models.CharField(max_length=100, verbose_name="Cargo")
    empresa = models.CharField(max_length=100)
    
    # Novos Campos Solicitados
    cidade = models.CharField(max_length=100, default="Não informada") 
    modalidade = models.CharField(max_length=20, choices=MODALIDADE_CHOICES, default='PRESENCIAL')
    
    # Mapeamento: 'Sobre a vaga' será salvo em 'descricao'
    descricao = models.TextField(verbose_name="Sobre a Vaga")
    
    # Mantivemos 'requisitos' como texto caso queira algo extra, mas o match será via 'habilidades'
    requisitos = models.TextField(blank=True, null=True) 
    
    tipo = models.CharField(max_length=20, choices=TIPO_VAGA_CHOICES, default='ESTAGIO')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABERTA')
    
    data_limite = models.DateField(null=True, blank=True)
    link_externo = models.URLField(blank=True, null=True)
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.titulo} - {self.empresa}"

class Candidatura(models.Model):
    # ... (seu código da classe Candidatura) ...
    STATUS_CANDIDATURA = (
        ('ENVIADO', 'Candidatura Enviada'),
        ('VISUALIZADO', 'Visualizado'),
        ('ENTREVISTA', 'Entrevista'),
        ('APROVADO', 'Aprovado'),
        ('REJEITADO', 'Não Selecionado'),
    )

    aluno = models.ForeignKey(User, on_delete=models.CASCADE, related_name='minhas_candidaturas')
    vaga = models.ForeignKey(Vaga, on_delete=models.CASCADE, related_name='candidatos')
    data_aplicacao = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CANDIDATURA, default='ENVIADO')
    match_percent = models.IntegerField(default=0)
    curriculo_pdf = models.FileField(upload_to='curriculos/', null=True, blank=True)

    class Meta:
        unique_together = ('aluno', 'vaga')

    def __str__(self):
        return f"{self.aluno.first_name} -> {self.vaga.titulo}"