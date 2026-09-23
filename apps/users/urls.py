from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserRegistrationView,
    UserLoginView,
    UserProfileView,
    UserAddressViewSet,
)

router = DefaultRouter()
router.register('addresses', UserAddressViewSet, basename='user-address')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user-register'),
    path('login/', UserLoginView.as_view(), name='user-login'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('', include(router.urls)),
]