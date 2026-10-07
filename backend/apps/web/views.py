"""
Серверные HTML-страницы магазина.

Бизнес-логика не дублируется: вьюхи используют те же сериализаторы и сервисы,
что и REST API (резерв товара, Stripe, сброс пароля и т.д.).
Интерактив: htmx (частичные обновления) + Alpine.js (состояние UI).
"""

import json
import logging

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Count, Max, Min, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.http import require_POST
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.cart.models import Cart, CartItem
from apps.cart.serializers import CartItemSerializer
from apps.catalog.models import Brand, Category, Product, ProductVariant
from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import OrderCreateSerializer
from apps.orders.services import cancel_order, expire_stale_reservations
from apps.users.models import UserAddress, UserProfile
from apps.users.serializers import (
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserAddressSerializer,
    UserRegistrationSerializer,
)

logger = logging.getLogger(__name__)

PAGE_SIZE = 12
SORTS = {
    "new": ("-created_at", "Сначала новые"),
    "price_asc": ("price", "Сначала дешевле"),
    "price_desc": ("-price", "Сначала дороже"),
    "name": ("name", "По названию"),
}


# ---------------------------------------------------------------- helpers


def is_htmx(request):
    return (
        request.headers.get("HX-Request") == "true"
        and not request.headers.get("HX-History-Restore-Request")
    )


def hx_trigger(response, **events):
    """Добавляет HX-Trigger. ensure_ascii — чтобы кириллица не ломала заголовок."""
    response["HX-Trigger"] = json.dumps(events)
    return response


def toast(message, level="success"):
    return {"message": str(message), "level": level}


def flatten_errors(detail):
    """DRF errors -> {"field": ["msg", ...], "general": [...]}"""
    out = {}
    if isinstance(detail, (list, tuple)):
        out["general"] = [str(e) for e in detail]
        return out
    if not isinstance(detail, dict):
        return {"general": [str(detail)]}
    for key, value in detail.items():
        key = "general" if key in ("non_field_errors", "detail") else key
        values = value if isinstance(value, (list, tuple)) else [value]
        out.setdefault(key, []).extend(str(v) for v in values)
    return out


def first_error(errors):
    for values in errors.values():
        if values:
            return values[0]
    return "Проверьте введённые данные."


def safe_next(request, fallback="web:home"):
    nxt = request.POST.get("next") or request.GET.get("next")
    if nxt and url_has_allowed_host_and_scheme(nxt, allowed_hosts={request.get_host()}):
        return nxt
    return reverse(fallback)


def run_expiry():
    try:
        expire_stale_reservations()
    except Exception:  # письмо/Stripe не должны ронять страницу
        logger.exception("Не удалось снять просроченные резервы")


def product_qs():
    return (
        Product.objects.filter(is_active=True)
        .select_related("category", "brand")
        .annotate(stock=Sum("variants__available_quantity"))
    )


def size_key(size):
    """Числовые размеры по возрастанию, затем буквенные в «одёжном» порядке."""
    order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"]
    s = str(size).strip().upper()
    try:
        return (0, float(s.replace(",", ".")), "")
    except ValueError:
        return (1, order.index(s) if s in order else 99, s)


def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def cart_items(user):
    return list(
        CartItem.objects.filter(cart__user=user)
        .select_related("product_variant__product__brand")
        .order_by("created_at")
    )


def cart_context(user):
    items = cart_items(user)
    return {
        "items": items,
        "total": sum((i.subtotal for i in items), 0),
        "count": sum(i.quantity for i in items),
    }


# ------------------------------------------------------------------ pages


