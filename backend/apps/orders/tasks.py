from celery import shared_task

from .services import expire_stale_reservations


@shared_task
def expire_reservations():
    count = expire_stale_reservations()
    return f'Обработано просроченных заказов: {count}'
