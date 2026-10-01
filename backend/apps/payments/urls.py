from django.urls import path

from .views import CreateCheckoutSessionView, stripe_webhook

urlpatterns = [
    path(
        "checkout/<int:order_id>/",
        CreateCheckoutSessionView.as_view(),
        name="payment-checkout",
    ),
    path("webhook/stripe/", stripe_webhook, name="stripe-webhook"),
]