def home(request):
    products = list(product_qs()[:10])
    hero = next((p for p in products if p.image), products[0] if products else None)

    categories = list(
        Category.objects.filter(parent__isnull=True)
        .annotate(n=Count("products", filter=Q(products__is_active=True)))
        .order_by("-n", "name")[:5]
    )
    for c in categories:
        c.cover = (
            Product.objects.filter(is_active=True, category__in=[c, *c.children.all()])
            .exclude(image="")
            .exclude(image__isnull=True)
            .first()
        )

    return render(
        request,
        "web/home.html",
        {
            "hero": hero,
            "products": products,
            "categories": categories,
            "brands": Brand.objects.all()[:12],
            "stats": {
                "products": Product.objects.filter(is_active=True).count(),
                "brands": Brand.objects.count(),
            },
        },
    )


def catalog(request):
    qs = product_qs()
    g = request.GET

    q = g.get("q", "").strip()
    category = Category.objects.filter(slug=g.get("category")).first() if g.get("category") else None
    brand_slugs = g.getlist("brand")
    sizes = g.getlist("size")
    in_stock = g.get("in_stock") == "1"
    price_min = g.get("price_min", "").strip()
    price_max = g.get("price_max", "").strip()
    sort = g.get("sort") if g.get("sort") in SORTS else "new"

    if q:
        qs = qs.filter(
            Q(name__icontains=q) | Q(description__icontains=q) | Q(brand__name__icontains=q)
        )
    if category:
        ids = [category.id, *category.children.values_list("id", flat=True)]
        qs = qs.filter(category_id__in=ids)
    if brand_slugs:
        qs = qs.filter(brand__slug__in=brand_slugs)
    if sizes:
        qs = qs.filter(
            id__in=ProductVariant.objects.filter(
                size__in=sizes, available_quantity__gt=0
            ).values("product_id")
        )
    if in_stock:
        qs = qs.filter(stock__gt=0)
    if price_min.isdigit():
        qs = qs.filter(price__gte=price_min)
    if price_max.isdigit():
        qs = qs.filter(price__lte=price_max)

    qs = qs.order_by(SORTS[sort][0], "-id")
    page = Paginator(qs, PAGE_SIZE).get_page(g.get("page"))

    # «чипы» активных фильтров с готовыми ссылками на их снятие
    def without(key, value=None):
        params = g.copy()
        params.pop("page", None)
        if value is None:
            params.pop(key, None)
        else:
            params.setlist(key, [v for v in params.getlist(key) if v != value])
        query = params.urlencode()
        return reverse("web:catalog") + (f"?{query}" if query else "")

    brands = list(Brand.objects.order_by("name"))
    brand_names = {b.slug: b.name for b in brands}
    chips = []
    if q:
        chips.append((f"«{q}»", without("q")))
    if category:
        chips.append((category.name, without("category")))
    chips += [(brand_names.get(s, s), without("brand", s)) for s in brand_slugs]
    chips += [(f"Размер {s}", without("size", s)) for s in sizes]
    if in_stock:
        chips.append(("В наличии", without("in_stock")))
    if price_min.isdigit():
        chips.append((f"от {price_min}", without("price_min")))
    if price_max.isdigit():
        chips.append((f"до {price_max}", without("price_max")))

    all_sizes = sorted(
        set(
            ProductVariant.objects.filter(product__is_active=True).values_list("size", flat=True)
        ),
        key=size_key,
    )
    bounds = Product.objects.filter(is_active=True).aggregate(lo=Min("price"), hi=Max("price"))

    ctx = {
        "page": page,
        "q": q,
        "category": category,
        "categories": Category.objects.filter(parent__isnull=True).prefetch_related("children"),
        "brands": brands,
        "brand_slugs": brand_slugs,
        "sizes": all_sizes,
        "selected_sizes": sizes,
        "in_stock": in_stock,
        "price_min": price_min,
        "price_max": price_max,
        "bounds": bounds,
        "sort": sort,
        "sorts": [(k, v[1]) for k, v in SORTS.items()],
        "chips": chips,
        "clear_url": reverse("web:catalog"),
    }
    if is_htmx(request):
        return render(request, "web/partials/catalog_results.html", ctx)
    return render(request, "web/catalog.html", ctx)


