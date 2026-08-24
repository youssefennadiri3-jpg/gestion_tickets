import random
import json
import requests
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import generics, permissions, filters, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import User, Ticket, Categorie, Commentaire, OTPCode, AuditLog
from .serializers import (
    UserSerializer, RegisterSerializer, TicketSerializer, CategorieSerializer, CommentaireSerializer,
    AgentSerializer, ClientSerializer, AdminSerializer, AuditLogSerializer,
)

# Nombre de tentatives échouées avant verrouillage temporaire, et durée du verrouillage
MAX_LOGIN_ATTEMPTS = 3
BASE_LOCKOUT_SECONDS = 30
MAX_LOCKOUT_SECONDS = 3600  # plafond de sécurité (1h) pour éviter une croissance infinie


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(action, user=None, username_attempted='', request=None, details=''):
    """Enregistre un évènement dans le journal d'activité (traçabilité)."""
    AuditLog.objects.create(
        user=user,
        username_attempted=username_attempted or (user.username if user else ''),
        action=action,
        ip_address=get_client_ip(request) if request else None,
        details=details,
    )


class IsAdmin(permissions.BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle ADMIN (ou superuser)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', None) == 'ADMIN'))


class IsSuperUser(permissions.BasePermission):
    """Autorise uniquement le Super Admin (compte is_superuser=True).
    Utilisé pour protéger la gestion des comptes ADMIN : seul le Super Admin
    peut rétrograder (agent/client) ou supprimer un autre administrateur."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_superuser)


def generate_and_send_otp(user, purpose, payload=None):
    """Génère un code OTP à 6 chiffres, l'enregistre (avec payload optionnel) et l'envoie par email."""
    code = f"{random.randint(0, 999999):06d}"
    OTPCode.objects.create(
        user=user, code=code, purpose=purpose,
        payload=json.dumps(payload) if payload is not None else None,
    )
    sujet = "Votre code de vérification - HelpDesk Pro"
    message = (
        f"Bonjour {user.first_name or user.username},\n\n"
        f"Votre code de vérification est : {code}\n"
        f"Ce code est valable 10 minutes.\n\n"
        f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email."
    )
    try:
        send_mail(
            sujet, message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@helpdeskpro.local'),
            [user.email],
            fail_silently=False,
        )
    except Exception as e:
        # On affiche l'erreur réelle dans le terminal (au lieu de l'avaler silencieusement)
        # pour pouvoir diagnostiquer un problème SMTP (mauvais App Password, etc.)
        print(f"[OTP EMAIL ERROR] Échec de l'envoi à {user.email} : {e}")
    return code


# Étape 1 - Inscription : crée le compte (inactif) + envoie un OTP par email
def verify_recaptcha(token, remote_ip=None):
    """Vérifie un token reCAPTCHA v2 auprès de l'API Google. Retourne True/False."""
    if not token:
        return False
    try:
        resp = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_SECRET_KEY,
                'response': token,
                'remoteip': remote_ip,
            },
            timeout=5,
        )
        return bool(resp.json().get('success'))
    except Exception as e:
        print(f"[RECAPTCHA ERROR] Vérification échouée : {e}")
        # En cas de panne du service Google, on ne bloque pas l'utilisateur légitime.
        return True


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not verify_recaptcha(request.data.get('recaptcha_token'), request.META.get('REMOTE_ADDR')):
            return Response({'detail': 'Vérification reCAPTCHA échouée. Veuillez réessayer.'}, status=400)

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        code = generate_and_send_otp(user, 'REGISTER')
        log_action('REGISTER', user=user, request=request, details='Compte créé, en attente de vérification OTP')
        data = {
            'detail': 'Compte créé. Un code de vérification a été envoyé à votre email.',
            'username': user.username,
        }
        return Response(data, status=status.HTTP_201_CREATED)


