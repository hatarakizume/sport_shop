import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProduct } from '../api/catalog';
import { addToCart } from '../api/cart';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { refresh: refreshCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    setAdded(false);
    getProduct(slug)
      .then((data) => {
        setProduct(data);
        // Сразу выбираем первый размер, который есть в наличии
        const firstAvailable = data.variants?.find((v) => v.available_quantity > 0);
        setSelectedVariant(firstAvailable || data.variants?.[0] || null);
      })
      .catch(() => setError('Товар не найден.'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    if (!selectedVariant) return;

    setAdding(true);
    setAddError('');
    try {
      await addToCart({ product_variant_id: selectedVariant.id, quantity: 1 });
      await refreshCart();
      setAdded(true);
    } catch (err) {
      setAddError(err.response?.data?.quantity?.[0] || 'Не удалось добавить товар в корзину.');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="max-w-6xl mx-auto px-5 py-20 text-neutral-400 text-sm">Загрузка…</div>;
  }

  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-20 text-center">
        <p className="text-neutral-400 mb-6">{error || 'Товар не найден.'}</p>
        <Link to="/catalog" className="text-orange-500 hover:underline text-sm">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const isSelectedInStock = selectedVariant && selectedVariant.available_quantity > 0;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">
              Нет фото
            </div>
          )}
        </div>

        <div>
          {product.brand && (
            <div className="text-sm text-neutral-500 mb-2">{product.brand.name}</div>
          )}
          <h1 className="text-3xl font-medium tracking-tight mb-3">{product.name}</h1>
          <div className="text-2xl text-orange-500 font-medium mb-6">{product.price} ₽</div>

          {product.description && (
            <p className="text-sm text-neutral-400 leading-relaxed mb-8">{product.description}</p>
          )}

          {product.variants?.length > 0 && (
            <div className="mb-8">
              <div className="text-sm text-neutral-400 mb-2.5">Размер</div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const outOfStock = v.available_quantity === 0;
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      disabled={outOfStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`min-w-[48px] h-11 px-3 rounded-lg text-sm border transition-colors
                        ${isSelected ? 'border-orange-500 text-orange-500' : 'border-neutral-800 text-neutral-200 hover:border-neutral-600'}
                        ${outOfStock ? 'opacity-30 cursor-not-allowed line-through' : ''}`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {addError && <p className="text-sm text-red-500 mb-3">{addError}</p>}

          <button
            onClick={handleAddToCart}
            disabled={!isSelectedInStock || adding}
            className="w-full md:w-auto bg-orange-500 text-black px-8 py-3 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? 'Добавляем…' : added ? 'Добавлено ✓' : !isSelectedInStock ? 'Нет в наличии' : 'В корзину'}
          </button>
        </div>
      </div>
    </div>
  );
}
