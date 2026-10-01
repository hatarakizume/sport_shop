from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "total_quantity", "total_price", "updated_at")
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [CartItemInline]

    def total_quantity(self, obj):
        return obj.total_quantity

    total_quantity.short_description = "Товаров"

    def total_price(self, obj):
        return obj.total_price

    total_price.short_description = "Сумма"


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("cart", "product_variant", "quantity", "subtotal", "created_at")
    search_fields = ("cart__user__email", "product_variant__product__name")

    def subtotal(self, obj):
        return obj.subtotal

    subtotal.short_description = "Сумма"
