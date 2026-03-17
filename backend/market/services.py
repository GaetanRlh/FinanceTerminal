"""
Market data services — backed by yfinance (Yahoo Finance).
No API key required, generous rate limits, free forever.
Alpha Vantage is kept only for symbol search.
"""
from __future__ import annotations

import datetime
import zoneinfo
from typing import Any

import requests
import yfinance as yf
from django.conf import settings
from django.core.cache import cache

# ── Helpers ────────────────────────────────────────────────────────────────


def check_av_error(data: dict) -> str | None:
    if "Error Message" in data:
        return data["Error Message"]
    if "Note" in data:
        return data["Note"]
    if "Information" in data:
        return data["Information"]
    return None


def _safe_float(val: Any, digits: int = 2) -> float | None:
    try:
        v = float(val)
        return round(v, digits)
    except (TypeError, ValueError):
        return None


# ── Alpha Vantage (search only) ───────────────────────────────────────────


class AlphaVantageClient:
    """Kept only as a namespace; search now uses Yahoo Finance directly."""

    TTL_SEARCH = 3600  # 1 h
    _SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
    _HEADERS = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }

    def search(self, keywords: str) -> dict:
        key = f"yf:search:{keywords.lower()}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                self._SEARCH_URL,
                params={"q": keywords, "quotesCount": 10, "newsCount": 0, "listsCount": 0},
                headers=self._HEADERS,
                timeout=10,
            )
            resp.raise_for_status()
            raw = resp.json()
        except Exception:
            return {"bestMatches": []}

        quotes = raw.get("quotes") or []
        matches = []
        for q in quotes:
            sym = q.get("symbol", "")
            name = q.get("longname") or q.get("shortname") or sym
            exchange = q.get("exchange", "")
            # Map exchange codes to regions
            region_map = {
                "NMS": "United States", "NYQ": "United States", "NGM": "United States",
                "PCX": "United States", "BTS": "United States", "LSE": "United Kingdom",
                "TSX": "Canada", "FRA": "Germany", "PAR": "France", "TYO": "Japan",
            }
            region = region_map.get(exchange, exchange)
            currency = q.get("currency", "USD")
            matches.append({
                "1. symbol": sym,
                "2. name": name,
                "3. type": q.get("quoteType", "Equity"),
                "4. region": region,
                "5. marketOpen": "09:30",
                "6. marketClose": "16:00",
                "7. timezone": "UTC-04",
                "8. currency": currency,
                "9. matchScore": "1.0000",
            })

        result = {"bestMatches": matches}
        if matches:
            cache.set(key, result, self.TTL_SEARCH)
        return result


# ── yfinance client ───────────────────────────────────────────────────────


