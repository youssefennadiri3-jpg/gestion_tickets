from django.contrib import admin
from .models import User, Categorie, Ticket, Commentaire

admin.site.register(User)
admin.site.register(Categorie)
admin.site.register(Ticket)
admin.site.register(Commentaire)