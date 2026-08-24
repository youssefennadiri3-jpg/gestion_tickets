from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, VerifyRegisterOTPView, LoginRequestOTPView, LoginVerifyOTPView, ResendOTPView,
    UserProfileView, ProfileUpdateRequestView, ProfileUpdateVerifyView,
    TicketListCreateView, TicketDetailView,
    CategorieListView, CategorieDetailView, CommentaireCreateView,
    AgentListCreateView, AgentDetailView,
    ClientListView, ClientDetailView,
    AdminListView, AdminDetailView,
    AuditLogListView,
    StatsView,
)

urlpatterns = [
    # Authentification (avec vérification OTP par email)
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/register/verify/', VerifyRegisterOTPView.as_view(), name='auth_register_verify'),
    path('auth/login/', LoginRequestOTPView.as_view(), name='auth_login_request'),
    path('auth/login/verify/', LoginVerifyOTPView.as_view(), name='auth_login_verify'),
    path('auth/otp/resend/', ResendOTPView.as_view(), name='auth_otp_resend'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', UserProfileView.as_view(), name='auth_me'),
    path('auth/me/update/request/', ProfileUpdateRequestView.as_view(), name='profile_update_request'),
    path('auth/me/update/verify/', ProfileUpdateVerifyView.as_view(), name='profile_update_verify'),

    # Tickets Endpoints
    path('tickets/', TicketListCreateView.as_view(), name='ticket_list_create'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='ticket_detail'),

    # Categories & Comments
    path('categories/', CategorieListView.as_view(), name='categorie_list'),
    path('categories/<int:pk>/', CategorieDetailView.as_view(), name='categorie_detail'),
    path('comments/', CommentaireCreateView.as_view(), name='comment_create'),

    # Agents & Clients (Admin)
    path('agents/', AgentListCreateView.as_view(), name='agent_list_create'),
    path('agents/<int:pk>/', AgentDetailView.as_view(), name='agent_detail'),
    path('clients/', ClientListView.as_view(), name='client_list'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client_detail'),
    path('admins/', AdminListView.as_view(), name='admin_list'),
    path('admins/<int:pk>/', AdminDetailView.as_view(), name='admin_detail'),
    path('logs/', AuditLogListView.as_view(), name='audit_log_list'),

    # Statistiques
    path('stats/', StatsView.as_view(), name='stats'),
]