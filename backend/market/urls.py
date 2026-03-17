from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"entities", views.EntityViewSet, basename="entity")
router.register(r"watchlist", views.WatchlistViewSet, basename="watchlist")
router.register(r"notes", views.NoteViewSet, basename="note")

urlpatterns = [
    # Alpha Vantage proxy
    path("search/", views.SymbolSearchView.as_view(), name="market-search"),
    path("quote/", views.QuoteView.as_view(), name="market-quote"),
    path("time-series/", views.TimeSeriesView.as_view(), name="market-time-series"),
    path("overview/", views.CompanyOverviewView.as_view(), name="market-overview"),
    path("news/", views.NewsView.as_view(), name="market-news"),
    path("top-movers/", views.TopMoversView.as_view(), name="market-top-movers"),
    path("market-status/", views.MarketStatusView.as_view(), name="market-status"),
    # CRUD
    path("", include(router.urls)),
]
