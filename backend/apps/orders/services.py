import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Order, OrderStatus

logger = logging.getLogger(__name__)


def release_reservation(order, new_status):
    with transaction.atomic():
        items = list(
            order.items.select_related("product_variant").select_for_update(
                of=("product_variant",)
            )
        )

        for item in items:
            variant = item.product_variant
            variant.available_quantity += item.quantity
            variant.reserved_quantity -= item.quantity
            variant.save(update_fields=["available_quantity", "reserved_quantity"])

        order.status = new_status
        order.save(update_fields=["status"])

    return order


def mark_paid(order):
    with transaction.atomic():
        items = list(
            order.items.select_related("product_variant").select_for_update(
                of=("product_variant",)
            )
        )

        for item in items:
            variant = item.product_variant
            variant.reserved_quantity -= item.quantity
            variant.save(update_fields=["reserved_quantity"])

        order.status = OrderStatus.PAID
        order.save(update_fields=["status"])

    return order


def cancel_order(order):
    from apps.payments.services import close_checkout_for_order

    with transaction.atomic():
        locked = Order.objects.select_for_update(of=("self",)).get(pk=order.pk)
        if locked.status != OrderStatus.RESERVED:
            raise ValueError('Отменить можно только заказ в статусе "Зарезервирован".')
        release_reservation(locked, OrderStatus.CANCELLED)

    close_checkout_for_order(locked)
    return locked


def expire_stale_reservations():
    from apps.payments.services import close_checkout_for_order

    stale_ids = list(
        Order.objects.filter(
            status=OrderStatus.RESERVED, expires_at__lt=timezone.now()
        ).values_list("id", flat=True)
    )

    expired = []
    for order_id in stale_ids:
        with transaction.atomic():
            order = (
                Order.objects.select_for_update(of=("self",))
                .select_related("user")
                .get(pk=order_id)
            )
            if (
                order.status != OrderStatus.RESERVED
                or order.expires_at >= timezone.now()
            ):
                continue
            release_reservation(order, OrderStatus.EXPIRED)
        expired.append(order)

    for order in expired:
        logger.info("Order %s expired, stock released", order.id)
        close_checkout_for_order(order)
        _send_expired_email(order)

    return len(expired)


def _send_expired_email(order):
    try:
        items_text = "\n".join(
            f"- {item.product_variant.product.name} ({item.product_variant.size}) x{item.quantity}"
            for item in order.items.select_related("product_variant__product")
        )
        send_mail(
            subject=f"Заказ №{order.id} отменён — время на оплату истекло",
            message=(
                f"Здравствуйте, {order.user.full_name}!\n\n"
                f"Резерв товаров по заказу №{order.id} истёк, так как оплата не была "
                f"произведена в течение 15 минут.\n\n"
                f"Товары в заказе:\n{items_text}\n\n"
                f"Вы можете оформить заказ заново, если товары всё ещё нужны."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.user.email],
            fail_silently=False,
        )
        logger.info(
            "Письмо об истёкшем резерве заказа %s отправлено на %s",
            order.id,
            order.user.email,
        )
    except Exception:
        logger.exception(
            "Не удалось отправить письмо об истёкшем резерве заказа %s на %s",
            order.id,
            order.user.email,
        )
