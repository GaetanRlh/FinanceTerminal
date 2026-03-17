from rest_framework import serializers

from .models import Entity, WatchlistItem, Note


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
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Note
        fields = ("id", "entity", "entity_id", "titre", "contenu", "created_at")
        read_only_fields = ("id", "created_at", "entity")

