from __future__ import annotations

import datetime
import zoneinfo
from typing import Any

import requests
import yfinance as yf
from django.conf import settings
from django.core.cache import cache


def _safe_float(val: Any, digits: int = 2) -> float | None:
    try:
        v = float(val)
        return round(v, digits)
    except (TypeError, ValueError):
        return None


class SymbolSearch:
    TTL = 3600
    _URL = "https://query1.finance.yahoo.com/v1/finance/search"
    _HEADERS = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}

    def search(self, keywords: str) -> dict:
        key = f"yf:search:{keywords.lower()}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            resp = requests.get(
                self._URL,
                params={"q": keywords, "quotesCount": 10, "newsCount": 0, "listsCount": 0},
                headers=self._HEADERS,
                timeout=10,
            )
            resp.raise_for_status()
            raw = resp.json()
        except Exception:
            return {"bestMatches": []}

        region_map = {
            "NMS": "United States", "NYQ": "United States", "NGM": "United States",
            "PCX": "United States", "BTS": "United States", "LSE": "United Kingdom",
            "TSX": "Canada", "FRA": "Germany", "PAR": "France", "TYO": "Japan",
        }

        matches = []
        for q in (raw.get("quotes") or []):
            sym = q.get("symbol", "")
            name = q.get("longname") or q.get("shortname") or sym
            exchange = q.get("exchange", "")
            matches.append({
                "1. symbol": sym,
                "2. name": name,
                "3. type": q.get("quoteType", "Equity"),
                "4. region": region_map.get(exchange, exchange),
                "5. marketOpen": "09:30",
                "6. marketClose": "16:00",
                "7. timezone": "UTC-04",
                "8. currency": q.get("currency", "USD"),
                "9. matchScore": "1.0000",
            })

        result = {"bestMatches": matches}
        if matches:
            cache.set(key, result, self.TTL)
        return result


class YFinanceClient:
    TTL_QUOTE = 120
    TTL_TIME_SERIES = 1800
    TTL_OVERVIEW = 86400
    TTL_NEWS = 900
    TTL_TOP_MOVERS = 600
    TTL_MARKET_STATUS = 60

    SCAN_TICKERS = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
        "JPM", "V", "UNH", "JNJ", "XOM", "PG", "MA", "HD", "CVX", "MRK",
        "LLY", "ABBV", "PEP", "KO", "AVGO", "COST", "WMT", "BAC", "MCD",
        "TMO", "CSCO", "ACN", "DHR", "NEE", "LIN", "ADBE", "TXN", "AMD",
        "INTC", "QCOM", "IBM", "CRM", "ORCL", "NFLX", "DIS", "PYPL",
        "SPY", "QQQ", "DIA", "IWM", "GLD", "SLV", "VIX",
    ]

    def global_quote(self, symbol: str) -> dict:
        key = f"yf:quote:{symbol.upper()}"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d", auto_adjust=True)
            info = ticker.fast_info

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
            ctu = content.get("clickThroughUrl") or {}
            if isinstance(ctu, dict):
                url = ctu.get("url", "")
            if not url:
                can = content.get("canonicalUrl") or {}
                if isinstance(can, dict):
                    url = can.get("url", "")
            if not url:
                url = item.get("link") or content.get("url", "")

            thumbnail = ""
            thumb_obj = content.get("thumbnail") or item.get("thumbnail") or {}
            if isinstance(thumb_obj, dict):
                resolutions = thumb_obj.get("resolutions") or []
                if resolutions:
                    thumbnail = resolutions[0].get("url", "")

            provider = content.get("provider") or {}
            source = provider.get("displayName") if isinstance(provider, dict) else ""
            if not source:
                source = item.get("publisher") or item.get("source", "")

            pub_time = content.get("pubDate") or content.get("displayTime") or ""
            if not pub_time:
                ts = item.get("providerPublishTime") or 0
                if ts:
                    pub_time = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()

            title_lower = title.lower()
            if any(w in title_lower for w in ["surge", "soar", "rally", "beat", "record", "gain", "rise", "bull"]):
                sentiment_label, sentiment_score = "Bullish", 0.7
            elif any(w in title_lower for w in ["fall", "drop", "crash", "loss", "miss", "decline", "bear", "cut"]):
                sentiment_label, sentiment_score = "Bearish", -0.5
            else:
                sentiment_label, sentiment_score = "Neutral", 0.1

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

    def top_gainers_losers(self) -> dict:
        key = "yf:top_movers"
        cached = cache.get(key)
        if cached is not None:
            return cached

        try:
            tickers = [t for t in self.SCAN_TICKERS if t != "VIX"]
            data = yf.download(tickers, period="2d", auto_adjust=True, progress=False, threads=True)
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

    def market_status(self) -> dict:
        key = "yf:market_status"
        cached = cache.get(key)
        if cached is not None:
            return cached

        et = zoneinfo.ZoneInfo("America/New_York")
        now = datetime.datetime.now(tz=et)
        weekday = now.weekday()
        h, m = now.hour, now.minute
        minutes = h * 60 + m

        market_open = 9 * 60 + 30
        market_close = 16 * 60
        pre_open = 4 * 60
        after_close = 20 * 60

        if weekday >= 5:
            status, note = "Closed", "Weekend"
        elif market_open <= minutes < market_close:
            status, note = "Open", "US markets open"
        elif pre_open <= minutes < market_open:
            status, note = "Pre-Market", "Pre-market session"
        elif market_close <= minutes < after_close:
            status, note = "After-Hours", "After-hours session"
        else:
            status, note = "Closed", "Outside trading hours"

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
