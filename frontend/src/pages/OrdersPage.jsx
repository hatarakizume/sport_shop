import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../api/orders';

const STATUS_LABELS = {
    NEW: 'Новый',
    RESERVED: 'Зарезервирован',
    PAID: 'Оплачен',
    CANCELLED: 'Отменён',
    EXPIRED: 'Истёк',
};

const STATUS_COLORS = {
    NEW: 'text-neutral-400',
    RESERVED: 'text-orange-500',
    PAID: 'text-green-500',
    CANCELLED: 'text-neutral-500',
    EXPIRED: 'text-neutral-500',
};

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOrders()
            .then(setOrders)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="max-w-4xl mx-auto px-5 py-20 text-neutral-400 text-sm">Загрузка…</div>;
    }

    if (orders.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-5 py-20 text-center">
                <p className="text-neutral-400 mb-6">У вас пока нет заказов.</p>
                <Link to="/catalog" className="text-orange-500 hover:underline text-sm">
                    Перейти в каталог
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-5 py-12">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Мои заказы</h1>

            <div className="space-y-3">
                {orders.map((order) => (
                    <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
                    >
                        <div>
                            <div className="text-sm font-medium mb-1">Заказ №{order.id}</div>
                            <div className="text-xs text-neutral-500">
                                {new Date(order.created_at).toLocaleString('ru-RU')}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-sm font-medium mb-1 ${STATUS_COLORS[order.status] || ''}`}>
                                {STATUS_LABELS[order.status] || order.status}
                            </div>
                            <div className="text-sm text-neutral-400">{order.total_price} ₽</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}