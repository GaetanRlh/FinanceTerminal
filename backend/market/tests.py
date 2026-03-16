from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Entity, WatchlistItem, Note

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
