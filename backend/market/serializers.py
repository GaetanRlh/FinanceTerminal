from decimal import Decimal

from rest_framework import serializers

from .models import (
    Entity,
    WatchlistItem,
    Note,
    PaperPortfolio,
    PaperPosition,
    PaperTrade,
    PaperOrder,
    PortfolioSnapshot,
    EconomicEvent,
    EarningsEvent,
    EventReminder,
    AlertRule,
    AlertEvent,
)


class EntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entity
        fields = ("id", "nom", "secteur", "ticker", "valeur_totale")


class WatchlistItemSerializer(serializers.ModelSerializer):
    entity = EntitySerializer(read_only=True)
    entity_id = serializers.PrimaryKeyRelatedField(
        queryset=Entity.objects.all(),
        source="entity",
        write_only=True,
    )
    list_name = serializers.CharField(required=False, allow_blank=False, max_length=80, default="Default")
    tags = serializers.ListField(
        child=serializers.CharField(max_length=32),
        required=False,
        allow_empty=True,
        default=list,
    )

    class Meta:
        model = WatchlistItem
        fields = ("id", "entity", "entity_id", "list_name", "tags", "added_at")
        read_only_fields = ("id", "added_at")

    def validate_tags(self, value):
        cleaned = []
        for tag in value:
            t = (tag or "").strip()
            if not t:
                continue
            if t not in cleaned:
                cleaned.append(t)
        return cleaned


class NoteSerializer(serializers.ModelSerializer):
    entity = EntitySerializer(read_only=True)
    entity_id = serializers.PrimaryKeyRelatedField(
        queryset=Entity.objects.all(),
        source="entity",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Note
        fields = ("id", "entity", "entity_id", "titre", "contenu", "created_at")
        read_only_fields = ("id", "created_at", "entity")


class PaperPositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperPosition
        fields = ("id", "ticker", "shares", "avg_cost")
        read_only_fields = fields


class PaperTradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperTrade
        fields = ("id", "ticker", "action", "shares", "price", "total", "realized_pnl", "executed_at")
        read_only_fields = fields


class PaperPortfolioSerializer(serializers.ModelSerializer):
    positions = PaperPositionSerializer(many=True, read_only=True)
    trades = PaperTradeSerializer(many=True, read_only=True)

    class Meta:
        model = PaperPortfolio
        fields = ("id", "cash_balance", "created_at", "positions", "trades")
        read_only_fields = fields


class PaperTradeExecutionSerializer(serializers.Serializer):
    ticker = serializers.CharField(max_length=20)
    action = serializers.ChoiceField(choices=PaperTrade.ACTION_CHOICES)
    order_type = serializers.ChoiceField(
        choices=PaperOrder.TYPE_CHOICES,
        required=False,
        default=PaperOrder.TYPE_MARKET,
    )
    shares = serializers.DecimalField(max_digits=15, decimal_places=6, min_value=Decimal("0.000001"))
    trigger_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        required=False,
        allow_null=True,
        min_value=Decimal("0.0001"),
    )
    take_profit_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        required=False,
        allow_null=True,
        min_value=Decimal("0.0001"),
    )
    stop_loss_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=4,
        required=False,
        allow_null=True,
        min_value=Decimal("0.0001"),
    )

    def validate(self, attrs):
        order_type = attrs.get("order_type", PaperOrder.TYPE_MARKET)
        trigger_price = attrs.get("trigger_price")
        if order_type in {PaperOrder.TYPE_LIMIT, PaperOrder.TYPE_STOP} and trigger_price is None:
            raise serializers.ValidationError("trigger_price is required for limit/stop orders.")
        if order_type == PaperOrder.TYPE_MARKET:
            attrs["trigger_price"] = None
        return attrs


class PaperOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperOrder
        fields = (
            "id",
            "ticker",
            "action",
            "order_type",
            "shares",
            "trigger_price",
            "take_profit_price",
            "stop_loss_price",
            "status",
            "status_message",
            "filled_price",
            "filled_at",
            "trade",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class PortfolioSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PortfolioSnapshot
        fields = ("id", "captured_at", "cash_balance", "market_value", "total_equity")
        read_only_fields = fields


class EconomicEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EconomicEvent
        fields = ("id", "title", "event_type", "scheduled_at", "country", "currency", "importance", "source_url")
        read_only_fields = fields


class EarningsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = EarningsEvent
        fields = ("id", "ticker", "company_name", "scheduled_at", "session", "source_url")
        read_only_fields = fields


class EventReminderSerializer(serializers.ModelSerializer):
    economic_event = EconomicEventSerializer(read_only=True)
    earnings_event = EarningsEventSerializer(read_only=True)
    economic_event_id = serializers.PrimaryKeyRelatedField(
        queryset=EconomicEvent.objects.all(),
        source="economic_event",
        write_only=True,
        required=False,
        allow_null=True,
    )
    earnings_event_id = serializers.PrimaryKeyRelatedField(
        queryset=EarningsEvent.objects.all(),
        source="earnings_event",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = EventReminder
        fields = (
            "id",
            "economic_event",
            "earnings_event",
            "economic_event_id",
            "earnings_event_id",
            "offset_minutes",
            "enabled",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "economic_event", "earnings_event")

    def validate(self, attrs):
        economic_event = attrs.get("economic_event")
        earnings_event = attrs.get("earnings_event")
        if bool(economic_event) == bool(earnings_event):
            raise serializers.ValidationError("Provide exactly one of economic_event_id or earnings_event_id.")
        return attrs


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = (
            "id",
            "name",
            "rule_type",
            "symbol",
            "threshold",
            "enabled",
            "last_triggered_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "last_triggered_at", "created_at", "updated_at")

    def validate(self, attrs):
        rule_type = attrs.get("rule_type") or getattr(self.instance, "rule_type", None)
        symbol = (attrs.get("symbol") or getattr(self.instance, "symbol", "") or "").strip().upper()
        if rule_type in {
            AlertRule.TYPE_PRICE_ABOVE,
            AlertRule.TYPE_PRICE_BELOW,
            AlertRule.TYPE_MOVE_UP_PCT,
            AlertRule.TYPE_MOVE_DOWN_PCT,
        } and not symbol:
            raise serializers.ValidationError("A symbol is required for symbol-based rules.")
        attrs["symbol"] = symbol
        return attrs


class AlertEventSerializer(serializers.ModelSerializer):
    rule = AlertRuleSerializer(read_only=True)

    class Meta:
        model = AlertEvent
        fields = ("id", "rule", "message", "severity", "payload", "acknowledged", "created_at")
        read_only_fields = ("id", "rule", "message", "severity", "payload", "created_at")

