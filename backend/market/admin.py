from django.contrib import admin

from .models import Entity, WatchlistItem, Note


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ("nom", "ticker", "secteur", "valeur_totale")
    search_fields = ("nom", "ticker")


@admin.register(WatchlistItem)
class WatchlistItemAdmin(admin.ModelAdmin):
    list_display = ("user", "entity", "added_at")
    list_filter = ("added_at",)


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("titre", "user", "created_at")
    list_filter = ("created_at",)
    search_fields = ("titre", "contenu")