class YFinanceClient:
    TTL_QUOTE = 120          # 2 min
    TTL_TIME_SERIES = 1800   # 30 min
    TTL_OVERVIEW = 86400     # 24 h
    TTL_NEWS = 900           # 15 min
    TTL_TOP_MOVERS = 600     # 10 min
    TTL_MARKET_STATUS = 60   # 1 min

    # Curated tickers for top-movers scan (S&P 500 large-caps)
    SCAN_TICKERS = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
        "JPM", "V", "UNH", "JNJ", "XOM", "PG", "MA", "HD", "CVX", "MRK",
        "LLY", "ABBV", "PEP", "KO", "AVGO", "COST", "WMT", "BAC", "MCD",
        "TMO", "CSCO", "ACN", "DHR", "NEE", "LIN", "ADBE", "TXN", "AMD",
        "INTC", "QCOM", "IBM", "CRM", "ORCL", "NFLX", "DIS", "PYPL",
        "SPY", "QQQ", "DIA", "IWM", "GLD", "SLV", "VIX",
    ]

    # ── Quote ─────────────────────────────────────────────────────────────

    def global_quote(self, symbol: str) -> dict:
        key = f"yf:quote:{symbol.upper()}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d", auto_adjust=True)
            info = ticker.fast_info  # lightweight, no heavy scrape

            if hist.empty:
                return {"Global Quote": {}}

            latest = hist.iloc[-1]
            prev = hist.iloc[-2] if len(hist) >= 2 else hist.iloc[-1]

            price = _safe_float(latest["Close"], 4)
            prev_close = _safe_float(prev["Close"], 4)
            change = round(price - prev_close, 4) if price and prev_close else None
            change_pct = round((change / prev_close) * 100, 4) if change and prev_close else None
            volume = int(latest["Volume"]) if latest["Volume"] else None
            high = _safe_float(latest["High"], 4)
            low = _safe_float(latest["Low"], 4)
            open_ = _safe_float(latest["Open"], 4)

            # 52-week range from fast_info (may be None for some tickers)
            try:
                week52_high = _safe_float(info.year_high, 4)
                week52_low = _safe_float(info.year_low, 4)
            except Exception:
                week52_high = week52_low = None

            result = {
                "Global Quote": {
                    "01. symbol": symbol.upper(),
                    "02. open": str(open_) if open_ else "",
                    "03. high": str(high) if high else "",
                    "04. low": str(low) if low else "",
                    "05. price": str(price) if price else "",
                    "06. volume": str(volume) if volume else "",
                    "07. latest trading day": str(hist.index[-1].date()),
                    "08. previous close": str(prev_close) if prev_close else "",
                    "09. change": str(change) if change is not None else "",
                    "10. change percent": f"{change_pct:.4f}%" if change_pct is not None else "",
                    "52WeekHigh": str(week52_high) if week52_high else "",
                    "52WeekLow": str(week52_low) if week52_low else "",
                }
            }
            cache.set(key, result, self.TTL_QUOTE)
            return result

        except Exception as exc:
            return {"Global Quote": {}, "error": str(exc)}

    # ── Time series ───────────────────────────────────────────────────────

    def time_series_daily(self, symbol: str, period: str = "1y") -> dict:
        key = f"yf:ts:{symbol.upper()}:{period}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period, auto_adjust=True)

            if hist.empty:
                return {"Time Series (Daily)": {}}

            series: dict[str, dict] = {}
            for dt, row in hist.iterrows():
                date_str = str(dt.date())
                series[date_str] = {
                    "1. open": str(_safe_float(row["Open"], 4)),
                    "2. high": str(_safe_float(row["High"], 4)),
                    "3. low": str(_safe_float(row["Low"], 4)),
                    "4. close": str(_safe_float(row["Close"], 4)),
                    "5. volume": str(int(row["Volume"])) if row["Volume"] else "0",
                }

            result = {"Time Series (Daily)": series}
            cache.set(key, result, self.TTL_TIME_SERIES)
            return result

        except Exception as exc:
            return {"Time Series (Daily)": {}, "error": str(exc)}

    # ── Company overview ──────────────────────────────────────────────────

    def company_overview(self, symbol: str) -> dict:
        key = f"yf:overview:{symbol.upper()}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            info = yf.Ticker(symbol).info

            def g(k):
                v = info.get(k)
                return str(v) if v not in (None, "") else "N/A"

            result = {
                "Symbol": symbol.upper(),
                "Name": g("longName"),
                "Description": g("longBusinessSummary"),
                "Exchange": g("exchange"),
                "Currency": g("currency"),
                "Country": g("country"),
                "Sector": g("sector"),
                "Industry": g("industry"),
                "MarketCapitalization": g("marketCap"),
                "PERatio": g("trailingPE"),
                "ForwardPE": g("forwardPE"),
                "PEGRatio": g("pegRatio"),
                "PriceToBookRatio": g("priceToBook"),
                "PriceToSalesRatioTTM": g("priceToSalesTrailing12Months"),
                "EPS": g("trailingEps"),
                "Beta": g("beta"),
                "DividendYield": str(round(info["dividendYield"] * 100, 4)) if info.get("dividendYield") else "N/A",
                "52WeekHigh": g("fiftyTwoWeekHigh"),
                "52WeekLow": g("fiftyTwoWeekLow"),
                "50DayMovingAverage": g("fiftyDayAverage"),
                "200DayMovingAverage": g("twoHundredDayAverage"),
                "RevenuePerShareTTM": g("revenuePerShare"),
                "ReturnOnEquityTTM": g("returnOnEquity"),
                "ReturnOnAssetsTTM": g("returnOnAssets"),
                "GrossProfitTTM": g("grossProfits"),
                "RevenueTTM": g("totalRevenue"),
                "EBITDA": g("ebitda"),
                "OperatingMarginTTM": g("operatingMargins"),
                "ProfitMargin": g("profitMargins"),
                "AnalystTargetPrice": g("targetMeanPrice"),
                "SharesOutstanding": g("sharesOutstanding"),
                "BookValue": g("bookValue"),
                "EnterpriseValue": g("enterpriseValue"),
                "EnterpriseToRevenue": g("enterpriseToRevenue"),
                "EVToEBITDA": g("enterpriseToEbitda"),
                "QuarterlyEarningsGrowthYOY": g("earningsQuarterlyGrowth"),
                "QuarterlyRevenueGrowthYOY": g("revenueGrowth"),
            }
            cache.set(key, result, self.TTL_OVERVIEW)
            return result

        except Exception as exc:
            return {"Symbol": symbol.upper(), "error": str(exc)}

    # ── News ──────────────────────────────────────────────────────────────

    def news_sentiment(self, tickers: str = "", limit: int = 20) -> dict:
        key = f"yf:news:{tickers.lower()}:{limit}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        symbol = tickers.split(",")[0].strip() if tickers else "SPY"
        try:
            raw_news = yf.Ticker(symbol).news or []
        except Exception:
            raw_news = []

        articles = []
        for item in raw_news[:limit]:
            # yfinance ≥0.2.x wraps content in a "content" sub-dict
            content = item.get("content") or item

            title = content.get("title") or item.get("title", "")
            summary = content.get("summary") or content.get("description") or item.get("summary", "")
            url = ""
            # clickThroughUrl → canonicalUrl → direct url
            ctu = content.get("clickThroughUrl") or {}
            if isinstance(ctu, dict):
                url = ctu.get("url", "")
            if not url:
                can = content.get("canonicalUrl") or {}
                if isinstance(can, dict):
                    url = can.get("url", "")
            if not url:
                url = item.get("link") or content.get("url", "")

            # Thumbnail
            thumbnail = ""
            thumb_obj = content.get("thumbnail") or item.get("thumbnail") or {}
            if isinstance(thumb_obj, dict):
                resolutions = thumb_obj.get("resolutions") or []
                if resolutions:
                    thumbnail = resolutions[0].get("url", "")

            # Publisher
            provider = content.get("provider") or {}
            source = provider.get("displayName") if isinstance(provider, dict) else ""
            if not source:
                source = item.get("publisher") or item.get("source", "")

            # Publish time → ISO string
            pub_time = content.get("pubDate") or content.get("displayTime") or ""
            if not pub_time:
                ts = item.get("providerPublishTime") or 0
                if ts:
                    pub_time = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()

            # Naive sentiment from title keywords
            title_lower = title.lower()
            if any(w in title_lower for w in ["surge", "soar", "rally", "beat", "record", "gain", "rise", "bull"]):
                sentiment_label = "Bullish"
                sentiment_score = 0.7
            elif any(w in title_lower for w in ["fall", "drop", "crash", "loss", "miss", "decline", "bear", "cut"]):
                sentiment_label = "Bearish"
                sentiment_score = -0.5
            else:
                sentiment_label = "Neutral"
                sentiment_score = 0.1

            articles.append({
                "title": title,
                "summary": summary,
                "url": url,
                "banner_image": thumbnail,
                "source": source,
                "time_published": pub_time,
                "overall_sentiment_label": sentiment_label,
                "overall_sentiment_score": sentiment_score,
                "ticker_sentiment": [{"ticker": symbol.upper(), "sentiment_label": sentiment_label}],
            })

        result = {"feed": articles}
        if articles:
            cache.set(key, result, self.TTL_NEWS)
        return result

    # ── Top movers ────────────────────────────────────────────────────────

    def top_gainers_losers(self) -> dict:
        key = "yf:top_movers"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            tickers = [t for t in self.SCAN_TICKERS if t not in ("VIX",)]
            data = yf.download(
                tickers,
                period="2d",
                auto_adjust=True,
                progress=False,
                threads=True,
            )
            close = data["Close"]
            if close.shape[0] < 2:
                return {"top_gainers": [], "top_losers": [], "most_actively_traded": []}

            prev = close.iloc[-2]
            curr = close.iloc[-1]
            pct = ((curr - prev) / prev * 100).dropna()

            try:
                vol_row = data["Volume"].iloc[-1]
            except (KeyError, IndexError):
                vol_row = None

            def fmt(sym: str, p: float) -> dict:
                price = _safe_float(curr[sym], 2)
                vol = None
                if vol_row is not None:
                    try:
                        raw = vol_row[sym]
                        vol = int(raw) if raw == raw else None  # NaN != NaN
                    except (KeyError, TypeError, ValueError, OverflowError):
                        vol = None
                return {
                    "ticker": sym,
                    "price": str(price) if price else "",
                    "change_amount": str(round(float(curr[sym]) - float(prev[sym]), 4)),
                    "change_percentage": f"{p:.4f}%",
                    "volume": str(vol) if vol is not None else "",
                }

            sorted_pct = pct.sort_values(ascending=False)
            gainers = [fmt(s, p) for s, p in sorted_pct.head(10).items()]
            losers = [fmt(s, p) for s, p in sorted_pct.tail(10).iloc[::-1].items()]

            actively_traded: list = []
            if vol_row is not None:
                try:
                    vol_sorted = vol_row.dropna().sort_values(ascending=False)
                    actively_traded = [
                        fmt(s, float(pct[s]) if s in pct.index else 0.0)
                        for s in vol_sorted.head(10).index
                        if s in curr.index
                    ]
                except Exception:
                    actively_traded = []

            result = {"top_gainers": gainers, "top_losers": losers, "most_actively_traded": actively_traded}
            cache.set(key, result, self.TTL_TOP_MOVERS)
            return result

        except Exception as exc:
            return {"top_gainers": [], "top_losers": [], "most_actively_traded": [], "error": str(exc)}

    # ── Market status (no network call) ──────────────────────────────────

    def market_status(self) -> dict:
        key = "yf:market_status"
        cached = cache.get(key)
        if cached is not None:
            return cached

        et = zoneinfo.ZoneInfo("America/New_York")
        now = datetime.datetime.now(tz=et)
        weekday = now.weekday()  # Mon=0 … Sun=6
        h, m = now.hour, now.minute
        minutes = h * 60 + m

        market_open = 9 * 60 + 30   # 09:30 ET
        market_close = 16 * 60      # 16:00 ET
        pre_open = 4 * 60           # 04:00 ET
        after_close = 20 * 60       # 20:00 ET

        if weekday >= 5:
            status = "Closed"
            note = "Weekend"
        elif market_open <= minutes < market_close:
            status = "Open"
            note = "US markets open"
        elif pre_open <= minutes < market_open:
            status = "Pre-Market"
            note = "Pre-market session"
        elif market_close <= minutes < after_close:
            status = "After-Hours"
            note = "After-hours session"
        else:
            status = "Closed"
            note = "Outside trading hours"

        result = {
            "markets": [
                {
                    "market_type": "Equity",
                    "region": "United States",
                    "primary_exchanges": "NYSE, NASDAQ",
                    "local_open": "09:30",
                    "local_close": "16:00",
                    "timezone": "US/Eastern",
                    "current_status": status,
                    "notes": note,
                }
            ]
        }
        cache.set(key, result, self.TTL_MARKET_STATUS)
        return result
