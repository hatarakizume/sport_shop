from apps.orders.models import Order
from django.db import models


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Ожидает оплаты"
    PROCESSING = "PROCESSING", "В обработке"
    SUCCEEDED = "SUCCEEDED", "Оплачен"
    FAILED = "FAILED", "Не удался"
    CANCELLED = "CANCELLED", "Отменён"


class Payment(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    stripe_session_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payments"
        verbose_name = "Payment"
        verbose_name_plural = "Payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Платёж по заказу {self.order_id} — {self.status}"

    @property
    def is_successful(self):
        return self.status == PaymentStatus.SUCCEEDED

    @property
    def is_pending(self):
        return self.status in (PaymentStatus.PENDING, PaymentStatus.PROCESSING)


class WebhookEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_webhook_events"
        verbose_name = "Webhook Event"
        verbose_name_plural = "Webhook Events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} ({self.event_id})"
