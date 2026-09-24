from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.catalog.models import ProductVariant
from apps.users.models import User, UserAddress


class OrderStatus(models.TextChoices):
    NEW = "NEW", "Новый"
    RESERVED = "RESERVED", "Зарезервирован"
    PAID = "PAID", "Оплачен"
    CANCELLED = "CANCELLED", "Отменён"
    EXPIRED = "EXPIRED", "Истёк"


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    address = models.ForeignKey(
        UserAddress, on_delete=models.CASCADE, related_name="orders"
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.NEW
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "orders"
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def save(self, *args, **kwargs):
        if not self.pk and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Заказ {self.id} пользователя {self.user.email}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product_variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="order_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "order_items"
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.product_variant} x {self.quantity}"