def product_detail(request, slug):
    product = get_object_or_404(product_qs(), slug=slug)
    variants = sorted(product.variants.all(), key=lambda v: size_key(v.size))
    related = product_qs().exclude(pk=product.pk)
    if product.category_id:
        related = related.filter(category_id=product.category_id)
    return render(
        request,
        "web/product_detail.html",
        {
            "product": product,
            "variants": variants,
            "available_variants": [v for v in variants if v.available_quantity > 0],
            "related": related[:4],
        },
    )


def search_suggest(request):
    q = request.GET.get("q", "").strip()
    results = []
    if len(q) >= 2:
        results = product_qs().filter(
            Q(name__icontains=q) | Q(brand__name__icontains=q) | Q(category__name__icontains=q)
        )[:6]
    return render(request, "web/partials/search_results.html", {"q": q, "results": results})


# ------------------------------------------------------------------- cart


def _login_redirect(request):
    url = f"{reverse('web:login')}?next={request.headers.get('HX-Current-URL') or request.path}"
    if is_htmx(request):
        response = HttpResponse(status=204)
        response["HX-Redirect"] = url
        return response
    return redirect(url)


@require_POST
def cart_add(request):
    if not request.user.is_authenticated:
        messages.info(request, "Войдите, чтобы добавить товар в корзину.")
        return _login_redirect(request)

    variant = ProductVariant.objects.select_related("product").filter(
        pk=request.POST.get("variant_id")
    ).first()
    try:
        quantity = max(1, int(request.POST.get("quantity", 1)))
    except ValueError:
        quantity = 1

    error = None
    if not variant:
        error = "Выберите размер."
    else:
        cart = get_cart(request.user)
        in_cart = (
            CartItem.objects.filter(cart=cart, product_variant=variant)
            .values_list("quantity", flat=True)
            .first()
            or 0
        )
        if in_cart + quantity > variant.available_quantity:
            left = max(0, variant.available_quantity - in_cart)
            error = (
                f"В наличии только {variant.available_quantity} шт., в корзине уже {in_cart}."
                if left
                else "Больше этого размера нет в наличии."
            )
        else:
            serializer = CartItemSerializer(
                data={"product_variant_id": variant.pk, "quantity": quantity},
                context={"cart": cart},
            )
            if serializer.is_valid():
                serializer.save()
            else:
                error = first_error(flatten_errors(serializer.errors))

    if is_htmx(request):
        response = HttpResponse(status=200)
        if error:
            return hx_trigger(response, toast=toast(error, "error"))
        return hx_trigger(
            response,
            **{
                "cart-changed": True,
                "cart-open": True,
                "toast": toast(f"{variant.product.name} · {variant.size} — в корзине"),
            },
        )

    if error:
        messages.error(request, error)
    else:
        messages.success(request, "Товар добавлен в корзину.")
    return redirect("web:product", slug=variant.product.slug) if variant else redirect("web:catalog")


@login_required
def cart(request):
    return render(request, "web/cart.html", cart_context(request.user))


def _cart_body_response(request, error=None):
    response = render(request, "web/partials/cart_body.html", cart_context(request.user))
    events = {"cart-changed": True}
    if error:
        events["toast"] = toast(error, "error")
    return hx_trigger(response, **events)


@login_required
@require_POST
def cart_update(request, pk):
    item = get_object_or_404(
        CartItem.objects.select_related("product_variant"), pk=pk, cart__user=request.user
    )
    try:
        quantity = int(request.POST.get("quantity", item.quantity))
    except ValueError:
        quantity = item.quantity

    error = None
    if quantity <= 0:
        item.delete()
    else:
        serializer = CartItemSerializer(item, data={"quantity": quantity}, partial=True)
        if serializer.is_valid():
            serializer.save()
        else:
            error = first_error(flatten_errors(serializer.errors))

    if is_htmx(request):
        return _cart_body_response(request, error)
    if error:
        messages.error(request, error)
    return redirect("web:cart")