# Étape 2 - Inscription : vérifie le code OTP et active le compte
class VerifyRegisterOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        code = request.data.get('code')
        try:
            user = User.objects.get(username=username, is_active=False)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable ou déjà activé.'}, status=400)

        otp = OTPCode.objects.filter(user=user, purpose='REGISTER', is_used=False, code=code).order_by('-created_at').first()
        if not otp or otp.is_expired():
            return Response({'detail': 'Code invalide ou expiré.'}, status=400)

        otp.is_used = True
        otp.save()
        user.is_active = True
        user.save()
        return Response({'detail': 'Compte activé avec succès. Vous pouvez maintenant vous connecter.'})


# Étape 1 - Connexion : vérifie username/password puis envoie un OTP par email
class LoginRequestOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not verify_recaptcha(request.data.get('recaptcha_token'), request.META.get('REMOTE_ADDR')):
            return Response({'detail': 'Vérification reCAPTCHA échouée. Veuillez réessayer.'}, status=400)

        username = request.data.get('username')
        password = request.data.get('password')

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            target_user = None

        # Compte temporairement verrouillé suite à trop de tentatives échouées
        if target_user and target_user.is_locked():
            remaining_seconds = max(1, int((target_user.locked_until - timezone.now()).total_seconds()))
            log_action('LOGIN_FAILED', username_attempted=username, request=request, details='Tentative sur compte verrouillé')
            return Response(
                {
                    'detail': "Compte temporairement verrouillé suite à plusieurs échecs.",
                    'locked_seconds': remaining_seconds,
                },
                status=429,
            )

        # On vérifie le mot de passe manuellement (et non via authenticate()) car
        # Django refuse silencieusement d'authentifier un compte is_active=False,
        # ce qui empêcherait de distinguer "mauvais mot de passe" de "compte inactif".
        if not target_user or not target_user.check_password(password):
            log_action('LOGIN_FAILED', username_attempted=username, request=request, details='Mot de passe incorrect')
            if target_user:
                target_user.failed_login_attempts += 1
                if target_user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                    # Verrouillage à durée croissante : 30s, puis 60s, 120s, 240s... (plafonné)
                    if target_user.lockout_duration_seconds <= 0:
                        target_user.lockout_duration_seconds = BASE_LOCKOUT_SECONDS
                    else:
                        target_user.lockout_duration_seconds = min(
                            target_user.lockout_duration_seconds * 2, MAX_LOCKOUT_SECONDS
                        )
                    target_user.locked_until = timezone.now() + timedelta(seconds=target_user.lockout_duration_seconds)
                    target_user.failed_login_attempts = 0
                    log_action(
                        'ACCOUNT_LOCKED', user=target_user, request=request,
                        details=f'{MAX_LOGIN_ATTEMPTS} tentatives échouées — verrouillage {target_user.lockout_duration_seconds}s',
                    )
                    target_user.save()
                    return Response(
                        {
                            'detail': "Compte temporairement verrouillé suite à plusieurs échecs.",
                            'locked_seconds': target_user.lockout_duration_seconds,
                        },
                        status=429,
                    )
                target_user.save()
            return Response({'detail': "Nom d'utilisateur ou mot de passe incorrect."}, status=400)

        user = target_user
        if not user.is_active:
            log_action('LOGIN_FAILED', user=user, request=request, details='Compte inactif')
            return Response({'detail': "Ce compte est inactif. Vérifiez votre email ou contactez un administrateur."}, status=403)

        # Mot de passe correct : on réinitialise le compteur d'échecs et l'escalade de verrouillage
        if user.failed_login_attempts or user.locked_until or user.lockout_duration_seconds:
            user.failed_login_attempts = 0
            user.locked_until = None
            user.lockout_duration_seconds = 0
            user.save()

        code = generate_and_send_otp(user, 'LOGIN')
        data = {'detail': 'Code de vérification envoyé à votre email.', 'username': user.username}
        return Response(data)


# Étape 2 - Connexion : vérifie le code OTP puis délivre les tokens JWT
class LoginVerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        code = request.data.get('code')
        try:
            user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=400)

        otp = OTPCode.objects.filter(user=user, purpose='LOGIN', is_used=False, code=code).order_by('-created_at').first()
        if not otp or otp.is_expired():
            log_action('LOGIN_FAILED', user=user, request=request, details='Code OTP invalide ou expiré')
            return Response({'detail': 'Code invalide ou expiré.'}, status=400)

        otp.is_used = True
        otp.save()
        log_action('LOGIN_SUCCESS', user=user, request=request)
        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


