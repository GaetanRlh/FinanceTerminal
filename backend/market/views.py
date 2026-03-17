from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Entity, WatchlistItem, Note, PaperPortfolio, PaperPosition, PaperTrade
from .serializers import (
    EntitySerializer, WatchlistItemSerializer, NoteSerializer,
    PaperPortfolioSerializer, PaperTradeSerializer,
)
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


# ── Paper Trading ────────────────────────────────────────────────────

STARTING_CASH = Decimal("100000.00")


class PaperPortfolioView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        portfolio, _ = PaperPortfolio.objects.get_or_create(
            user=request.user,
            defaults={"cash_balance": STARTING_CASH},
        )
        serializer = PaperPortfolioSerializer(portfolio)
        return Response(serializer.data)

    def delete(self, request):
        """Reset paper portfolio to starting state."""
        portfolio, _ = PaperPortfolio.objects.get_or_create(
            user=request.user,
            defaults={"cash_balance": STARTING_CASH},
        )
        portfolio.positions.all().delete()
        portfolio.trades.all().delete()
        portfolio.cash_balance = STARTING_CASH
        portfolio.save()
        serializer = PaperPortfolioSerializer(portfolio)
        return Response(serializer.data)


class PlaceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ticker = request.data.get("ticker", "").strip().upper()
        action = request.data.get("action", "").strip().upper()
        shares_raw = request.data.get("shares")
        price_raw = request.data.get("price")

        # ── Validate inputs ──────────────────────────────────────────
        if not ticker:
            return Response({"error": "ticker is required"}, status=400)
        if action not in ("BUY", "SELL"):
            return Response({"error": "action must be BUY or SELL"}, status=400)
        try:
            shares = Decimal(str(shares_raw)).quantize(Decimal("0.000001"))
            price = Decimal(str(price_raw)).quantize(Decimal("0.0001"))
        except (InvalidOperation, TypeError):
            return Response({"error": "shares and price must be valid numbers"}, status=400)
        if shares <= 0 or price <= 0:
            return Response({"error": "shares and price must be positive"}, status=400)

        total = (shares * price).quantize(Decimal("0.01"))

        portfolio, _ = PaperPortfolio.objects.get_or_create(
            user=request.user,
            defaults={"cash_balance": STARTING_CASH},
        )

        if action == "BUY":
            if portfolio.cash_balance < total:
                return Response(
                    {"error": f"Insufficient funds. Available: ${portfolio.cash_balance:.2f}, Required: ${total:.2f}"},
                    status=400,
                )
            # Update or create position
            pos, created = PaperPosition.objects.get_or_create(
                portfolio=portfolio,
                ticker=ticker,
                defaults={"shares": shares, "avg_cost": price},
            )
            if not created:
                # Weighted average cost
                new_total_shares = pos.shares + shares
                pos.avg_cost = ((pos.avg_cost * pos.shares) + (price * shares)) / new_total_shares
                pos.shares = new_total_shares
                pos.save()
            portfolio.cash_balance -= total
            portfolio.save()

        elif action == "SELL":
            try:
                pos = PaperPosition.objects.get(portfolio=portfolio, ticker=ticker)
            except PaperPosition.DoesNotExist:
                return Response({"error": f"No position in {ticker}"}, status=400)
            if pos.shares < shares:
                return Response(
                    {"error": f"Insufficient shares. Have {pos.shares}, selling {shares}"},
                    status=400,
                )
            pos.shares -= shares
            if pos.shares == 0:
                pos.delete()
            else:
                pos.save()
            portfolio.cash_balance += total
            portfolio.save()

        # Record the trade
        trade = PaperTrade.objects.create(
            portfolio=portfolio,
            ticker=ticker,
            action=action,
            shares=shares,
            price=price,
            total=total,
        )

        return Response(
            {
                "trade": PaperTradeSerializer(trade).data,
                "cash_balance": str(portfolio.cash_balance),
            },
            status=status.HTTP_201_CREATED,
        )


class PaperTradeListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        portfolio, _ = PaperPortfolio.objects.get_or_create(
            user=request.user,
            defaults={"cash_balance": STARTING_CASH},
        )
        ticker = request.query_params.get("ticker", "")
        trades = portfolio.trades.all()
        if ticker:
            trades = trades.filter(ticker=ticker.upper())
        serializer = PaperTradeSerializer(trades, many=True)
        return Response(serializer.data)
