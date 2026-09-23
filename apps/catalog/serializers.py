from rest_framework import serializers

from .models import Brand, Category, Product, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent")


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug", "logo")


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ("id", "size", "available_quantity", "reserved_quantity")


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "name",
            "price",
            "image",
            "category",
            "brand",
            "in_stock",
        )

    def get_in_stock(self, obj):
        return obj.variants.filter(available_quantity__gt=0).exists()


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "price",
            "image",
            "category",
            "brand",
            "variants",
            "in_stock",
            "is_active",
            "created_at",
            "updated_at",
        )

    def get_in_stock(self, obj):
        return obj.variants.filter(available_quantity__gt=0).exists()