# Renvoyer un nouveau code OTP (inscription ou connexion)
class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        purpose = request.data.get('purpose', 'LOGIN')
        is_active = purpose != 'REGISTER'
        try:
            user = User.objects.get(username=username, is_active=is_active)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=400)

        code = generate_and_send_otp(user, purpose)
        data = {'detail': 'Nouveau code envoyé.'}
        return Response(data)


# User Profile API (Pour savoir qui est connecté)
class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# Étape 1 - Modification profil : valide les données et envoie un OTP de confirmation
# (le code part toujours vers l'email ACTUEL du compte, même si l'email est en train de changer,
# pour éviter qu'un compte compromis change son email sans confirmation du vrai propriétaire)
class ProfileUpdateRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data
        password = data.get('password')
        password2 = data.get('password2')

        if password or password2:
            if password != password2:
                return Response({'detail': 'Les deux mots de passe ne correspondent pas.'}, status=400)
            if len(password) < 6:
                return Response({'detail': 'Le mot de passe doit contenir au moins 6 caractères.'}, status=400)

        payload = {}
        for field in ('first_name', 'last_name', 'email'):
            if field in data:
                payload[field] = data[field]
        if password:
            payload['password_hash'] = make_password(password)

        if not payload:
            return Response({'detail': 'Aucune modification à confirmer.'}, status=400)

        code = f"{random.randint(0, 999999):06d}"
        OTPCode.objects.create(user=user, code=code, purpose='PROFILE', payload=json.dumps(payload))

        send_mail(
            "Confirmez la modification de votre profil - HelpDesk Pro",
            (
                f"Bonjour {user.first_name or user.username},\n\n"
                f"Vous avez demandé à modifier votre profil. Votre code de confirmation est : {code}\n"
                f"Ce code est valable 10 minutes.\n\n"
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et vérifiez la sécurité de votre compte."
            ),
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@helpdeskpro.local'),
            [user.email],
            fail_silently=False,
        )
        return Response({'detail': 'Un code de confirmation a été envoyé à votre email.'})


# Étape 2 - Modification profil : vérifie l'OTP et applique les changements en attente
class ProfileUpdateVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = request.data.get('code')

        otp = OTPCode.objects.filter(
            user=user, purpose='PROFILE', is_used=False, code=code
        ).order_by('-created_at').first()

        if not otp or otp.is_expired():
            return Response({'detail': 'Code invalide ou expiré.'}, status=400)

        payload = json.loads(otp.payload or '{}')
        password_hash = payload.pop('password_hash', None)
        for field, value in payload.items():
            setattr(user, field, value)
        if password_hash:
            user.password = password_hash
        user.save()

        otp.is_used = True
        otp.save()

        return Response(UserSerializer(user).data)

# Tickets List & Create API
class TicketListCreateView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['statut', 'priorite', 'categorie', 'agent']
    search_fields = ['titre', 'description']

    def get_queryset(self):
        user = self.request.user
        # Admin et Agent voient tous les tickets (l'Agent peut ainsi choisir/prendre un ticket)
        if user.is_superuser or user.role in ('ADMIN', 'AGENT'):
            return Ticket.objects.all()
        # Si Client -> Voit seulement ses tickets
        return Ticket.objects.filter(client=user)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

# Ticket Detail & Update & Delete API
class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ('ADMIN', 'AGENT'):
            return Ticket.objects.all()
        # Un Client ne peut voir/modifier que ses propres tickets
        return Ticket.objects.filter(client=user)

    def perform_update(self, serializer):
        user = self.request.user
        # Seul un Admin peut assigner/réassigner un ticket à un agent.
        # Un Agent peut s'auto-assigner un ticket non assigné, ou se désister d'un ticket qu'il gère.
        if 'agent' in self.request.data:
            is_admin = user.is_superuser or user.role == 'ADMIN'
            ticket = self.get_object()
            new_agent = self.request.data.get('agent')
            self_assign = (
                user.role == 'AGENT'
                and ticket.agent_id is None
                and str(new_agent) == str(user.id)
            )
            self_unassign = (
                user.role == 'AGENT'
                and ticket.agent_id == user.id
                and new_agent in (None, '', 'null')
            )
            if not is_admin and not self_assign and not self_unassign:
                raise PermissionDenied("Seul un administrateur peut assigner un ticket à un agent.")
        serializer.save()

