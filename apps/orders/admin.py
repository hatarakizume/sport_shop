from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("price",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "created_at", "expires_at")
    list_filter = ("status",)
    search_fields = ("user__email", "id")
    readonly_fields = ("created_at", "expires_at", "total_price")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_variant", "quantity", "price")
    search_fields = ("order__id", "product_variant__product__name")
