from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity, WatchlistItem, Note
from .serializers import EntitySerializer, WatchlistItemSerializer, NoteSerializer
from .services import AlphaVantageClient, check_av_error


# ── Alpha Vantage proxy views ──────────────────────────────────────

class SymbolSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "Le paramètre 'q' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        client = AlphaVantageClient()
        data = client.search(query)
        err = check_av_error(data)
        if err:
            code = status.HTTP_503_SERVICE_UNAVAILABLE if ("Note" in data or "Information" in data) else status.HTTP_400_BAD_REQUEST
            return Response({"error": err}, status=code)
        return Response(data)


class QuoteView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        client = AlphaVantageClient()
        data = client.global_quote(symbol)
        err = check_av_error(data)
        if err:
            code = status.HTTP_503_SERVICE_UNAVAILABLE if ("Note" in data or "Information" in data) else status.HTTP_400_BAD_REQUEST
            return Response({"error": err}, status=code)
        # Sync valeur_totale for entities with matching ticker
        quote = data.get("Global Quote") or {}
        price_raw = quote.get("05. price")
        if price_raw:
            try:
                price = float(price_raw)
                Entity.objects.filter(ticker=symbol).update(valeur_totale=price)
            except (ValueError, TypeError):
                pass
        return Response(data)


class TimeSeriesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        interval = request.query_params.get("interval", "daily")
        outputsize = "full" if interval == "full" else "compact"
        client = AlphaVantageClient()
        data = client.time_series_daily(symbol, outputsize=outputsize)
        err = check_av_error(data)
        if err:
            code = status.HTTP_503_SERVICE_UNAVAILABLE if ("Note" in data or "Information" in data) else status.HTTP_400_BAD_REQUEST
            return Response({"error": err}, status=code)
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entity = serializer.validated_data["entity"]
        obj, created = WatchlistItem.objects.get_or_create(
            user=request.user, entity=entity
        )
        serializer = WatchlistItemSerializer(obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
