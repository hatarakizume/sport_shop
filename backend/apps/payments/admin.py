from django.contrib import admin

from .models import Payment, WebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "amount",
        "currency",
        "status",
        "created_at",
        "paid_at",
    )
    list_filter = ("status", "currency")
    search_fields = (
        "order__id",
        "order__user__email",
        "stripe_session_id",
        "stripe_payment_intent_id",
    )
    readonly_fields = (
        "order",
        "amount",
        "currency",
        "stripe_session_id",
        "stripe_payment_intent_id",
        "created_at",
        "updated_at",
        "paid_at",
    )

    def has_add_permission(self, request):
        return False


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("id", "event_type", "event_id", "processed_at", "created_at")
    list_filter = ("event_type",)
    search_fields = ("event_id", "event_type")
    readonly_fields = (
        "event_id",
        "event_type",
        "payload",
        "processed_at",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
