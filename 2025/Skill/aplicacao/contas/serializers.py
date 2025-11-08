# Em aplicacao/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Cadastro

class CadastroSerializer(serializers.ModelSerializer):
    # Campos extras para validação (não estão no modelo 'Cadastro')
    email = serializers.EmailField(required=True)
    confirmEmail = serializers.EmailField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirmPassword = serializers.CharField(write_only=True, required=True)
    
    # Campo do modelo 'Cadastro' que também precisamos no JSON
    # 'required=True' garante que o frontend deve enviar (1 ou 2)
    tipoDoCadastro = serializers.ChoiceField(choices=Cadastro.TIPO_CHOICES, required=True)

    class Meta:
        model = Cadastro
        # Campos do seu modelo 'Cadastro' + os campos extras
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
        # Define campos que não devem ser enviados de volta no JSON
        extra_kwargs = {
            'password': {'write_only': True},
            'confirmPassword': {'write_only': True},
            'confirmEmail': {'write_only': True},
        }


    def validate(self, attrs):
        """
        Validação customizada do DRF (alinhado com a documentação).
        """
        # 1. Validação de Senha
        if attrs['password'] != attrs['confirmPassword']:
            raise serializers.ValidationError({"password": "As senhas não coincidem."})
        
        # 2. Validação de Email
        if attrs['email'] != attrs['confirmEmail']:
            raise serializers.ValidationError({"email": "Os e-mails não coincidem."})

        # 3. Validação de Email Institucional (Sua Regra de Negócio)
        email = attrs['email'].lower()
        if not (email.endswith('@ifba.edu.br') or email.endswith('@ifba.edu.br')):
             raise serializers.ValidationError({"email": "Apenas e-mails institucionais (@ifba.edu.br) são permitidos."})
        
        # 4. Validação de Duplicidade (alinhado com a documentação)
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Este email já está cadastrado."})
        
        if Cadastro.objects.filter(matricula=attrs['matricula']).exists():
            raise serializers.ValidationError({"matricula": "Esta matrícula já está cadastrada."})

        return attrs

    def create(self, validated_data):
        """
        Cria o User e o Cadastro (alinhado com a documentação).
        """
        # Removemos os campos de validação que não pertencem aos modelos
        validated_data.pop('confirmPassword')
        validated_data.pop('confirmEmail')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        
        # Pega os dados que são do 'Cadastro'
        nome = validated_data.pop('nome')
        matricula = validated_data.pop('matricula')
        campus = validated_data.pop('campus')
        tipoDoCadastro = validated_data.pop('tipoDoCadastro')

        # 1. Cria o User
        user = User.objects.create_user(
            username=email, # Usamos o email como username
            email=email, 
            password=password
        )

        # 2. Cria o Cadastro
        cadastro = Cadastro.objects.create(
            user=user, 
            nome=nome,
            matricula=matricula,
            campus=campus,
            tipoDoCadastro=tipoDoCadastro
        )
        
        return cadastro