import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, updateCartItem, removeCartItem } from '../api/cart';
import { getAddresses, createAddress } from '../api/users';
import CityField from '../components/CityField';
import { createOrder } from '../api/orders';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const { refresh: refreshCart } = useCart();

  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [cartData, addressList] = await Promise.all([getCart(), getAddresses()]);
      setCart(cartData);
      setAddresses(addressList);
      const def = addressList.find((a) => a.is_default) || addressList[0];
      if (def) setSelectedAddress(String(def.id));
      else setShowAddressForm(true);
    } catch {
      setError('Не удалось загрузить корзину.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuantityChange(itemId, quantity) {
    if (quantity < 1) return;
    const updated = await updateCartItem(itemId, quantity);
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? updated : i)),
      total_price: recalcTotal(prev.items, itemId, updated),
    }));
    refreshCart();
  }

  function recalcTotal(items, itemId, updated) {
    return items
      .reduce((sum, i) => sum + Number(i.id === itemId ? updated.subtotal : i.subtotal), 0)
      .toFixed(2);
  }

  async function handleRemove(itemId) {
    await removeCartItem(itemId);
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
    refreshCart();
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) return;
    setPlacing(true);
    setError('');
    try {
      const order = await createOrder(selectedAddress);
      await refreshCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.[0] || 'Не удалось оформить заказ.');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-5 py-20 text-neutral-400 text-sm">Загрузка…</div>;
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-5 py-20 text-center">
        <p className="text-neutral-400 mb-6">Корзина пуста.</p>
        <Link to="/catalog" className="text-orange-500 hover:underline text-sm">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <h1 className="text-3xl font-medium tracking-tight mb-8">Корзина</h1>

      <div className="space-y-3 mb-10">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-4"
          >
            <div className="flex-1 min-w-0">
              <Link
                to={`/products/${item.product_variant.product?.slug ?? ''}`}
                className="block truncate text-sm font-medium transition-colors hover:text-orange-500"
              >
                {item.product_variant.product?.name || 'Товар'}
              </Link>
              <div className="text-xs text-neutral-500">Размер {item.product_variant.size}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                className="w-7 h-7 rounded border border-neutral-700 text-sm hover:border-neutral-500"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                className="w-7 h-7 rounded border border-neutral-700 text-sm hover:border-neutral-500"
              >
                +
              </button>
            </div>

            <div className="w-28 shrink-0 whitespace-nowrap text-right text-sm font-medium text-orange-500">
              {item.subtotal} ₽
            </div>

            <button
              onClick={() => handleRemove(item.id)}
              className="text-neutral-600 hover:text-red-500 transition-colors text-sm"
              aria-label="Убрать из корзины"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-800 pt-6 mb-8">
        <div className="text-sm text-neutral-400 mb-3">Адрес доставки</div>

        {addresses.length > 0 && !showAddressForm && (
          <div className="space-y-2 mb-3">
            {addresses.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-3 text-sm bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={selectedAddress === String(a.id)}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                />
                <span>
                  {a.city}, {a.street} {a.house}
                  {a.apartment ? `, кв. ${a.apartment}` : ''}
                </span>
              </label>
            ))}
            <button
              onClick={() => setShowAddressForm(true)}
              className="text-sm text-orange-500 hover:underline"
            >
              + Добавить новый адрес
            </button>
          </div>
        )}

        {showAddressForm && (
          <NewAddressForm
            onCreated={(addr) => {
              setAddresses((prev) => [...prev, addr]);
              setSelectedAddress(String(addr.id));
              setShowAddressForm(false);
            }}
            onCancel={() => setShowAddressForm(false)}
            hasOther={addresses.length > 0}
          />
        )}
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="text-xl font-medium">
          Итого: <span className="text-orange-500">{cart.total_price} ₽</span>
        </div>
        <button
          onClick={handlePlaceOrder}
          disabled={!selectedAddress || placing}
          className="bg-orange-500 text-black px-8 py-3 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-40"
        >
          {placing ? 'Оформляем…' : 'Оформить заказ'}
        </button>
      </div>
    </div>
  );
}

function NewAddressForm({ onCreated, onCancel, hasOther }) {
  const [form, setForm] = useState({
    city: '',
    street: '',
    house: '',
    apartment: '',
    postal_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const addr = await createAddress(form);
      onCreated(addr);
    } catch {
      setError('Не удалось сохранить адрес. Проверьте поля.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <CityField value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} />
        </div>

        <input
          name="postal_code"
          placeholder="Индекс (6 цифр)"
          value={form.postal_code}
          onChange={handleChange}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          title="Индекс должен состоять ровно из 6 цифр"
          required
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        <input
          name="street" placeholder="Улица" value={form.street} onChange={handleChange} required
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        <input
          name="house"
          placeholder="Дом"
          value={form.house}
          onChange={handleChange}
          inputMode="numeric"
          pattern="\d+"
          title="Номер дома — только цифры"
          required
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />

        <input
          name="apartment"
          placeholder="Квартира (необязательно)"
          value={form.apartment}
          onChange={handleChange}
          inputMode="numeric"
          pattern="\d*"
          title="Номер квартиры — только цифры"
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-orange-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Сохраняем…' : 'Сохранить адрес'}
        </button>
        {hasOther && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
