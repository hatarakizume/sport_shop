from rest_framework import serializers

from apps.catalog.models import ProductVariant
from apps.catalog.serializers import ProductVariantSerializer

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)
    product_variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source="product_variant", write_only=True
    )
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ("id", "product_variant", "product_variant_id", "quantity", "subtotal")

    def validate(self, attrs):
        variant = attrs.get("product_variant") or getattr(
            self.instance, "product_variant", None
        )
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", 1))

        if variant and quantity > variant.available_quantity:
            raise serializers.ValidationError(
                {"quantity": f"Доступно только {variant.available_quantity} штук."}
            )
        return attrs

    def create(self, validated_data):
        cart = self.context["cart"]
        variant = validated_data["product_variant"]
        quantity = validated_data.get("quantity", 1)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_variant=variant,
            defaults={"quantity": quantity},
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=["quantity"])
        return item


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.ReadOnlyField()
    total_quantity = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ("id", "items", "total_price", "total_quantity", "updated_at")
