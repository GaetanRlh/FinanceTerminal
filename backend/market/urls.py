from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"entities", views.EntityViewSet, basename="entity")
router.register(r"watchlist", views.WatchlistViewSet, basename="watchlist")
router.register(r"notes", views.NoteViewSet, basename="note")
router.register(r"calendar/reminders", views.EventReminderViewSet, basename="event-reminder")
router.register(r"alerts/rules", views.AlertRuleViewSet, basename="alert-rule")
router.register(r"alerts/events", views.AlertEventViewSet, basename="alert-event")

urlpatterns = [
    path("search/", views.SymbolSearchView.as_view(), name="market-search"),
    path("quote/", views.QuoteView.as_view(), name="market-quote"),
    path("time-series/", views.TimeSeriesView.as_view(), name="market-time-series"),
    path("overview/", views.CompanyOverviewView.as_view(), name="market-overview"),
    path("news/", views.NewsView.as_view(), name="market-news"),
    path("top-movers/", views.TopMoversView.as_view(), name="market-top-movers"),
    path("market-status/", views.MarketStatusView.as_view(), name="market-status"),
    path("entity-context/", views.EntityContextView.as_view(), name="entity-context"),
    path("watchlist/lists/", views.WatchlistCollectionsView.as_view(), name="watchlist-lists"),
    path("calendar/economic/", views.EconomicCalendarView.as_view(), name="calendar-economic"),
    path("calendar/earnings/", views.EarningsCalendarView.as_view(), name="calendar-earnings"),
    path("alerts/evaluate/", views.AlertEvaluateView.as_view(), name="alerts-evaluate"),
    path("", include(router.urls)),
]
