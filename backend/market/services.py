import requests
from django.conf import settings


def check_av_error(data: dict) -> str | None:
    """Check Alpha Vantage response for error fields. Returns error message or None."""
    if "Error Message" in data:
        return data["Error Message"]
    if "Note" in data:
        return data["Note"]
    if "Information" in data:
        return data["Information"]
    return None


class AlphaVantageClient:
    BASE_URL = "https://www.alphavantage.co/query"

    def __init__(self):
        self.api_key = settings.ALPHA_VANTAGE_API_KEY
        if not self.api_key:
            raise RuntimeError(
                "ALPHA_VANTAGE_API_KEY is not configured. "
                "Set it in your environment (see backend/.env.example)."
            )

    def _get(self, **params):
        params["apikey"] = self.api_key
        response = requests.get(self.BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json()

    def search(self, keywords: str) -> dict:
        return self._get(function="SYMBOL_SEARCH", keywords=keywords)

    def global_quote(self, symbol: str) -> dict:
        return self._get(function="GLOBAL_QUOTE", symbol=symbol)

    def time_series_daily(self, symbol: str, outputsize: str = "compact") -> dict:
        return self._get(
            function="TIME_SERIES_DAILY",
            symbol=symbol,
            outputsize=outputsize,
        )
