from apps.catalog.models import ProductVariant
from apps.catalog.serializers import ProductVariantWithProductSerializer
from apps.users.models import UserAddress
from apps.users.serializers import UserAddressSerializer
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Order, OrderItem, OrderStatus


class OrderItemSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantWithProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product_variant", "quantity", "price")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    address = UserAddressSerializer(read_only=True)
    seconds_left = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "status",
            "address",
            "items",
            "total_price",
            "created_at",
            "expires_at",
            "seconds_left",
        )
        read_only_fields = fields

    def get_seconds_left(self, obj):
        if obj.status != OrderStatus.RESERVED or not obj.expires_at:
            return 0
        remaining = (obj.expires_at - timezone.now()).total_seconds()
        return max(0, int(remaining))


class OrderCreateSerializer(serializers.Serializer):
    address_id = serializers.PrimaryKeyRelatedField(
        queryset=UserAddress.objects.all(),
        source="address",
    )

    def validate(self, attrs):
        request = self.context["request"]
        address = attrs["address"]

        if address.user_id != request.user.id:
            raise serializers.ValidationError(
                {"address_id": "Этот адрес вам не принадлежит."}
            )

        cart = getattr(request.user, "cart", None)
        cart_items = (
            cart.items.select_related("product_variant__product") if cart else []
        )

        if not cart_items:
            raise serializers.ValidationError("Корзина пуста.")

        attrs["cart_items"] = list(cart_items)
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        address = validated_data["address"]
        cart_items = validated_data["cart_items"]

        with transaction.atomic():
            variant_ids = [item.product_variant_id for item in cart_items]
            variants = {
                v.id: v
                for v in ProductVariant.objects.select_for_update().filter(
                    id__in=variant_ids
                )
            }

            for cart_item in cart_items:
                variant = variants[cart_item.product_variant_id]
                if cart_item.quantity > variant.available_quantity:
                    raise serializers.ValidationError(
                        f'Недостаточно товара "{variant}" в наличии '
                        f"(доступно {variant.available_quantity}, запрошено {cart_item.quantity})."
                    )

            total_price = sum(
                variants[ci.product_variant_id].product.price * ci.quantity
                for ci in cart_items
            )

            order = Order.objects.create(
                user=request.user,
                address=address,
                total_price=total_price,
            )

            order_items = []
            for cart_item in cart_items:
                variant = variants[cart_item.product_variant_id]

                variant.available_quantity -= cart_item.quantity
                variant.reserved_quantity += cart_item.quantity
                variant.save(update_fields=["available_quantity", "reserved_quantity"])

                order_items.append(
                    OrderItem(
                        order=order,
                        product_variant=variant,
                        quantity=cart_item.quantity,
                        price=variant.product.price,
                    )
                )

            OrderItem.objects.bulk_create(order_items)

            order.status = OrderStatus.RESERVED
            order.save(update_fields=["status"])

            from apps.cart.models import CartItem

            CartItem.objects.filter(id__in=[ci.id for ci in cart_items]).delete()

        return order

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data
