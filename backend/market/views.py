from decimal import Decimal, InvalidOperation
from datetime import datetime, timedelta, time as dt_time

import yfinance as yf
from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Entity,
    WatchlistItem,
    Note,
    EconomicEvent,
    EarningsEvent,
    EventReminder,
    AlertRule,
    AlertEvent,
)
from .serializers import (
    EntitySerializer,
    WatchlistItemSerializer,
    NoteSerializer,
    EconomicEventSerializer,
    EarningsEventSerializer,
    EventReminderSerializer,
    AlertRuleSerializer,
    AlertEventSerializer,
)
from .services import SymbolSearch, YFinanceClient


class AlphaVantageClient:
    """Compatibility wrapper used by existing API tests."""

    def __init__(self):
        self._search = SymbolSearch()
        self._yf = YFinanceClient()

    def search(self, query: str):
        return self._search.search(query)

    def global_quote(self, symbol: str):
        return self._yf.global_quote(symbol)

    def time_series_daily(self, symbol: str, period: str = "1y"):
        return self._yf.time_series_daily(symbol, period=period)


def _decimal_from_quote_field(payload: dict, key: str) -> Decimal | None:
    value = payload.get(key)
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        return None


def _recent_duplicate_event_exists(rule: AlertRule, message: str) -> bool:
    window_start = timezone.now() - timedelta(minutes=30)
    return AlertEvent.objects.filter(
        user=rule.user,
        rule=rule,
        message=message,
        created_at__gte=window_start,
        acknowledged=False,
    ).exists()


def _emit_alert_event(rule: AlertRule, message: str, severity: str, payload: dict | None = None) -> bool:
    if _recent_duplicate_event_exists(rule, message):
        return False
    AlertEvent.objects.create(
        user=rule.user,
        rule=rule,
        message=message,
        severity=severity,
        payload=payload or {},
    )
    rule.last_triggered_at = timezone.now()
    rule.save(update_fields=["last_triggered_at", "updated_at"])
    return True


def _evaluate_single_rule(rule: AlertRule) -> bool:
    threshold = Decimal(str(rule.threshold))
    symbol = (rule.symbol or "").strip().upper()

    if rule.rule_type in {
        AlertRule.TYPE_PRICE_ABOVE,
        AlertRule.TYPE_PRICE_BELOW,
        AlertRule.TYPE_MOVE_UP_PCT,
        AlertRule.TYPE_MOVE_DOWN_PCT,
    }:
        if not symbol:
            return False
        quote = AlphaVantageClient().global_quote(symbol)
        quote_payload = quote.get("Global Quote") or {}
        price = _decimal_from_quote_field(quote_payload, "05. price")
        prev_close = _decimal_from_quote_field(quote_payload, "08. previous close")
        if price is None:
            return False

        if rule.rule_type == AlertRule.TYPE_PRICE_ABOVE and price >= threshold:
            return _emit_alert_event(
                rule,
                f"{symbol} crossed above {threshold:.2f} (now {price:.2f}).",
                AlertEvent.SEVERITY_WARNING,
                {"symbol": symbol, "price": f"{price:.4f}", "threshold": f"{threshold:.4f}"},
            )
        if rule.rule_type == AlertRule.TYPE_PRICE_BELOW and price <= threshold:
            return _emit_alert_event(
                rule,
                f"{symbol} dropped below {threshold:.2f} (now {price:.2f}).",
                AlertEvent.SEVERITY_CRITICAL,
                {"symbol": symbol, "price": f"{price:.4f}", "threshold": f"{threshold:.4f}"},
            )
        if prev_close and prev_close > 0:
            move_pct = ((price - prev_close) / prev_close) * Decimal("100")
            if rule.rule_type == AlertRule.TYPE_MOVE_UP_PCT and move_pct >= threshold:
                return _emit_alert_event(
                    rule,
                    f"{symbol} is up {move_pct:.2f}% today (threshold {threshold:.2f}%).",
                    AlertEvent.SEVERITY_INFO,
                    {"symbol": symbol, "move_pct": f"{move_pct:.4f}", "threshold": f"{threshold:.4f}"},
                )
            if rule.rule_type == AlertRule.TYPE_MOVE_DOWN_PCT and (-move_pct) >= threshold:
                return _emit_alert_event(
                    rule,
                    f"{symbol} is down {abs(move_pct):.2f}% today (threshold {threshold:.2f}%).",
                    AlertEvent.SEVERITY_WARNING,
                    {"symbol": symbol, "move_pct": f"{move_pct:.4f}", "threshold": f"{threshold:.4f}"},
                )
        return False

    if rule.rule_type == AlertRule.TYPE_EVENT_SOON_MINUTES:
        minutes = int(threshold)
        now = timezone.now()
        cutoff = now + timedelta(minutes=minutes)
        has_event = EconomicEvent.objects.filter(scheduled_at__gte=now, scheduled_at__lte=cutoff).exists() or EarningsEvent.objects.filter(
            Q(scheduled_at__gte=now), Q(scheduled_at__lte=cutoff)
        ).exists()
        if has_event:
            return _emit_alert_event(
                rule,
                f"At least one market event is scheduled in the next {minutes} minutes.",
                AlertEvent.SEVERITY_INFO,
                {"minutes": minutes},
            )
        return False

    return False


