from rest_framework import serializers

from .models import Entity, WatchlistItem, Note, PaperPortfolio, PaperPosition, PaperTrade


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

    class Meta:
        model = WatchlistItem
        fields = ("id", "entity", "entity_id", "added_at")
        read_only_fields = ("id", "added_at")


class NoteSerializer(serializers.ModelSerializer):
    entity = EntitySerializer(read_only=True)
    entity_id = serializers.PrimaryKeyRelatedField(
        queryset=Entity.objects.all(),
        source="entity",
        write_only=True,
    )

    class Meta:
        model = Note
        fields = ("id", "entity", "entity_id", "titre", "contenu", "created_at")
        read_only_fields = ("id", "created_at", "entity")


class PaperPortfolioSerializer(serializers.ModelSerializer):
    positions = serializers.SerializerMethodField()

    class Meta:
        model = PaperPortfolio
        fields = ("id", "cash_balance", "created_at", "positions")

    def get_positions(self, obj):
        return [
            {"ticker": p.ticker, "shares": str(p.shares), "avg_cost": str(p.avg_cost)}
            for p in obj.positions.all()
        ]


class PaperTradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaperTrade
        fields = ("id", "ticker", "action", "shares", "price", "total", "executed_at")
