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
    list_name = models.CharField(max_length=80, default="Default")
    tags = models.JSONField(default=list, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "élément watchlist"
        unique_together = ("user", "entity", "list_name")
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


class PaperPortfolio(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="paper_portfolio",
    )
    cash_balance = models.DecimalField(max_digits=15, decimal_places=2, default=100000)
    created_at = models.DateTimeField(auto_now_add=True)


class PaperPosition(models.Model):
    portfolio = models.ForeignKey(
        PaperPortfolio,
        on_delete=models.CASCADE,
        related_name="positions",
    )
    ticker = models.CharField(max_length=20)
    shares = models.DecimalField(max_digits=15, decimal_places=6)
    avg_cost = models.DecimalField(max_digits=15, decimal_places=4)

    class Meta:
        ordering = ["ticker"]
        unique_together = ("portfolio", "ticker")


class PaperTrade(models.Model):
    ACTION_BUY = "BUY"
    ACTION_SELL = "SELL"
    ACTION_CHOICES = [
        (ACTION_BUY, "Buy"),
        (ACTION_SELL, "Sell"),
    ]

    portfolio = models.ForeignKey(
        PaperPortfolio,
        on_delete=models.CASCADE,
        related_name="trades",
    )
    ticker = models.CharField(max_length=20)
    action = models.CharField(max_length=4, choices=ACTION_CHOICES)
    shares = models.DecimalField(max_digits=15, decimal_places=6)
    price = models.DecimalField(max_digits=15, decimal_places=4)
    total = models.DecimalField(max_digits=15, decimal_places=2)
    realized_pnl = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-executed_at"]


class PaperOrder(models.Model):
    TYPE_MARKET = "MARKET"
    TYPE_LIMIT = "LIMIT"
    TYPE_STOP = "STOP"
    TYPE_CHOICES = [
        (TYPE_MARKET, "Market"),
        (TYPE_LIMIT, "Limit"),
        (TYPE_STOP, "Stop"),
    ]

    STATUS_PENDING = "PENDING"
    STATUS_FILLED = "FILLED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_REJECTED = "REJECTED"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_FILLED, "Filled"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_REJECTED, "Rejected"),
    ]

    portfolio = models.ForeignKey(
        PaperPortfolio,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    ticker = models.CharField(max_length=20)
    action = models.CharField(max_length=4, choices=PaperTrade.ACTION_CHOICES)
    order_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_MARKET)
    shares = models.DecimalField(max_digits=15, decimal_places=6)
    trigger_price = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    take_profit_price = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    stop_loss_price = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    status_message = models.CharField(max_length=255, blank=True)
    filled_price = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    filled_at = models.DateTimeField(null=True, blank=True)
    trade = models.ForeignKey(PaperTrade, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class PortfolioSnapshot(models.Model):
    portfolio = models.ForeignKey(PaperPortfolio, on_delete=models.CASCADE, related_name="snapshots")
    captured_at = models.DateTimeField(auto_now_add=True)
    cash_balance = models.DecimalField(max_digits=15, decimal_places=2)
    market_value = models.DecimalField(max_digits=15, decimal_places=2)
    total_equity = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        ordering = ["captured_at"]


class EconomicEvent(models.Model):
    EVENT_FOMC = "FOMC"
    EVENT_CPI = "CPI"
    EVENT_NFP = "NFP"
    EVENT_GDP = "GDP"
    EVENT_PMI = "PMI"
    EVENT_OTHER = "OTHER"
    EVENT_CHOICES = [
        (EVENT_FOMC, "FOMC"),
        (EVENT_CPI, "CPI"),
        (EVENT_NFP, "NFP"),
        (EVENT_GDP, "GDP"),
        (EVENT_PMI, "PMI"),
        (EVENT_OTHER, "Other"),
    ]

    IMPORTANCE_HIGH = "HIGH"
    IMPORTANCE_MEDIUM = "MEDIUM"
    IMPORTANCE_LOW = "LOW"
    IMPORTANCE_CHOICES = [
        (IMPORTANCE_HIGH, "High"),
        (IMPORTANCE_MEDIUM, "Medium"),
        (IMPORTANCE_LOW, "Low"),
    ]

    title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=12, choices=EVENT_CHOICES, default=EVENT_OTHER)
    scheduled_at = models.DateTimeField()
    country = models.CharField(max_length=64, default="US")
    currency = models.CharField(max_length=8, default="USD")
    importance = models.CharField(max_length=10, choices=IMPORTANCE_CHOICES, default=IMPORTANCE_MEDIUM)
    source_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_at"]


