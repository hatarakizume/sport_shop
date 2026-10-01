import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder, cancelOrder } from '../api/orders';
import { createCheckoutSession } from '../api/payments';

const STATUS_LABELS = {
  NEW: 'Новый',
  RESERVED: 'Зарезервирован',
  PAID: 'Оплачен',
  CANCELLED: 'Отменён',
  EXPIRED: 'Истёк',
};

export default function OrderPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  const pollRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    loadOrder();
    return () => {
      clearInterval(pollRef.current);
      clearInterval(tickRef.current);
    };
  }, [id]);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (order?.status === 'RESERVED' && secondsLeft > 0) {
      tickRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [order?.status, secondsLeft > 0]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (order?.status === 'RESERVED') {
      pollRef.current = setInterval(() => {
        getOrder(id).then((data) => {
          setOrder(data);
          setSecondsLeft(data.seconds_left);
        });
      }, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [order?.status, id]);

  async function loadOrder() {
    setLoading(true);
    setError('');
    try {
      const data = await getOrder(id);
      setOrder(data);
      setSecondsLeft(data.seconds_left);
    } catch {
      setError('Заказ не найден.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const updated = await cancelOrder(id);
      setOrder(updated);
    } finally {
      setCancelling(false);
    }
  }

  async function handlePay() {
    setPaying(true);
    setError('');
    try {
      const checkoutUrl = await createCheckoutSession(id);
      window.location.href = checkoutUrl;
    } catch {
      setError('Не удалось начать оплату. Попробуйте ещё раз.');
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-5 py-20 text-neutral-400 text-sm">Загрузка…</div>;
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <p className="text-neutral-400 mb-6">{error || 'Заказ не найден.'}</p>
        <Link to="/orders" className="text-orange-500 hover:underline text-sm">
          К списку заказов
        </Link>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <Link to="/orders" className="text-sm text-neutral-500 hover:text-neutral-200 transition-colors">
        ← К списку заказов
      </Link>

      <div className="flex items-center justify-between mt-4 mb-8">
        <h1 className="text-3xl font-medium tracking-tight">Заказ №{order.id}</h1>
        <span className="text-sm text-neutral-400">{STATUS_LABELS[order.status] || order.status}</span>
      </div>

      {order.status === 'RESERVED' && (
        <div className="bg-neutral-900 border border-orange-500/30 rounded-xl p-6 mb-8 text-center">
          <div className="text-sm text-neutral-400 mb-2">Резерв истекает через</div>
          <div className="text-4xl font-mono text-orange-500 mb-6">
            {mm}:{ss}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePay}
              disabled={paying || secondsLeft === 0}
              className="bg-orange-500 text-black px-8 py-3 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-40"
            >
              {paying ? 'Переходим к оплате…' : 'Оплатить'}
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-neutral-400 hover:text-red-500 transition-colors text-sm"
            >
              {cancelling ? 'Отменяем…' : 'Отменить заказ'}
            </button>
          </div>
        </div>
      )}

      {order.status === 'PAID' && (
        <div className="bg-neutral-900 border border-green-500/30 rounded-xl p-6 mb-8 text-center text-green-500">
          Заказ оплачен — спасибо за покупку!
        </div>
      )}

      {(order.status === 'EXPIRED' || order.status === 'CANCELLED') && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 text-center text-neutral-400">
          {order.status === 'EXPIRED'
            ? 'Время на оплату истекло, резерв снят.'
            : 'Заказ отменён.'}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mb-4 text-center">{error}</p>}

      <div className="space-y-3 mb-8">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4"
          >
            <div>
              <Link
                to={`/products/${item.product_variant.product?.slug ?? ''}`}
                className="text-sm font-medium transition-colors hover:text-orange-500"
              >
                {item.product_variant.product?.name || 'Товар'}
              </Link>
              <div className="text-xs text-neutral-500">
                Размер {item.product_variant.size} · {item.quantity} шт.
              </div>
            </div>
            <div className="shrink-0 whitespace-nowrap text-right">
              <div className="text-sm font-medium text-orange-500">
                {(Number(item.price) * item.quantity).toFixed(2)} ₽
              </div>
              {item.quantity > 1 && (
                <div className="text-xs text-neutral-500">
                  {item.price} ₽ × {item.quantity}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-800 pt-6 mb-8">
        <div className="text-sm text-neutral-400 mb-1">Доставка</div>
        <div className="text-sm">
          {order.address.city}, {order.address.street} {order.address.house}
          {order.address.apartment ? `, кв. ${order.address.apartment}` : ''}
        </div>
      </div>

      <div className="text-xl font-medium text-right">
        Итого: <span className="text-orange-500">{order.total_price} ₽</span>
      </div>
    </div>
  );
}
