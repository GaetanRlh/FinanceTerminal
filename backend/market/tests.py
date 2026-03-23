from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Entity, WatchlistItem, Note, AlertRule, AlertEvent

User = get_user_model()


class SymbolSearchViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/market/search/"

    def test_search_requires_q_param(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.json())

    @patch("market.views.AlphaVantageClient")
    def test_search_returns_data(self, mock_client_class):
        mock_client_class.return_value.search.return_value = {
            "bestMatches": [
                {"1. symbol": "AAPL", "2. name": "Apple Inc", "4. region": "United States", "8. currency": "USD"}
            ]
        }
        response = self.client.get(self.url, {"q": "apple"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("bestMatches", response.json())

    @patch("market.views.AlphaVantageClient")
    def test_search_handles_error_message(self, mock_client_class):
        mock_client_class.return_value.search.return_value = {"Error Message": "Invalid API call"}
        response = self.client.get(self.url, {"q": "apple"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"], "Invalid API call")

    @patch("market.views.AlphaVantageClient")
    def test_search_handles_rate_limit(self, mock_client_class):
        mock_client_class.return_value.search.return_value = {
            "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute."
        }
        response = self.client.get(self.url, {"q": "apple"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.json())

    @patch("market.views.AlphaVantageClient")
    def test_search_handles_daily_rate_limit(self, mock_client_class):
        mock_client_class.return_value.search.return_value = {
            "Information": "We have detected your API key... our standard API rate limit is 25 requests per day."
        }
        response = self.client.get(self.url, {"q": "apple"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", response.json())


class QuoteViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/market/quote/"

    def test_quote_requires_symbol_param(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("market.views.AlphaVantageClient")
    def test_quote_returns_data(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "150.25",
                "10. change percent": "1.50%",
            }
        }
        response = self.client.get(self.url, {"symbol": "AAPL"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Global Quote", response.json())

    @patch("market.views.AlphaVantageClient")
    def test_quote_syncs_valeur_totale(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {
                "01. symbol": "AAPL",
                "05. price": "175.50",
                "10. change percent": "0.00%",
            }
        }
        entity = Entity.objects.create(nom="Apple", ticker="AAPL", secteur="Tech", valeur_totale=0)
        self.client.get(self.url, {"symbol": "AAPL"})
        entity.refresh_from_db()
        self.assertEqual(float(entity.valeur_totale), 175.50)

    @patch("market.views.AlphaVantageClient")
    def test_quote_handles_error_message(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {"Error Message": "Invalid symbol"}
        response = self.client.get(self.url, {"symbol": "INVALID"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TimeSeriesViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/market/time-series/"

    def test_time_series_requires_symbol_param(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("market.views.AlphaVantageClient")
    def test_time_series_returns_data(self, mock_client_class):
        mock_client_class.return_value.time_series_daily.return_value = {
            "Time Series (Daily)": {
                "2024-01-15": {"4. close": "150.00"},
            }
        }
        response = self.client.get(self.url, {"symbol": "AAPL"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Time Series (Daily)", response.json())

    @patch("market.views.AlphaVantageClient")
    def test_time_series_handles_rate_limit(self, mock_client_class):
        mock_client_class.return_value.time_series_daily.return_value = {
            "Note": "Thank you for using Alpha Vantage!"
        }
        response = self.client.get(self.url, {"symbol": "AAPL"})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


class EntityViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123", full_name="Test User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_entities_requires_auth(self):
        self.client.logout()
        response = self.client.get("/api/market/entities/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_entity(self):
        response = self.client.post(
            "/api/market/entities/",
            {"nom": "Apple", "ticker": "AAPL", "secteur": "Tech", "valeur_totale": 0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["ticker"], "AAPL")


class WatchlistViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123", full_name="Test User")
        self.entity = Entity.objects.create(nom="Apple", ticker="AAPL", secteur="Tech", valeur_totale=0)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_add_to_watchlist(self):
        response = self.client.post("/api/market/watchlist/", {"entity_id": self.entity.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["entity"]["ticker"], "AAPL")

    def test_add_duplicate_returns_existing(self):
        self.client.post("/api/market/watchlist/", {"entity_id": self.entity.id}, format="json")
        response = self.client.post("/api/market/watchlist/", {"entity_id": self.entity.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(WatchlistItem.objects.filter(user=self.user, entity=self.entity).count(), 1)

    def test_add_to_named_watchlist_and_list_collections(self):
        response = self.client.post(
            "/api/market/watchlist/",
            {"entity_id": self.entity.id, "list_name": "Tech Growth", "tags": ["core", "ai"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["list_name"], "Tech Growth")
        self.assertEqual(response.json()["tags"], ["core", "ai"])
        collections = self.client.get("/api/market/watchlist/lists/")
        self.assertEqual(collections.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["name"] == "Tech Growth" for item in collections.json()))

    def test_remove_from_watchlist(self):
        item = WatchlistItem.objects.create(user=self.user, entity=self.entity)
        response = self.client.delete(f"/api/market/watchlist/{item.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WatchlistItem.objects.filter(user=self.user, entity=self.entity).exists())


class NoteViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", password="testpass123", full_name="Test User")
        self.entity = Entity.objects.create(nom="Apple", ticker="AAPL", secteur="Tech", valeur_totale=0)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_note(self):
        response = self.client.post(
            "/api/market/notes/",
            {"entity_id": self.entity.id, "titre": "My Note", "contenu": "Note content"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["titre"], "My Note")
        self.assertTrue(Note.objects.filter(user=self.user, entity=self.entity).exists())

    def test_list_notes_requires_auth(self):
        self.client.logout()
        response = self.client.get("/api/market/notes/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AlertEngineTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="alerts@example.com", password="testpass123", full_name="Alerts User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_alert_rule(self):
        response = self.client.post(
            "/api/market/alerts/rules/",
            {
                "name": "AAPL above 100",
                "rule_type": "PRICE_ABOVE",
                "symbol": "AAPL",
                "threshold": "100",
                "enabled": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AlertRule.objects.filter(user=self.user).count(), 1)

    @patch("market.views.AlphaVantageClient")
    def test_evaluate_alert_creates_event(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {"01. symbol": "AAPL", "05. price": "150.00", "08. previous close": "140.00"}
        }
        AlertRule.objects.create(
            user=self.user,
            name="AAPL above 100",
            rule_type=AlertRule.TYPE_PRICE_ABOVE,
            symbol="AAPL",
            threshold="100",
            enabled=True,
        )
        response = self.client.post("/api/market/alerts/evaluate/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(AlertEvent.objects.filter(user=self.user).count(), 1)

    def test_patch_alert_acknowledged(self):
        rule = AlertRule.objects.create(
            user=self.user,
            name="Portfolio drawdown",
            rule_type=AlertRule.TYPE_DRAWDOWN_PCT,
            symbol="",
            threshold="5",
            enabled=True,
        )
        event = AlertEvent.objects.create(
            user=self.user,
            rule=rule,
            message="Portfolio drawdown reached 6.00%",
            severity=AlertEvent.SEVERITY_CRITICAL,
        )
        response = self.client.patch(f"/api/market/alerts/events/{event.id}/", {"acknowledged": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event.refresh_from_db()
        self.assertTrue(event.acknowledged)


class PaperTradingAdvancedTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="paper@example.com", password="testpass123", full_name="Paper User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("market.views.AlphaVantageClient")
    def test_place_limit_order_and_evaluate_fill(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {"01. symbol": "AAPL", "05. price": "99.00", "08. previous close": "100.00"}
        }
        place = self.client.post(
            "/api/market/paper/trade/",
            {"ticker": "AAPL", "action": "BUY", "shares": "1", "order_type": "LIMIT", "trigger_price": "100"},
            format="json",
        )
        self.assertEqual(place.status_code, status.HTTP_201_CREATED)
        self.assertEqual(place.json()["status"], "PENDING")

        eval_res = self.client.post("/api/market/paper/orders/evaluate/", {}, format="json")
        self.assertEqual(eval_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(eval_res.json()["filled"], 1)

    @patch("market.views.AlphaVantageClient")
    def test_market_order_response_contains_order_and_trade(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {"01. symbol": "AAPL", "05. price": "100.00", "08. previous close": "99.00"}
        }
        res = self.client.post(
            "/api/market/paper/trade/",
            {"ticker": "AAPL", "action": "BUY", "shares": "1", "order_type": "MARKET"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        payload = res.json()
        self.assertIn("order", payload)
        self.assertIn("trade", payload)

    @patch("market.views.AlphaVantageClient")
    def test_paper_performance_endpoint(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {"01. symbol": "AAPL", "05. price": "100.00", "08. previous close": "98.00"}
        }
        self.client.post(
            "/api/market/paper/trade/",
            {"ticker": "AAPL", "action": "BUY", "shares": "1", "order_type": "MARKET"},
            format="json",
        )
        perf = self.client.get("/api/market/paper/performance/", {"period": "1M"})
        self.assertEqual(perf.status_code, status.HTTP_200_OK)
        self.assertIn("series", perf.json())
        self.assertIn("stats", perf.json())

    @patch("market.views.AlphaVantageClient")
    def test_benchmark_endpoint(self, mock_client_class):
        mock_client_class.return_value.global_quote.return_value = {
            "Global Quote": {"01. symbol": "AAPL", "05. price": "100.00", "08. previous close": "98.00"}
        }
        mock_client_class.return_value.time_series_daily.return_value = {
            "Time Series (Daily)": {
                "2026-01-01": {"4. close": "100"},
                "2026-01-02": {"4. close": "101"},
                "2026-01-03": {"4. close": "102"},
            }
        }
        self.client.post(
            "/api/market/paper/trade/",
            {"ticker": "AAPL", "action": "BUY", "shares": "1", "order_type": "MARKET"},
            format="json",
        )
        benchmark = self.client.get("/api/market/paper/benchmark/", {"benchmark": "SPY", "period": "1M"})
        self.assertEqual(benchmark.status_code, status.HTTP_200_OK)
        self.assertIn("alpha_pct", benchmark.json())


class EntityContextTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="context@example.com", password="testpass123", full_name="Context User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("market.views.AlphaVantageClient.global_quote")
    @patch("market.views.YFinanceClient.company_overview")
    def test_entity_context(self, mock_overview, mock_quote):
        def overview_side(symbol):
            return {
                "Symbol": symbol,
                "Name": symbol,
                "Sector": "Technology",
                "MarketCapitalization": "500000000000",
            }

        mock_overview.side_effect = overview_side
        mock_quote.return_value = {"Global Quote": {"05. price": "100.00", "10. change percent": "0.50%"}}
        res = self.client.get("/api/market/entity-context/", {"symbol": "AAPL"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        payload = res.json()
        self.assertIn("peers", payload)
        self.assertIn("earnings_history", payload)
