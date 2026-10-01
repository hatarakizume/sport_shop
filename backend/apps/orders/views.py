import logging

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Order
from .serializers import OrderCreateSerializer, OrderSerializer
from .services import cancel_order, expire_stale_reservations

logger = logging.getLogger(__name__)


class OrderViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        try:
            expire_stale_reservations()
        except Exception:
            logger.exception("Не удалось снять просроченные резервы")

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .select_related("address")
            .prefetch_related("items__product_variant__product")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()

        try:
            order = cancel_order(order)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        order = self.get_queryset().get(pk=order.pk)
        return Response(
            OrderSerializer(order, context=self.get_serializer_context()).data
        )
