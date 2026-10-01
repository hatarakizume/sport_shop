import logging

import stripe
from apps.orders.models import Order, OrderStatus
from apps.orders.services import mark_paid, release_reservation
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Payment, PaymentStatus, WebhookEvent

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    @staticmethod
    def create_checkout_session(payment):
        order = payment.order

        line_items = [
            {
                "price_data": {
                    "currency": payment.currency.lower(),
                    "product_data": {
                        "name": f"{item.product_variant.product.name} ({item.product_variant.size})",
                    },
                    "unit_amount": int(item.price * 100),
                },
                "quantity": item.quantity,
            }
            for item in order.items.select_related("product_variant__product")
        ]

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=f"{settings.FRONTEND_URL}/orders/{order.id}?payment=success",
            cancel_url=f"{settings.FRONTEND_URL}/orders/{order.id}?payment=cancelled",
            metadata={
                "order_id": order.id,
                "payment_id": payment.id,
            },
        )

        payment.stripe_session_id = session.id
        payment.status = PaymentStatus.PROCESSING
        payment.save(update_fields=["stripe_session_id", "status"])

        return session.url


class PaymentService:
    @staticmethod
    def create_payment_for_order(order):
        if order.status != OrderStatus.RESERVED:
            raise ValueError('Оплатить можно только заказ в статусе "Зарезервирован".')
        if order.expires_at and order.expires_at < timezone.now():
            raise ValueError("Время на оплату заказа истекло.")

        payment, _ = Payment.objects.get_or_create(
            order=order,
            defaults={"amount": order.total_price, "currency": "USD"},
        )

        return StripeService.create_checkout_session(payment)

    @staticmethod
    def process_successful_payment(payment):
        with transaction.atomic():
            order = (
                Order.objects.select_for_update(of=("self",))
                .select_related("user")
                .get(pk=payment.order_id)
            )

            if order.status == OrderStatus.PAID:
                return

            payment.status = PaymentStatus.SUCCEEDED
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])

            if order.status != OrderStatus.RESERVED:
                logger.error(
                    "Payment %s succeeded, but order %s has status %s — manual refund needed",
                    payment.id,
                    order.id,
                    order.status,
                )
                return

            mark_paid(order)

        logger.info(
            "Payment %s succeeded, order %s marked as PAID", payment.id, order.id
        )
        PaymentService._send_paid_email(order, payment)

    @staticmethod
    def _send_paid_email(order, payment):
        try:
            send_mail(
                subject=f"Заказ №{order.id} оплачен",
                message=(
                    f"Здравствуйте, {order.user.full_name}!\n\n"
                    f"Оплата заказа №{order.id} на сумму {payment.amount} {payment.currency} "
                    f"прошла успешно.\nСпасибо за покупку!"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[order.user.email],
                fail_silently=False,
            )
            logger.info(
                "Письмо об оплате заказа %s отправлено на %s",
                order.id,
                order.user.email,
            )
        except Exception:
            logger.exception(
                "Не удалось отправить письмо об оплате заказа %s на %s",
                order.id,
                order.user.email,
            )

    @staticmethod
    def process_failed_payment(payment):
        with transaction.atomic():
            order = Order.objects.select_for_update(of=("self",)).get(
                pk=payment.order_id
            )

            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status"])

            if order.status == OrderStatus.RESERVED:
                release_reservation(order, OrderStatus.CANCELLED)
                logger.info(
                    "Payment %s failed, order %s cancelled", payment.id, order.id
                )


def close_checkout_for_order(order):
    payment = Payment.objects.filter(order=order).first()
    if payment is None:
        return

    if payment.status in (PaymentStatus.PENDING, PaymentStatus.PROCESSING):
        payment.status = PaymentStatus.CANCELLED
        payment.save(update_fields=["status"])

    if payment.stripe_session_id:
        try:
            stripe.checkout.Session.expire(payment.stripe_session_id)
        except Exception:
            logger.warning(
                "Не удалось закрыть сессию Stripe %s для заказа %s",
                payment.stripe_session_id,
                order.id,
                exc_info=True,
            )


class WebhookService:
    @staticmethod
    def process_event(event):
        event_id = event["id"]
        event_type = event["type"]

        webhook_event, created = WebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={"event_type": event_type, "payload": event},
        )
        if not created and webhook_event.processed_at:
            return

        handlers = {
            "checkout.session.completed": WebhookService._handle_checkout_completed,
            "checkout.session.expired": WebhookService._handle_checkout_expired,
        }

        handler = handlers.get(event_type)
        if handler:
            handler(event)

        webhook_event.processed_at = timezone.now()
        webhook_event.save(update_fields=["processed_at"])

    @staticmethod
    def _get_payment(event):
        session = event["data"]["object"]
        payment_id = (session.get("metadata") or {}).get("payment_id")
        try:
            payment = Payment.objects.select_related("order__user").get(id=payment_id)
        except (Payment.DoesNotExist, ValueError, TypeError):
            logger.error("Webhook: payment %s not found", payment_id)
            return None, session
        return payment, session

    @staticmethod
    def _handle_checkout_completed(event):
        payment, session = WebhookService._get_payment(event)
        if payment is None:
            return

        payment.stripe_payment_intent_id = session.get("payment_intent")
        payment.save(update_fields=["stripe_payment_intent_id"])

        PaymentService.process_successful_payment(payment)

    @staticmethod
    def _handle_checkout_expired(event):
        payment, _ = WebhookService._get_payment(event)
        if payment is None:
            return

        PaymentService.process_failed_payment(payment)