class EarningsEvent(models.Model):
    SESSION_PRE = "PRE_MARKET"
    SESSION_POST = "POST_MARKET"
    SESSION_DURING = "DURING_MARKET"
    SESSION_TBD = "TBD"
    SESSION_CHOICES = [
        (SESSION_PRE, "Pre-market"),
        (SESSION_POST, "Post-market"),
        (SESSION_DURING, "During market"),
        (SESSION_TBD, "TBD"),
    ]

    ticker = models.CharField(max_length=20, db_index=True)
    company_name = models.CharField(max_length=255, blank=True)
    scheduled_at = models.DateTimeField()
    session = models.CharField(max_length=20, choices=SESSION_CHOICES, default=SESSION_TBD)
    source_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at", "ticker"]
        unique_together = ("ticker", "scheduled_at")


class EventReminder(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_reminders")
    economic_event = models.ForeignKey(
        EconomicEvent,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reminders",
    )
    earnings_event = models.ForeignKey(
        EarningsEvent,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reminders",
    )
    offset_minutes = models.PositiveIntegerField(default=60)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (models.Q(economic_event__isnull=False) & models.Q(earnings_event__isnull=True))
                    | (models.Q(economic_event__isnull=True) & models.Q(earnings_event__isnull=False))
                ),
                name="event_reminder_one_event_only",
            )
        ]


class AlertRule(models.Model):
    TYPE_PRICE_ABOVE = "PRICE_ABOVE"
    TYPE_PRICE_BELOW = "PRICE_BELOW"
    TYPE_MOVE_UP_PCT = "MOVE_UP_PCT"
    TYPE_MOVE_DOWN_PCT = "MOVE_DOWN_PCT"
    TYPE_DRAWDOWN_PCT = "DRAWDOWN_PCT"
    TYPE_EVENT_SOON_MINUTES = "EVENT_SOON_MINUTES"
    TYPE_CHOICES = [
        (TYPE_PRICE_ABOVE, "Price Above"),
        (TYPE_PRICE_BELOW, "Price Below"),
        (TYPE_MOVE_UP_PCT, "Move Up (%)"),
        (TYPE_MOVE_DOWN_PCT, "Move Down (%)"),
        (TYPE_DRAWDOWN_PCT, "Portfolio Drawdown (%)"),
        (TYPE_EVENT_SOON_MINUTES, "Event Soon (minutes)"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alert_rules")
    name = models.CharField(max_length=120)
    rule_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    symbol = models.CharField(max_length=20, blank=True)
    threshold = models.DecimalField(max_digits=15, decimal_places=4)
    enabled = models.BooleanField(default=True)
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id}:{self.rule_type}:{self.symbol or 'PORTFOLIO'}"


class AlertEvent(models.Model):
    SEVERITY_INFO = "INFO"
    SEVERITY_WARNING = "WARNING"
    SEVERITY_CRITICAL = "CRITICAL"
    SEVERITY_CHOICES = [
        (SEVERITY_INFO, "Info"),
        (SEVERITY_WARNING, "Warning"),
        (SEVERITY_CRITICAL, "Critical"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alert_events")
    rule = models.ForeignKey(AlertRule, on_delete=models.SET_NULL, null=True, blank=True, related_name="events")
    message = models.CharField(max_length=255)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default=SEVERITY_INFO)
    payload = models.JSONField(default=dict, blank=True)
    acknowledged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
