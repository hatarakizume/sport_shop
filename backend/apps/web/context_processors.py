from django.conf import settings
from django.db.models import Sum

from apps.cart.models import CartItem
from apps.catalog.models import Category


def shop(request):
    cart_count = 0
    if request.user.is_authenticated:
        cart_count = (
            CartItem.objects.filter(cart__user=request.user).aggregate(n=Sum("quantity"))["n"]
            or 0
        )
    return {
        "TAILWIND_CDN": getattr(settings, "TAILWIND_CDN", settings.DEBUG),
        "SHOP_NAME": getattr(settings, "SHOP_NAME", "SPORT SHOP"),
        "cart_count": cart_count,
        # ленивый queryset: запрос уйдёт в БД только если шаблон его использует
        "nav_categories": Category.objects.filter(parent__isnull=True).order_by("name")[:6],
    }
