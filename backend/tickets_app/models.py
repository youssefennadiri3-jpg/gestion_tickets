from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.utils import timezone
from datetime import timedelta


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        # Un compte créé via "createsuperuser" doit être reconnu comme ADMIN
        # (et Super Admin, via is_superuser) partout dans l'app, pas seulement
        # via le contournement is_superuser fait au niveau des serializers.
        extra_fields.setdefault('role', 'ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)


# 1. Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = (
        ('CLIENT', 'Client'),
        ('AGENT', 'Agent'),
        ('ADMIN', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CLIENT')

    # Rate limiting / verrouillage temporaire après tentatives de connexion échouées
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    # Durée du dernier verrouillage (en secondes) — double à chaque nouveau verrouillage
    lockout_duration_seconds = models.PositiveIntegerField(default=0)

    objects = CustomUserManager()

    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    def __str__(self):
        return f"{self.username} ({self.role})"


# 1bis. Code OTP (vérification email pour inscription, connexion & modification profil)
class OTPCode(models.Model):
    PURPOSE_CHOICES = (
        ('REGISTER', 'Inscription'),
        ('LOGIN', 'Connexion'),
        ('PROFILE', 'Modification profil'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=10, choices=PURPOSE_CHOICES)
    # Pour PROFILE : stocke en JSON les changements en attente de confirmation
    payload = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)

    def __str__(self):
        return f"OTP {self.purpose} pour {self.user.username}"


# 2. Modèle Categorie
class Categorie(models.Model):
    nom = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nom


# 3. Modèle Ticket
class Ticket(models.Model):
    PRIORITE_CHOICES = (
        ('BASSE', 'Basse'),
        ('MOYENNE', 'Moyenne'),
        ('HAUTE', 'Haute'),
    )

    STATUT_CHOICES = (
        ('OUVERT', 'Ouvert'),
        ('EN_COURS', 'En cours'),
        ('RESOLU', 'Résolu'),
        ('FERME', 'Fermé'),
    )

    titre = models.CharField(max_length=200)
    description = models.TextField()
    priorite = models.CharField(max_length=10, choices=PRIORITE_CHOICES, default='MOYENNE')
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='OUVERT')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    # Relations
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets_crees')
    agent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_assignes')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='tickets')

    def __str__(self):
        return f"[{self.statut}] {self.titre}"


# 4. Modèle Commentaire
class Commentaire(models.Model):
    contenu = models.TextField()
    date_creation = models.DateTimeField(auto_now_add=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='commentaires')
    auteur = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"Commentaire de {self.auteur.username} sur #{self.ticket.id}"


# 5. Journal d'activité (traçabilité) — consultable uniquement par le Super Admin
class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('LOGIN_SUCCESS', 'Connexion réussie'),
        ('LOGIN_FAILED', 'Connexion échouée'),
        ('ACCOUNT_LOCKED', 'Compte verrouillé'),
        ('REGISTER', 'Inscription'),
        ('ACCOUNT_DEACTIVATED', 'Compte désactivé'),
        ('ACCOUNT_REACTIVATED', 'Compte réactivé'),
    )

    # user reste null si le compte a depuis été désactivé/supprimé, ou si le
    # username tenté n'existait pas (tentative de connexion invalide).
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    username_attempted = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.action} — {self.username_attempted or (self.user and self.user.username)}"