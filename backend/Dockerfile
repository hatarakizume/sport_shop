# ---------- 1. Сборка Tailwind CSS из шаблонов ----------
FROM node:22-slim AS css
WORKDIR /build
RUN npm init -y >/dev/null && npm install --no-audit --no-fund @tailwindcss/cli@4.1.11 tailwindcss@4.1.11
COPY apps /app/apps
RUN printf '@import "tailwindcss";\n@source "/app/apps";\n' > in.css \
 && cat /app/apps/web/templates/web/tailwind.css >> in.css \
 && npx @tailwindcss/cli -i in.css -o /out/app.css --minify

# ---------- 2. Приложение ----------
FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
COPY --from=css /out/app.css /app/static/css/app.css
RUN sed -i "s/\r$//" /app/entrypoint.sh && chmod +x /app/entrypoint.sh && mkdir -p /app/media /app/staticfiles

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60", "--access-logfile", "-"]
