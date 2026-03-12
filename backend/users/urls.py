from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.ThrottledTokenObtainPairView.as_view(), name="auth-login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("password-reset/", views.PasswordResetView.as_view(), name="auth-password-reset"),
    path("me/", views.MeView.as_view(), name="auth-me"),
]
