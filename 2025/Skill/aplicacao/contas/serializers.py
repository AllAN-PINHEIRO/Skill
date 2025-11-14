# Em aplicacao/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cadastro

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
            raise serializers.ValidationError({"email": "O e-mail deve ser institucional (ex: @ifba.edu.br)."})
        
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