@login_required
@require_POST
def cart_remove(request, pk):
    CartItem.objects.filter(pk=pk, cart__user=request.user).delete()
    if is_htmx(request):
        if request.POST.get("from") == "drawer":
            response = render(request, "web/partials/cart_drawer.html", cart_context(request.user))
            return hx_trigger(response, **{"cart-changed": True})
        return _cart_body_response(request)
    return redirect("web:cart")


def cart_drawer(request):
    ctx = cart_context(request.user) if request.user.is_authenticated else {"items": []}
    return render(request, "web/partials/cart_drawer.html", ctx)


def cart_badge(request):
    return render(request, "web/partials/cart_badge.html")


# --------------------------------------------------------- checkout/orders


ADDRESS_FIELDS = (
    "title",
    "recipient_name",
    "recipient_phone",
    "city",
    "street",
    "house",
    "apartment",
    "postal_code",
)


def _address_from_post(request):
    data = {f: request.POST.get(f, "").strip() for f in ADDRESS_FIELDS}
    data["is_default"] = request.POST.get("is_default") == "on"
    serializer = UserAddressSerializer(data=data, context={"request": request})
    if serializer.is_valid():
        return serializer.save(), data, {}
    return None, data, flatten_errors(serializer.errors)


@login_required
def checkout(request):
    ctx = cart_context(request.user)
    if not ctx["items"]:
        messages.info(request, "Корзина пуста — добавьте что-нибудь из каталога.")
        return redirect("web:cart")

    addresses = list(request.user.addresses.order_by("-is_default", "-created_at"))
    addr_data, addr_errors, order_errors = {}, {}, []
    selected = next((a.pk for a in addresses if a.is_default), addresses[0].pk if addresses else None)

    if request.method == "POST":
        if request.POST.get("action") == "add_address":
            address, addr_data, addr_errors = _address_from_post(request)
            if address:
                messages.success(request, "Адрес сохранён.")
                return redirect(f"{reverse('web:checkout')}?address={address.pk}")
        else:
            serializer = OrderCreateSerializer(
                data={"address_id": request.POST.get("address_id")},
                context={"request": request},
            )
            try:
                serializer.is_valid(raise_exception=True)
                order = serializer.save()
            except DRFValidationError as exc:
                order_errors = list(flatten_errors(exc.detail).values())
                order_errors = [m for group in order_errors for m in group]
            else:
                messages.success(request, "Товары зарезервированы на 15 минут. Осталось оплатить.")
                return redirect("web:order", pk=order.pk)

    if request.GET.get("address", "").isdigit():
        selected = int(request.GET["address"])

    ctx.update(
        {
            "addresses": addresses,
            "selected_address": selected,
            "addr_data": addr_data,
            "addr_errors": addr_errors,
            "order_errors": order_errors,
            "show_address_form": bool(addr_errors) or not addresses,
        }
    )
    return render(request, "web/checkout.html", ctx)


def _orders_qs(user):
    return (
        Order.objects.filter(user=user)
        .select_related("address", "payment")
        .prefetch_related("items__product_variant__product")
        .order_by("-created_at")
    )


def _seconds_left(order):
    from django.utils import timezone

    if order.status != OrderStatus.RESERVED or not order.expires_at:
        return 0
    return max(0, int((order.expires_at - timezone.now()).total_seconds()))


@login_required
def orders(request):
    run_expiry()
    orders_list = list(_orders_qs(request.user))
    for o in orders_list:
        o.seconds_left = _seconds_left(o)
    return render(request, "web/orders.html", {"orders": orders_list})


