from django.urls import path

from . import views

app_name = "web"

urlpatterns = [
    path("", views.home, name="home"),
    path("catalog/", views.catalog, name="catalog"),
    path("product/<slug:slug>/", views.product_detail, name="product"),
    path("search/suggest/", views.search_suggest, name="search_suggest"),
    # корзина
    path("cart/", views.cart, name="cart"),
    path("cart/add/", views.cart_add, name="cart_add"),
    path("cart/item/<int:pk>/update/", views.cart_update, name="cart_update"),
    path("cart/item/<int:pk>/remove/", views.cart_remove, name="cart_remove"),
    path("cart/drawer/", views.cart_drawer, name="cart_drawer"),
    path("cart/badge/", views.cart_badge, name="cart_badge"),
    # оформление и заказы
    path("checkout/", views.checkout, name="checkout"),
    path("orders/", views.orders, name="orders"),
    path("orders/<int:pk>/", views.order_detail, name="order"),
    path("orders/<int:pk>/status/", views.order_status, name="order_status"),
    path("orders/<int:pk>/pay/", views.order_pay, name="order_pay"),
    path("orders/<int:pk>/cancel/", views.order_cancel, name="order_cancel"),
    # аккаунт
    path("login/", views.login_view, name="login"),
    path("register/", views.register_view, name="register"),
    path("logout/", views.logout_view, name="logout"),
    path("password-reset/", views.password_reset_request, name="password_reset"),
    path(
        "reset-password/<str:uidb64>/<str:token>/",
        views.password_reset_confirm,
        name="password_reset_confirm",
    ),
    path("profile/", views.profile, name="profile"),
    path("profile/password/", views.profile_password, name="profile_password"),
    path("profile/addresses/add/", views.address_add, name="address_add"),
    path("profile/addresses/<int:pk>/delete/", views.address_delete, name="address_delete"),
    path("profile/addresses/<int:pk>/default/", views.address_default, name="address_default"),
]