# Categories API
class CategorieListView(generics.ListCreateAPIView):
    queryset = Categorie.objects.annotate(nb_tickets=Count('tickets')).all()
    serializer_class = CategorieSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]


class CategorieDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categorie.objects.annotate(nb_tickets=Count('tickets')).all()
    serializer_class = CategorieSerializer
    permission_classes = [IsAdmin]


# Comment Create API
class CommentaireCreateView(generics.CreateAPIView):
    queryset = Commentaire.objects.all()
    serializer_class = CommentaireSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        ticket = serializer.validated_data.get('ticket')
        # Le client ne peut commenter que ses propres tickets (Admin/Agent voient tout).
        if not (user.is_superuser or user.role in ('ADMIN', 'AGENT')) and ticket.client_id != user.id:
            raise PermissionDenied("Vous ne pouvez commenter que vos propres tickets.")
        serializer.save(auteur=user)


# Agents Management API (Admin uniquement)
class AgentListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.filter(role='AGENT').order_by('username')
    serializer_class = AgentSerializer
    permission_classes = [IsAdmin]


class AgentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role='AGENT')
    serializer_class = AgentSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        was_inactive = not serializer.instance.is_active
        instance = serializer.save()
        if was_inactive and instance.is_active:
            log_action('ACCOUNT_REACTIVATED', user=instance, request=self.request, details=f'Réactivé par {self.request.user.username}')

    def perform_destroy(self, instance):
        # Suppression logique uniquement : on ne supprime jamais un compte
        # (préserve l'intégrité des tickets déjà créés/traités par cet agent).
        instance.is_active = False
        instance.save()
        log_action('ACCOUNT_DEACTIVATED', user=instance, request=self.request, details=f'Désactivé par {self.request.user.username}')


# Clients Management API (Admin uniquement, lecture + suppression)
class ClientListView(generics.ListAPIView):
    queryset = User.objects.filter(role='CLIENT').order_by('username')
    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role='CLIENT')
    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        was_inactive = not serializer.instance.is_active
        instance = serializer.save()
        if was_inactive and instance.is_active:
            log_action('ACCOUNT_REACTIVATED', user=instance, request=self.request, details=f'Réactivé par {self.request.user.username}')

    def perform_destroy(self, instance):
        # Suppression logique uniquement (préserve l'intégrité des tickets créés par ce client).
        instance.is_active = False
        instance.save()
        log_action('ACCOUNT_DEACTIVATED', user=instance, request=self.request, details=f'Désactivé par {self.request.user.username}')


# Gestion des comptes Admin (visible par tous les Admins, modifiable/supprimable
# uniquement par le Super Admin — celui qui a is_superuser=True)
class AdminListView(generics.ListAPIView):
    queryset = User.objects.filter(role='ADMIN').order_by('-is_superuser', 'username')
    serializer_class = AdminSerializer
    permission_classes = [IsAdmin]


class AdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role='ADMIN')
    serializer_class = AdminSerializer
    permission_classes = [IsSuperUser]

    def get_object(self):
        obj = super().get_object()
        # Filet de sécurité supplémentaire : le compte Super Admin lui-même
        # ne peut jamais être rétrogradé ni supprimé, même par un autre superuser.
        if self.request.method in ('PUT', 'PATCH', 'DELETE') and obj.is_superuser:
            raise PermissionDenied("Le compte Super Admin ne peut pas être modifié ou supprimé.")
        return obj

    def perform_update(self, serializer):
        was_inactive = not serializer.instance.is_active
        instance = serializer.save()
        if was_inactive and instance.is_active:
            log_action('ACCOUNT_REACTIVATED', user=instance, request=self.request, details=f'Réactivé par {self.request.user.username}')

    def perform_destroy(self, instance):
        # Suppression logique uniquement (préserve l'intégrité des tickets liés).
        instance.is_active = False
        instance.save()
        log_action('ACCOUNT_DEACTIVATED', user=instance, request=self.request, details=f'Désactivé par {self.request.user.username}')


