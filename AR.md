```
sport_shop/
│
├── manage.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml          # опционально, если поднимаешь Postgres/Redis в контейнерах
│
├── config/                     # настройки проекта (переименованный sport_shop/sport_shop)
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── celery.py               # инициализация Celery
│   ├── urls.py                 # корневой urls.py, подключает apps.*.urls
│   └── settings/
│       ├── __init__.py
│       ├── base.py             # общие настройки
│       ├── dev.py               # DEBUG=True, sqlite/локальный postgres
│       └── prod.py              # DEBUG=False, security settings
│
├── apps/
│   │
│   ├── users/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py            # кастомный User (email как логин, ФИО)
│   │   ├── serializers.py       # RegisterSerializer, LoginSerializer
│   │   ├── views.py             # register, login, profile
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   ├── catalog/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py            # Product: name, price, availableQuantity, description, image
│   │   ├── serializers.py
│   │   ├── views.py             # список товаров, детальная карточка
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   ├── cart/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py            # Cart, CartItem (user, product, quantity)
│   │   ├── serializers.py
│   │   ├── views.py             # add/remove/update items
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   ├── orders/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py            # Order: user, product, quantity, status, created_at, expires_at
│   │   ├── serializers.py
│   │   ├── views.py             # создание заказа из корзины, список заказов юзера
│   │   ├── urls.py
│   │   ├── services.py          # бизнес-логика резерва/освобождения товара
│   │   ├── tasks.py             # Celery-задача: снятие просроченных RESERVED → EXPIRED
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   └── payments/
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── models.py            # Payment: order, status, processed_at
│       ├── serializers.py
│       ├── views.py             # запуск оплаты
│       ├── services.py          # симуляция paymentGateway.process() с задержкой
│       ├── tasks.py             # если оплату тоже делать асинхронной через Celery
│       ├── tests.py
│       └── migrations/
│
├── frontend/                    # если фронт отдельно (React/Vue) или Django-шаблоны
│   ├── (React/Vue проект)
│   └── ...
│   # либо, если фронт на Django-шаблонах:
│   # templates/
│   # static/
│
├── static/                      # если рендеришь через Django-шаблоны
├── templates/
└── docs/
    └── README.md

```