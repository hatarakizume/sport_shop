# Деплой на VPS (Ubuntu/Debian)

Стек: Docker Compose — Django + Gunicorn, PostgreSQL, Redis, Celery worker + beat
(снимает просроченные резервы раз в минуту), Caddy (статика, медиа, HTTPS).

## 1. Первый запуск

```bash
# на сервере, под root или пользователем с sudo
curl -fsSL https://get.docker.com | sh

git clone https://github.com/hatarakizume/sport_shop.git
cd sport_shop
cp .env.production.example .env
nano .env                     # IP, пароли, ключи Stripe и почты

# SECRET_KEY можно сгенерировать так:
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

docker compose up -d --build
docker compose exec web python manage.py createsuperuser
```

Сайт: `http://IP_СЕРВЕРА/`, админка: `http://IP_СЕРВЕРА/admin/`.
Если на сервере включён ufw: `ufw allow 80,443/tcp`.

## 2. Stripe webhook на сервере

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `http://IP_СЕРВЕРА/api/payments/webhook/stripe/`
- события: `checkout.session.completed`, `checkout.session.expired`

Скопируйте «Signing secret» (`whsec_...`) в `.env` → `STRIPE_WEBHOOK_SECRET`, затем
`docker compose up -d` (перечитает .env). Тестовый режим Stripe принимает http;
для боевых ключей нужен HTTPS, т.е. домен (п. 4).

## 3. Обновление кода

```bash
cd sport_shop
git pull
docker compose up -d --build     # миграции и collectstatic выполнятся сами
```

## 4. Когда появится домен

1. A-запись домена → IP сервера.
2. В `.env`:
   ```
   SITE_ADDRESS=shop.example.com
   ALLOWED_HOSTS=shop.example.com,IP
   CSRF_TRUSTED_ORIGINS=https://shop.example.com
   FRONTEND_URL=https://shop.example.com
   ```
3. `docker compose up -d` — Caddy сам получит сертификат Let's Encrypt.
4. Поменяйте URL вебхука в Stripe на `https://...`.

## Полезное

```bash
docker compose logs -f web          # логи сайта
docker compose logs -f celery beat  # резервы и письма
docker compose exec db pg_dump -U sport_shop sport_shop > backup.sql   # бэкап базы
```

Данные (база, загруженные картинки) живут в docker-томах `pgdata` и `media` и
переживают пересборку. `docker compose down -v` их УДАЛИТ.