# Journal d'activité — consultation réservée au Super Admin
class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperUser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action']

    def list(self, request, *args, **kwargs):
        # On limite à 500 résultats APRÈS filtrage (et non avant), car Django
        # interdit d'appliquer un .filter() sur un queryset déjà tranché ([:500]).
        queryset = self.filter_queryset(self.get_queryset())[:500]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Statistiques Dashboard (adaptées selon le rôle)
class StatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_superuser or user.role == 'ADMIN':
            qs = Ticket.objects.all()
        elif user.role == 'AGENT':
            qs = Ticket.objects.filter(agent=user)
        else:
            qs = Ticket.objects.filter(client=user)

        total = qs.count()
        ouverts = qs.filter(statut='OUVERT').count()
        en_cours = qs.filter(statut='EN_COURS').count()
        resolus = qs.filter(statut='RESOLU').count()
        fermes = qs.filter(statut='FERME').count()
        taux_resolution = round((resolus + fermes) / total * 100) if total else 0

        data = {
            'total': total,
            'ouverts': ouverts,
            'en_cours': en_cours,
            'resolus': resolus,
            'fermes': fermes,
            'taux_resolution': taux_resolution,
        }

        # Statistiques avancées réservées à l'admin
        if user.is_superuser or user.role == 'ADMIN':
            # Évolution mensuelle (6 derniers mois) : créés vs résolus
            today = timezone.now()
            mois_labels = []
            evolution = []
            for i in range(5, -1, -1):
                ref = (today.replace(day=1) - timedelta(days=1)) if i else today
                mois = (today.month - i - 1) % 12 + 1
                annee = today.year + ((today.month - i - 1) // 12)
                debut = timezone.datetime(annee, mois, 1, tzinfo=today.tzinfo)
                if mois == 12:
                    fin = timezone.datetime(annee + 1, 1, 1, tzinfo=today.tzinfo)
                else:
                    fin = timezone.datetime(annee, mois + 1, 1, tzinfo=today.tzinfo)
                crees = Ticket.objects.filter(date_creation__gte=debut, date_creation__lt=fin).count()
                resolus_mois = Ticket.objects.filter(
                    statut__in=['RESOLU', 'FERME'], date_modification__gte=debut, date_modification__lt=fin
                ).count()
                evolution.append({'mois': debut.strftime('%b'), 'crees': crees, 'resolus': resolus_mois})

            # Répartition par priorité
            par_priorite = list(
                Ticket.objects.values('priorite').annotate(total=Count('id')).order_by('priorite')
            )

            # Répartition par catégorie
            par_categorie = list(
                Ticket.objects.values('categorie__nom').annotate(total=Count('id')).order_by('-total')
            )

            # Performance des agents (tickets résolus)
            performance_agents = list(
                User.objects.filter(role='AGENT').annotate(
                    tickets_resolus=Count('tickets_assignes', filter=Q(tickets_assignes__statut='RESOLU')),
                    tickets_total=Count('tickets_assignes'),
                ).values('id', 'username', 'first_name', 'last_name', 'tickets_resolus', 'tickets_total')
            )

            data.update({
                'evolution_mensuelle': evolution,
                'par_priorite': par_priorite,
                'par_categorie': par_categorie,
                'performance_agents': performance_agents,
                'nb_agents': User.objects.filter(role='AGENT').count(),
                'nb_clients': User.objects.filter(role='CLIENT').count(),
            })
        else:
            # Client/Agent : tickets récents pour affichage rapide
            data['tickets_recents'] = TicketSerializer(qs.order_by('-date_creation')[:5], many=True).data

        return Response(data)