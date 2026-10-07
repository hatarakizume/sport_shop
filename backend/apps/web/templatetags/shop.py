from decimal import Decimal, InvalidOperation

from django import template
from django.conf import settings

register = template.Library()


@register.filter
def money(value):
    """1299.5 -> «$1 299.50» (неразрывный узкий пробел между разрядами)."""
    try:
        value = Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        return value
    symbol = getattr(settings, "SHOP_CURRENCY_SYMBOL", "$")
    return f"{symbol}{value:,.2f}".replace(",", " ")


@register.filter
def mmss(seconds):
    seconds = max(0, int(seconds or 0))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


@register.filter
def pad2(value):
    try:
        return f"{int(value):02d}"
    except (TypeError, ValueError):
        return value


@register.filter
def mul(value, arg):
    try:
        return Decimal(value) * Decimal(arg)
    except (InvalidOperation, TypeError, ValueError):
        return ""
