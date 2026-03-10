from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity, WatchlistItem, Note
from .serializers import EntitySerializer, WatchlistItemSerializer, NoteSerializer
from .services import AlphaVantageClient


# ── Alpha Vantage proxy views ──────────────────────────────────────

class SymbolSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "Le paramètre 'q' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        client = AlphaVantageClient()
        data = client.search(query)
        return Response(data)


class QuoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        client = AlphaVantageClient()
        data = client.global_quote(symbol)
        return Response(data)


class TimeSeriesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        interval = request.query_params.get("interval", "daily")
        outputsize = "full" if interval == "full" else "compact"
        client = AlphaVantageClient()
        data = client.time_series_daily(symbol, outputsize=outputsize)
        return Response(data)


# ── CRUD views ──────────────────────────────────────────────────────

class EntityViewSet(viewsets.ModelViewSet):
    queryset = Entity.objects.all()
    serializer_class = EntitySerializer
    permission_classes = [permissions.IsAuthenticated]


class WatchlistViewSet(viewsets.ModelViewSet):
    serializer_class = WatchlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return WatchlistItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
