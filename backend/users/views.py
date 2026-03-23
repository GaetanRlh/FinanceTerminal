from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserSerializer, PasswordResetSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class ThrottledTokenObtainPairView(TokenObtainPairView):
    max_failures = 5
    block_minutes = 15

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "") or "unknown"

    def _get_cache_key(self, request):
        return f"login_fail:{self._get_client_ip(request)}"

    def post(self, request, *args, **kwargs):
        cache_key = self._get_cache_key(request)
        data = cache.get(cache_key) or {}
        now = timezone.now()

        blocked_until = data.get("blocked_until")
        if blocked_until and blocked_until > now:
            return Response(
                {"detail": "Trop de tentatives de connexion. Réessayez plus tard."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            response = super().post(request, *args, **kwargs)
        except AuthenticationFailed as exc:
            failures = int(data.get("count", 0)) + 1
            ttl = self.block_minutes * 60
            if failures >= self.max_failures:
                cache.set(cache_key, {"count": failures, "blocked_until": now + timedelta(minutes=self.block_minutes)}, ttl)
                return Response(
                    {"detail": "Trop de tentatives de connexion. Réessayez plus tard."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            cache.set(cache_key, {"count": failures}, ttl)
            raise exc

        if data:
            cache.delete(cache_key)
        return response


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetView(generics.GenericAPIView):
    serializer_class = PasswordResetSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.save()
        if token is None:
            return Response(
                {"detail": "Aucun compte trouvé pour cet e-mail."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"detail": "Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé."},
            status=status.HTTP_200_OK,
        )