def evaluate_alert_rules_for_user(user) -> int:
    created = 0
    rules = AlertRule.objects.filter(user=user, enabled=True)
    for rule in rules:
        if _evaluate_single_rule(rule):
            created += 1
    return created


def _to_decimal_or_none(value) -> Decimal | None:
    if value in (None, "", "N/A", "None", "-"):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _fetch_earnings_history(symbol: str, limit: int = 6) -> list[dict]:
    items: list[dict] = []
    try:
        df = yf.Ticker(symbol).get_earnings_dates(limit=limit)
        if df is None or df.empty:
            return items
        for idx, row in df.head(limit).iterrows():
            dt = _coerce_datetime(idx)
            if not dt:
                continue
            est = row.get("EPS Estimate") if hasattr(row, "get") else None
            actual = row.get("Reported EPS") if hasattr(row, "get") else None
            surprise = row.get("Surprise(%)") if hasattr(row, "get") else None
            items.append(
                {
                    "date": dt.isoformat(),
                    "eps_estimate": None if est is None else str(est),
                    "eps_actual": None if actual is None else str(actual),
                    "surprise_pct": None if surprise is None else str(surprise),
                }
            )
    except Exception:
        return items
    return items


class SymbolSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "Le paramètre 'q' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        data = AlphaVantageClient().search(query)
        if data.get("Error Message"):
            return Response({"error": data["Error Message"]}, status=status.HTTP_400_BAD_REQUEST)
        if data.get("Note") or data.get("Information"):
            return Response({"error": "API provider temporarily unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(data)


class QuoteView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = request.query_params.get("symbol", "").strip()
        if not symbol:
            return Response({"error": "Le paramètre 'symbol' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        data = AlphaVantageClient().global_quote(symbol)
        if data.get("Error Message"):
            return Response({"error": data["Error Message"]}, status=status.HTTP_400_BAD_REQUEST)
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
        data = AlphaVantageClient().time_series_daily(symbol, period=period)
        if data.get("Error Message"):
            return Response({"error": data["Error Message"]}, status=status.HTTP_400_BAD_REQUEST)
        if data.get("Note") or data.get("Information"):
            return Response({"error": "API provider temporarily unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
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


class EntityContextView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        symbol = (request.query_params.get("symbol") or "").strip().upper()
        if not symbol:
            return Response({"error": "symbol is required"}, status=status.HTTP_400_BAD_REQUEST)

        overview = YFinanceClient().company_overview(symbol)
        sector = (overview.get("Sector") or "").strip()
        peers: list[dict] = []
        if sector:
            for peer_symbol in YFinanceClient.SCAN_TICKERS:
                if peer_symbol.upper() == symbol:
                    continue
                peer_overview = YFinanceClient().company_overview(peer_symbol)
                if (peer_overview.get("Sector") or "").strip() != sector:
                    continue
                peer_quote = AlphaVantageClient().global_quote(peer_symbol)
                payload = peer_quote.get("Global Quote") or {}
                price = _to_decimal_or_none(payload.get("05. price"))
                cp = payload.get("10. change percent") or ""
                peers.append(
                    {
                        "symbol": peer_symbol,
                        "name": peer_overview.get("Name") or peer_symbol,
                        "price": None if price is None else f"{price:.2f}",
                        "change_percent": cp,
                        "market_cap": peer_overview.get("MarketCapitalization") or "N/A",
                    }
                )
                if len(peers) >= 6:
                    break

        earnings_history = _fetch_earnings_history(symbol, limit=8)
        return Response(
            {
                "symbol": symbol,
                "overview": overview,
                "peers": peers,
                "earnings_history": earnings_history,
            }
        )


class EntityViewSet(viewsets.ModelViewSet):
    serializer_class = EntitySerializer

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Entity.objects.all()
        ticker = self.request.query_params.get("ticker")
        if ticker:
            qs = qs.filter(ticker__iexact=ticker)
        return qs


class WatchlistViewSet(viewsets.ModelViewSet):
    serializer_class = WatchlistItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = WatchlistItem.objects.filter(user=self.request.user)
        list_name = (self.request.query_params.get("list_name") or "").strip()
        if list_name:
            qs = qs.filter(list_name=list_name)
        tag = (self.request.query_params.get("tag") or "").strip()
        if tag:
            qs = qs.filter(tags__contains=[tag])
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entity = serializer.validated_data["entity"]
        list_name = serializer.validated_data.get("list_name", "Default")
        tags = serializer.validated_data.get("tags", [])
        obj, created = WatchlistItem.objects.get_or_create(
            user=request.user,
            entity=entity,
            list_name=list_name,
            defaults={"tags": tags},
        )
        if not created and tags:
            existing = obj.tags if isinstance(obj.tags, list) else []
            merged = []
            for t in [*existing, *tags]:
                if t and t not in merged:
                    merged.append(t)
            if merged != existing:
                obj.tags = merged
                obj.save(update_fields=["tags"])
        return Response(
            WatchlistItemSerializer(obj).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class WatchlistCollectionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        items = WatchlistItem.objects.filter(user=request.user)
        by_list: dict[str, dict] = {}
        for item in items:
            name = item.list_name or "Default"
            entry = by_list.setdefault(name, {"name": name, "count": 0, "tags": []})
            entry["count"] += 1
            existing_tags = entry["tags"]
            item_tags = item.tags if isinstance(item.tags, list) else []
            for tag in item_tags:
                if tag and tag not in existing_tags:
                    existing_tags.append(tag)
        return Response(sorted(by_list.values(), key=lambda x: (x["name"] != "Default", x["name"])))


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def _next_weekday(base: datetime, weekday: int, hour: int = 12, minute: int = 30) -> datetime:
    delta = (weekday - base.weekday()) % 7
    if delta == 0:
        delta = 7
    target = (base + timedelta(days=delta)).date()
    return datetime.combine(target, dt_time(hour=hour, minute=minute), tzinfo=timezone.UTC)


def _first_friday_next_month(base: datetime) -> datetime:
    year = base.year + (1 if base.month == 12 else 0)
    month = 1 if base.month == 12 else base.month + 1
    first_day = datetime(year, month, 1, tzinfo=timezone.UTC)
    return _next_weekday(first_day, weekday=4, hour=12, minute=30)  # Friday


def _seed_economic_events() -> None:
    now = timezone.now()
    templates = [
        {
            "title": "FOMC Rate Decision",
            "event_type": EconomicEvent.EVENT_FOMC,
            "scheduled_at": _next_weekday(now, weekday=2, hour=18, minute=0),  # Wednesday
            "country": "US",
            "currency": "USD",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "US CPI Inflation",
            "event_type": EconomicEvent.EVENT_CPI,
            "scheduled_at": _next_weekday(now, weekday=3, hour=12, minute=30),  # Thursday
            "country": "US",
            "currency": "USD",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "US Nonfarm Payrolls",
            "event_type": EconomicEvent.EVENT_NFP,
            "scheduled_at": _first_friday_next_month(now),
            "country": "US",
            "currency": "USD",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "US GDP Release",
            "event_type": EconomicEvent.EVENT_GDP,
            "scheduled_at": _next_weekday(now + timedelta(days=14), weekday=3, hour=12, minute=30),
            "country": "US",
            "currency": "USD",
            "importance": EconomicEvent.IMPORTANCE_MEDIUM,
        },
        {
            "title": "US Manufacturing PMI",
            "event_type": EconomicEvent.EVENT_PMI,
            "scheduled_at": _next_weekday(now + timedelta(days=7), weekday=0, hour=14, minute=0),
            "country": "US",
            "currency": "USD",
            "importance": EconomicEvent.IMPORTANCE_MEDIUM,
        },
        {
            "title": "ECB Rate Decision",
            "event_type": EconomicEvent.EVENT_FOMC,
            "scheduled_at": _next_weekday(now + timedelta(days=5), weekday=3, hour=11, minute=45),
            "country": "EU",
            "currency": "EUR",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "Eurozone CPI Flash",
            "event_type": EconomicEvent.EVENT_CPI,
            "scheduled_at": _next_weekday(now + timedelta(days=10), weekday=4, hour=9, minute=0),
            "country": "EU",
            "currency": "EUR",
            "importance": EconomicEvent.IMPORTANCE_MEDIUM,
        },
        {
            "title": "BoE Rate Decision",
            "event_type": EconomicEvent.EVENT_FOMC,
            "scheduled_at": _next_weekday(now + timedelta(days=8), weekday=3, hour=12, minute=0),
            "country": "UK",
            "currency": "GBP",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "UK CPI",
            "event_type": EconomicEvent.EVENT_CPI,
            "scheduled_at": _next_weekday(now + timedelta(days=11), weekday=2, hour=7, minute=0),
            "country": "UK",
            "currency": "GBP",
            "importance": EconomicEvent.IMPORTANCE_MEDIUM,
        },
        {
            "title": "BoJ Rate Decision",
            "event_type": EconomicEvent.EVENT_FOMC,
            "scheduled_at": _next_weekday(now + timedelta(days=9), weekday=1, hour=3, minute=0),
            "country": "JP",
            "currency": "JPY",
            "importance": EconomicEvent.IMPORTANCE_HIGH,
        },
        {
            "title": "Japan CPI",
            "event_type": EconomicEvent.EVENT_CPI,
            "scheduled_at": _next_weekday(now + timedelta(days=15), weekday=4, hour=0, minute=30),
            "country": "JP",
            "currency": "JPY",
            "importance": EconomicEvent.IMPORTANCE_MEDIUM,
        },
    ]

    for event in templates:
        EconomicEvent.objects.get_or_create(
            title=event["title"],
            scheduled_at=event["scheduled_at"],
            defaults={
                "event_type": event["event_type"],
                "country": event.get("country", "US"),
                "currency": event.get("currency", "USD"),
                "importance": event["importance"],
                "source_url": "",
            },
        )


def _coerce_datetime(raw) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        dt = raw
    elif hasattr(raw, "to_pydatetime"):
        dt = raw.to_pydatetime()
    elif hasattr(raw, "item"):
        try:
            maybe = raw.item()
            if isinstance(maybe, datetime):
                dt = maybe
            elif hasattr(maybe, "to_pydatetime"):
                dt = maybe.to_pydatetime()
            else:
                return None
        except Exception:
            return None
    else:
        return None

    if timezone.is_naive(dt):
        dt = dt.replace(tzinfo=timezone.UTC)
    return dt


def _fetch_earnings_datetime(ticker: str) -> datetime | None:
    try:
        data = yf.Ticker(ticker).get_earnings_dates(limit=1)
        if data is not None and not data.empty:
            return _coerce_datetime(data.index[0])
    except Exception:
        pass

    try:
        cal = yf.Ticker(ticker).calendar
        if cal is not None and hasattr(cal, "index") and "Earnings Date" in cal.index:
            raw = cal.loc["Earnings Date"].iloc[0]
            if isinstance(raw, (list, tuple)) and raw:
                raw = raw[0]
            return _coerce_datetime(raw)
    except Exception:
        pass

    return None


class EconomicCalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _seed_economic_events()

        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        now = timezone.now()
        from_dt = datetime.fromisoformat(from_str) if from_str else now
        to_dt = datetime.fromisoformat(to_str) if to_str else now + timedelta(days=45)
        if timezone.is_naive(from_dt):
            from_dt = timezone.make_aware(from_dt, timezone.UTC)
        if timezone.is_naive(to_dt):
            to_dt = timezone.make_aware(to_dt, timezone.UTC)

        qs = EconomicEvent.objects.filter(scheduled_at__gte=from_dt, scheduled_at__lte=to_dt)
        importance = request.query_params.get("importance")
        if importance:
            qs = qs.filter(importance=importance.upper())
        currency = request.query_params.get("currency")
        if currency:
            qs = qs.filter(currency__iexact=currency.strip().upper())
        return Response(EconomicEventSerializer(qs, many=True).data)


class EarningsCalendarView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        watchlist_only = request.query_params.get("watchlist_only", "true").lower() in ("1", "true", "yes")
        from_str = request.query_params.get("from")
        to_str = request.query_params.get("to")
        now = timezone.now()
        from_dt = datetime.fromisoformat(from_str) if from_str else now
        to_dt = datetime.fromisoformat(to_str) if to_str else now + timedelta(days=45)
        if timezone.is_naive(from_dt):
            from_dt = timezone.make_aware(from_dt, timezone.UTC)
        if timezone.is_naive(to_dt):
            to_dt = timezone.make_aware(to_dt, timezone.UTC)

        if watchlist_only:
            tickers = list(
                WatchlistItem.objects.filter(user=request.user).values_list("entity__ticker", flat=True).distinct()
            )
        else:
            tickers = request.query_params.getlist("tickers")

        for ticker in tickers:
            symbol = ticker.strip().upper()
            if not symbol:
                continue
            dt = _fetch_earnings_datetime(symbol)
            if not dt:
                continue
            company = ""
            entity = Entity.objects.filter(ticker__iexact=symbol).first()
            if entity:
                company = entity.nom
            EarningsEvent.objects.update_or_create(
                ticker=symbol,
                scheduled_at=dt,
                defaults={
                    "company_name": company,
                    "session": EarningsEvent.SESSION_TBD,
                    "source_url": "",
                },
            )

        qs = EarningsEvent.objects.filter(scheduled_at__gte=from_dt, scheduled_at__lte=to_dt)
        if tickers:
            qs = qs.filter(ticker__in=[t.strip().upper() for t in tickers if t.strip()])
        return Response(EarningsEventSerializer(qs, many=True).data)


class EventReminderViewSet(viewsets.ModelViewSet):
    serializer_class = EventReminderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return EventReminder.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        obj, created = EventReminder.objects.get_or_create(
            user=request.user,
            economic_event=data.get("economic_event"),
            earnings_event=data.get("earnings_event"),
            offset_minutes=data.get("offset_minutes", 60),
            defaults={"enabled": data.get("enabled", True)},
        )
        if not created and "enabled" in data:
            obj.enabled = data["enabled"]
            obj.save(update_fields=["enabled"])

        return Response(EventReminderSerializer(obj).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class AlertRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AlertRule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AlertEventViewSet(viewsets.ModelViewSet):
    serializer_class = AlertEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        evaluate_alert_rules_for_user(self.request.user)
        return AlertEvent.objects.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        event = self.get_object()
        acknowledged = request.data.get("acknowledged")
        if isinstance(acknowledged, bool):
            event.acknowledged = acknowledged
            event.save(update_fields=["acknowledged"])
        return Response(self.get_serializer(event).data)


class AlertEvaluateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        created = evaluate_alert_rules_for_user(request.user)
        unacked = AlertEvent.objects.filter(user=request.user, acknowledged=False).count()
        return Response({"created": created, "unacknowledged": unacked})
