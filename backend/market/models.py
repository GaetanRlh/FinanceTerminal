from django.conf import settings
from django.db import models


class Entity(models.Model):
    nom = models.CharField(max_length=255)
    secteur = models.CharField(max_length=255, blank=True)
    ticker = models.CharField(max_length=20, unique=True)
    valeur_totale = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        verbose_name = "entité"
        verbose_name_plural = "entités"
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.ticker})"


class WatchlistItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlist")
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE, related_name="watchers")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "élément watchlist"
        unique_together = ("user", "entity")
        ordering = ["-added_at"]

    def __str__(self):
        return f"{self.user.email} -> {self.entity.ticker}"


class Note(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes")
    entity = models.ForeignKey(
        Entity,
        on_delete=models.CASCADE,
        related_name="notes",
        null=True,
        blank=True,
    )
    titre = models.CharField(max_length=255)
    contenu = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.titre