@login_required
def order_detail(request, pk):
    run_expiry()
    order = get_object_or_404(_orders_qs(request.user), pk=pk)
    order.seconds_left = _seconds_left(order)

    payment_flag = request.GET.get("payment")
    awaiting_webhook = payment_flag == "success" and order.status == OrderStatus.RESERVED
    if payment_flag == "cancelled" and order.status == OrderStatus.RESERVED:
        messages.warning(request, "Оплата отменена. Резерв ещё действует — можно попробовать снова.")

    steps = [
        ("Создан", True),
        ("Резерв", order.status in (OrderStatus.RESERVED, OrderStatus.PAID)),
        ("Оплачен", order.status == OrderStatus.PAID),
    ]
    return render(
        request,
        "web/order_detail.html",
        {
            "order": order,
            "awaiting_webhook": awaiting_webhook,
            "steps": steps,
            "reserve_total": 15 * 60,
        },
    )


@login_required
def order_status(request, pk):
    """Поллинг после возврата со Stripe: как только вебхук отметил оплату — перезагружаем."""
    order = get_object_or_404(Order, pk=pk, user=request.user)
    if order.status != OrderStatus.RESERVED:
        response = HttpResponse(status=200)
        response["HX-Refresh"] = "true"
        return response
    return render(request, "web/partials/order_waiting.html", {"order": order})


@login_required
@require_POST
def order_pay(request, pk):
    from apps.payments.services import PaymentService

    order = get_object_or_404(Order, pk=pk, user=request.user)
    try:
        checkout_url = PaymentService.create_payment_for_order(order)
    except ValueError as exc:
        messages.error(request, str(exc))
    except Exception:
        logger.exception("Stripe checkout failed for order %s", order.pk)
        messages.error(request, "Платёжный сервис недоступен. Попробуйте ещё раз через минуту.")
    else:
        return redirect(checkout_url)
    return redirect("web:order", pk=order.pk)


@login_required
@require_POST
def order_cancel(request, pk):
    order = get_object_or_404(Order, pk=pk, user=request.user)
    try:
        cancel_order(order)
    except ValueError as exc:
        messages.error(request, str(exc))
    else:
        messages.success(request, f"Заказ №{order.pk} отменён, резерв снят.")
    return redirect("web:order", pk=order.pk)


# ---------------------------------------------------------------- account


def login_view(request):
    if request.user.is_authenticated:
        return redirect(safe_next(request))
    error, email = None, ""
    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        user = authenticate(request, username=email, password=request.POST.get("password", ""))
        if user is None:
            error = "Неверный email или пароль."
        elif not user.is_active:
            error = "Аккаунт отключён."
        else:
            login(request, user)
            if request.POST.get("remember") != "on":
                request.session.set_expiry(0)
            messages.success(request, f"С возвращением, {user.full_name or user.email}!")
            return redirect(safe_next(request))
    return render(
        request,
        "web/auth/login.html",
        {"error": error, "email": email, "next": request.GET.get("next", "")},
    )


def register_view(request):
    if request.user.is_authenticated:
        return redirect("web:home")
    data, errors = {}, {}
    if request.method == "POST":
        data = {
            "email": request.POST.get("email", "").strip(),
            "full_name": request.POST.get("full_name", "").strip(),
            "password": request.POST.get("password", ""),
            "password_confirm": request.POST.get("password_confirm", ""),
        }
        serializer = UserRegistrationSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            messages.success(request, "Аккаунт создан. Добро пожаловать!")
            return redirect(safe_next(request))
        errors = flatten_errors(serializer.errors)
    return render(
        request,
        "web/auth/register.html",
        {"data": data, "errors": errors, "next": request.GET.get("next", "")},
    )


@require_POST
def logout_view(request):
    logout(request)
    messages.info(request, "Вы вышли из аккаунта.")
    return redirect("web:home")


def password_reset_request(request):
    sent, email = False, ""
    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        serializer = PasswordResetRequestSerializer(data={"email": email})
        if serializer.is_valid():
            serializer.save()  # письмо уходит только если пользователь существует
            sent = True
    return render(request, "web/auth/password_reset.html", {"sent": sent, "email": email})


