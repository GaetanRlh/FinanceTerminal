from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity, WatchlistItem, Note
from .serializers import EntitySerializer, WatchlistItemSerializer, NoteSerializer
from .services import AlphaVantageClient, YFinanceClient, check_av_error


# ── Market data proxy views (yfinance) ─────────────────────────────

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
            return Response({"error": err}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(data)


class QuoteView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        data = YFinanceClient().global_quote(symbol)
        if "error" in data and not data.get("Global Quote"):
            return Response({"error": data["error"]}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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
        period_map = {"1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y", "full": "5y"}
        period = period_map.get(interval, "1y")
        data = YFinanceClient().time_series_daily(symbol, period=period)
        return Response(data)


class CompanyOverviewView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        data = YFinanceClient().company_overview(symbol)
        return Response(data)


class NewsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tickers = request.query_params.get("tickers", "")
        limit = int(request.query_params.get("limit", "10"))
        data = YFinanceClient().news_sentiment(tickers=tickers, limit=limit)
        return Response(data)


class TopMoversView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = YFinanceClient().top_gainers_losers()
        return Response(data)


class MarketStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        data = YFinanceClient().market_status()
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
