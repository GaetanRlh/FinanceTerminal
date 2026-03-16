from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class RegisterViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/register/"

    def test_register_success(self):
        response = self.client.post(
            self.url,
            {
                "email": "newuser@example.com",
                "full_name": "New User",
                "password": "securepass123",
                "confirmPassword": "securepass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.json())
        self.assertIn("user", response.json())
        self.assertTrue(User.objects.filter(email="newuser@example.com").exists())

    def test_register_duplicate_email(self):
        User.objects.create_user(email="existing@example.com", password="pass123", full_name="Existing")
        response = self.client.post(
            self.url,
            {
                "email": "existing@example.com",
                "full_name": "Duplicate",
                "password": "securepass123",
                "confirmPassword": "securepass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com", password="testpass123", full_name="Login User"
        )
        self.client = APIClient()
        self.url = "/api/auth/login/"

    def test_login_success(self):
        response = self.client.post(
            self.url,
            {"email": "login@example.com", "password": "testpass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.json())
        self.assertIn("refresh", response.json())

    def test_login_invalid_credentials(self):
        response = self.client.post(
            self.url,
            {"email": "login@example.com", "password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="me@example.com", password="testpass123", full_name="Me User"
        )
        self.client = APIClient()

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], "me@example.com")


class PasswordResetViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com", password="testpass123", full_name="Reset User"
        )
        self.client = APIClient()
        self.url = "/api/auth/password-reset/"

    def test_password_reset_valid_email(self):
        response = self.client.post(self.url, {"email": "reset@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.json())

    def test_password_reset_invalid_email(self):
        response = self.client.post(self.url, {"email": "nonexistent@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