def password_reset_confirm(request, uidb64, token):
    errors = {}
    if request.method == "POST":
        serializer = PasswordResetConfirmSerializer(
            data={
                "uid": uidb64,
                "token": token,
                "new_password": request.POST.get("new_password", ""),
                "new_password_confirm": request.POST.get("new_password_confirm", ""),
            }
        )
        if serializer.is_valid():
            serializer.save()
            messages.success(request, "Пароль обновлён. Теперь можно войти.")
            return redirect("web:login")
        errors = flatten_errors(serializer.errors)
    return render(request, "web/auth/password_reset_confirm.html", {"errors": errors})


def _render_profile(request, **overrides):
    user = request.user
    profile_obj, _ = UserProfile.objects.get_or_create(user=user)
    ctx = {
        "profile": profile_obj,
        "addresses": user.addresses.order_by("-is_default", "-created_at"),
        "errors": {},
        "addr_data": {},
        "addr_errors": {},
        "pw_errors": {},
        "tab": request.GET.get("tab", "profile"),
        "orders_count": user.orders.count(),
        "paid_count": user.orders.filter(status=OrderStatus.PAID).count(),
    }
    ctx.update(overrides)
    return render(request, "web/profile.html", ctx)


@login_required
def profile(request):
    user = request.user
    profile_obj, _ = UserProfile.objects.get_or_create(user=user)
    errors = {}

    if request.method == "POST":
        full_name = request.POST.get("full_name", "").strip()
        if not full_name:
            errors["full_name"] = ["Укажите имя."]
        else:
            user.full_name = full_name
            user.save(update_fields=["full_name"])
            profile_obj.phone = request.POST.get("phone", "").strip()[:20]
            profile_obj.date_of_birth = request.POST.get("date_of_birth") or None
            if request.FILES.get("avatar"):
                profile_obj.avatar = request.FILES["avatar"]
            profile_obj.save()
            messages.success(request, "Профиль обновлён.")
            return redirect("web:profile")

    return _render_profile(request, errors=errors)


@login_required
@require_POST
def profile_password(request):
    serializer = ChangePasswordSerializer(
        data={k: request.POST.get(k, "") for k in ("old_password", "new_password", "new_password_confirm")},
        context={"request": request},
    )
    if serializer.is_valid():
        user = serializer.save()
        update_session_auth_hash(request, user)
        messages.success(request, "Пароль изменён.")
        return redirect(f"{reverse('web:profile')}?tab=security")
    return _render_profile(request, pw_errors=flatten_errors(serializer.errors), tab="security")


@login_required
@require_POST
def address_add(request):
    address, data, errors = _address_from_post(request)
    if address:
        messages.success(request, "Адрес добавлен.")
        return redirect(f"{reverse('web:profile')}?tab=addresses")
    return _render_profile(request, addr_data=data, addr_errors=errors, tab="addresses")


@login_required
@require_POST
def address_delete(request, pk):
    address = get_object_or_404(UserAddress, pk=pk, user=request.user)
    if address.orders.exists():
        messages.error(request, "Этот адрес используется в заказах — удалить его нельзя.")
    else:
        address.delete()
        messages.success(request, "Адрес удалён.")
    return redirect(f"{reverse('web:profile')}?tab=addresses")


@login_required
@require_POST
def address_default(request, pk):
    address = get_object_or_404(UserAddress, pk=pk, user=request.user)
    UserAddress.objects.filter(user=request.user).exclude(pk=pk).update(is_default=False)
    address.is_default = True
    address.save(update_fields=["is_default"])
    messages.success(request, "Адрес по умолчанию обновлён.")
    return redirect(f"{reverse('web:profile')}?tab=addresses")


def page_not_found(request, exception=None):
    return render(request, "404.html", status=404)

