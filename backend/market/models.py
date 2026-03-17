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


# ── Paper Trading ────────────────────────────────────────────────────

class PaperPortfolio(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paper_portfolio",
    )
    cash_balance = models.DecimalField(max_digits=15, decimal_places=2, default=100000)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} — ${self.cash_balance}"


class PaperPosition(models.Model):
    portfolio = models.ForeignKey(PaperPortfolio, on_delete=models.CASCADE, related_name="positions")
    ticker = models.CharField(max_length=20)
    shares = models.DecimalField(max_digits=15, decimal_places=6)
    avg_cost = models.DecimalField(max_digits=15, decimal_places=4)

    class Meta:
        unique_together = ("portfolio", "ticker")
        ordering = ["ticker"]

    def __str__(self):
        return f"{self.ticker} x{self.shares}"


class PaperTrade(models.Model):
    BUY = "BUY"
    SELL = "SELL"
    ACTION_CHOICES = [(BUY, "Buy"), (SELL, "Sell")]

    portfolio = models.ForeignKey(PaperPortfolio, on_delete=models.CASCADE, related_name="trades")
    ticker = models.CharField(max_length=20)
    action = models.CharField(max_length=4, choices=ACTION_CHOICES)
    shares = models.DecimalField(max_digits=15, decimal_places=6)
    price = models.DecimalField(max_digits=15, decimal_places=4)
    total = models.DecimalField(max_digits=15, decimal_places=2)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-executed_at"]

    def __str__(self):
        return f"{self.action} {self.shares} {self.ticker} @ ${self.price}"
