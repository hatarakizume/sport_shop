from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChangePasswordView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    UserAddressViewSet,
    UserLoginView,
    UserProfileView,
    UserRegistrationView,
)

router = DefaultRouter()
router.register("addresses", UserAddressViewSet, basename="user-address")

urlpatterns = [
    path("register/", UserRegistrationView.as_view(), name="user-register"),
    path("login/", UserLoginView.as_view(), name="user-login"),
    path("logout/", LogoutView.as_view(), name="user-logout"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path(
        "password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("", include(router.urls)),
]
