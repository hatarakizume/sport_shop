#!/bin/sh
set -e
# Миграции и статика — только для веб-контейнера (celery запускается с RUN_MIGRATIONS=0)
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
fi
exec "$@"
