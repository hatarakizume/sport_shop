import logging
import time

from django.core.management.base import BaseCommand

from apps.orders.services import expire_stale_reservations

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Снимает резерв с заказов, у которых истекло время на оплату. '
        'Без флагов — один проход; с --loop работает как фоновый процесс (без Redis и Celery).'
    )

    def add_arguments(self, parser):
        parser.add_argument('--loop', action='store_true', help='Повторять проверку постоянно')
        parser.add_argument('--interval', type=int, default=30, help='Пауза между проверками, сек (по умолчанию 30)')

    def handle(self, *args, **options):
        if not options['loop']:
            count = expire_stale_reservations()
            self.stdout.write(f'Обработано просроченных заказов: {count}')
            return

        interval = options['interval']
        self.stdout.write(f'Проверка просроченных резервов каждые {interval} с. Остановка: Ctrl+C')
        try:
            while True:
                try:
                    count = expire_stale_reservations()
                    if count:
                        self.stdout.write(f'Снят резерв с заказов: {count}')
                except Exception:
                    # Один сбой (например, БД на секунду недоступна) не должен убивать процесс
                    logger.exception('Ошибка при снятии просроченных резервов')
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write('Остановлено.')
