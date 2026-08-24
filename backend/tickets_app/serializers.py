from rest_framework import serializers
from django.utils.crypto import get_random_string
from .models import User, Ticket, Categorie, Commentaire, AuditLog

# 1. Serializer User (Inscription & Profile)
class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_superuser', 'password']
        extra_kwargs = {'password': {'write_only': True, 'required': False}, 'is_superuser': {'read_only': True}}

    def get_role(self, obj):
        # إلا كان superuser كيرجع ADMIN تلقائياً
        if obj.is_superuser:
            return 'ADMIN'
        # وإلا كيرجع الـ role العادي المخزن فـ الداتابيز
        return getattr(obj, 'role', 'CLIENT')

    def create(self, validated_data):
        # Hashage du mot de passe à la création
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# 1bis. Serializer Inscription (toujours role=CLIENT, avec confirmation du mot de passe)
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6, label="Confirmation du mot de passe")

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': "Les deux mots de passe ne correspondent pas."})
        return data

    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("L'email est requis pour recevoir le code de vérification.")
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(role='CLIENT', is_active=False, **validated_data)
        user.set_password(password)
        user.save()
        return user


# 1ter. Serializer Agent/Client (liste + gestion, avec compteur de tickets)
class AgentSerializer(serializers.ModelSerializer):
    nb_tickets = serializers.SerializerMethodField()
    nb_tickets_resolus = serializers.SerializerMethodField()
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'role', 'is_active', 'nb_tickets', 'nb_tickets_resolus']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def get_nb_tickets(self, obj):
        return obj.tickets_assignes.count()

    def get_nb_tickets_resolus(self, obj):
        return obj.tickets_assignes.filter(statut='RESOLU').count()

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('role', None)
        user = User(role='AGENT', **validated_data)
        user.set_password(password or get_random_string(12))
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ClientSerializer(serializers.ModelSerializer):
    nb_tickets = serializers.SerializerMethodField()
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'nb_tickets', 'role', 'is_active']

    def get_nb_tickets(self, obj):
        return obj.tickets_crees.count()

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# 1quater. Serializer Admin (gestion des comptes ADMIN, réservée au Super Admin)
class AdminSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_superuser', 'is_active']
        extra_kwargs = {'is_superuser': {'read_only': True}}

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# 2. Serializer Categorie
class CategorieSerializer(serializers.ModelSerializer):
    nb_tickets = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'nb_tickets']


# 3. Serializer Commentaire
class CommentaireSerializer(serializers.ModelSerializer):
    auteur_username = serializers.ReadOnlyField(source='auteur.username')
    auteur_role = serializers.SerializerMethodField()

    class Meta:
        model = Commentaire
        fields = ['id', 'contenu', 'date_creation', 'ticket', 'auteur', 'auteur_username', 'auteur_role']
        read_only_fields = ['auteur']

    def get_auteur_role(self, obj):
        if obj.auteur.is_superuser:
            return 'ADMIN'
        return getattr(obj.auteur, 'role', 'CLIENT')


# 4. Serializer Ticket
class TicketSerializer(serializers.ModelSerializer):
    client_username = serializers.ReadOnlyField(source='client.username')
    agent_username = serializers.ReadOnlyField(source='agent.username')
    categorie_nom = serializers.ReadOnlyField(source='categorie.nom')
    commentaires = CommentaireSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'titre', 'description', 'priorite', 'statut',
            'date_creation', 'date_modification', 'client', 'client_username',
            'agent', 'agent_username', 'categorie', 'categorie_nom',
            'commentaires'
        ]
        read_only_fields = ['client', 'date_creation', 'date_modification']


# 5. Serializer AuditLog (journal d'activité — Super Admin uniquement)
class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'username', 'username_attempted', 'action', 'action_display', 'ip_address', 'details', 'timestamp']

    def get_username(self, obj):
        return obj.user.username if obj.user else None