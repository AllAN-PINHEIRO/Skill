# Em aplicacao/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cadastro
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from .models import Habilidade, PerfilAluno, HabilidadeAluno

# A "Correção": O import deve ser 'is_institutional_email' (minúsculo)
from .utils import is_institutional_email

class CadastroSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    confirmEmail = serializers.EmailField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirmPassword = serializers.CharField(write_only=True, required=True)
    tipoDoCadastro = serializers.ChoiceField(choices=Cadastro.TIPO_CHOICES, required=True)

    class Meta:
        model = Cadastro
        fields = [
            'nome', 
            'matricula', 
            'campus', 
            'email', 
            'confirmEmail', 
            'password', 
            'confirmPassword',
            'tipoDoCadastro'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'confirmPassword': {'write_only': True},
            'confirmEmail': {'write_only': True},
        }


    def validate(self, attrs):
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})
        
        if attrs['email'] != attrs['confirmEmail']:
            raise serializers.ValidationError({"email": "Os e-mails não coincidem."})

        email = attrs['email']

        # A "Correção": A chamada deve ser 'is_institutional_email' (minúsculo)
        if not is_institutional_email(email):
            raise serializers.ValidationError({"email": "O e-mail deve ser institucional (ex: @ifba.edu.br ou @gmail.com)."})
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Este email já está cadastrado."})
        
        if Cadastro.objects.filter(matricula=attrs['matricula']).exists():
            raise serializers.ValidationError({"matricula": "Esta matrícula já está cadastrada."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirmPassword')
        validated_data.pop('confirmEmail')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        
        nome = validated_data.pop('nome')
        matricula = validated_data.pop('matricula')
        campus = validated_data.pop('campus')
        tipoDoCadastro = validated_data.pop('tipoDoCadastro')

        user = User.objects.create_user(
            username=email, 
            email=email, 
            password=password
        )

        cadastro = Cadastro.objects.create(
            user=user, 
            nome=nome,
            matricula=matricula,
            campus=campus,
            tipoDoCadastro=tipoDoCadastro
        )
        
        return cadastro
    
class PasswordResetSerializer(serializers.Serializer):
    """
    Este Serializer valida o token e a nova senha.
    Ele não está ligado a um 'model', por isso é um 'serializers.Serializer'.
    """
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirmPassword = serializers.CharField(write_only=True, required=True)
    uidb64 = serializers.CharField(write_only=True, required=True)
    token = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        # 1. Valida se as senhas coincidem
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})

        # 2. Valida o UID e o Token (lógica da documentação do Django)
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uidb64']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"token": "O link de redefinição é inválido ou expirou."})

        if not PasswordResetTokenGenerator().check_token(user, attrs['token']):
            raise serializers.ValidationError({"token": "O link de redefinição é inválido ou expirou."})

        # 3. Se tudo estiver OK, anexa o 'user' aos dados validados
        attrs['user'] = user
        return attrs

    def save(self):
        """
        Salva a nova senha para o usuário validado.
        """
        user = self.validated_data['user']
        password = self.validated_data['password']
        
        # 'set_password' é a forma segura que criptografa a senha
        user.set_password(password)
        user.save()

class HabilidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habilidade
        fields = ['id', 'nome']

class HabilidadeAlunoSerializer(serializers.ModelSerializer):
    # Exibe o nome da habilidade (leitura) e aceita o ID (escrita)
    nome_habilidade = serializers.CharField(source='habilidade.nome', read_only=True)
    habilidade_id = serializers.PrimaryKeyRelatedField(
        queryset=Habilidade.objects.all(), source='habilidade', write_only=True
    )

    class Meta:
        model = HabilidadeAluno
        fields = ['habilidade_id', 'nome_habilidade', 'nivel']

class PerfilAlunoSerializer(serializers.ModelSerializer):
    habilidades = HabilidadeAlunoSerializer(source='habilidadealuno_set', many=True, read_only=True)

    class Meta:
        model = PerfilAluno
        fields = ['resumo', 'linkedin', 'github', 'habilidades']