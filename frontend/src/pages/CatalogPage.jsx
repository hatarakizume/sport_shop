import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts, getCategories, getBrands } from '../api/catalog';

export default function CatalogPage() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const search = searchParams.get('search') || '';
    const ordering = searchParams.get('ordering') || '-created_at';

    useEffect(() => {
        getCategories().then((d) => setCategories(Array.isArray(d) ? d : [])).catch(() => { });
        getBrands().then((d) => setBrands(Array.isArray(d) ? d : [])).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        setError('');
        const params = {};
        if (category) params.category = category;
        if (brand) params.brand = brand;
        if (search) params.search = search;
        if (ordering) params.ordering = ordering;

        getProducts(params)
            .then((data) => {
                const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : null;
                if (!list) throw new Error('bad response');
                setProducts(list);
                setCount(data.count ?? list.length);
            })
            .catch(() => setError('Не удалось загрузить каталог. Проверьте, что бэкенд запущен.'))
            .finally(() => setLoading(false));
    }, [category, brand, search, ordering]);

    function updateFilter(key, value) {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next);
    }

    return (
        <div className="max-w-6xl mx-auto px-5 py-12">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Каталог</h1>

            <div className="flex flex-wrap items-center gap-3 mb-8">
                <input
                    type="text"
                    placeholder="Поиск…"
                    defaultValue={search}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') updateFilter('search', e.target.value);
                    }}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2 text-sm outline-none focus:border-orange-500 transition-colors w-56"
                />

                <select
                    value={category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors"
                >
                    <option value="">Все категории</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <select
                    value={brand}
                    onChange={(e) => updateFilter('brand', e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors"
                >
                    <option value="">Все бренды</option>
                    {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>

                <select
                    value={ordering}
                    onChange={(e) => updateFilter('ordering', e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors ml-auto"
                >
                    <option value="-created_at">Сначала новые</option>
                    <option value="price">Сначала дешёвые</option>
                    <option value="-price">Сначала дорогие</option>
                </select>
            </div>

            {loading && <p className="text-neutral-400 text-sm">Загрузка…</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {!loading && !error && products.length === 0 && (
                <p className="text-neutral-400 text-sm">Ничего не найдено.</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                ))}
            </div>

            {!loading && count > 0 && (
                <p className="text-sm text-neutral-500 mt-8">Всего товаров: {count}</p>
            )}
        </div>
    );
}

function ProductCard({ product }) {
    return (
        <Link
            to={`/products/${product.slug}`}
            className="group block bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
        >
            <div className="aspect-square bg-neutral-800 overflow-hidden">
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">
                        Нет фото
                    </div>
                )}
            </div>
            <div className="p-3.5">
                {product.brand && (
                    <div className="text-xs text-neutral-500 mb-1">{product.brand.name}</div>
                )}
                <div className="text-sm font-medium mb-1 truncate">{product.name}</div>
                <div className="flex items-center justify-between">
                    <span className="text-orange-500 font-medium">{product.price} ₽</span>
                    {!product.in_stock && (
                        <span className="text-xs text-neutral-500">Нет в наличии</span>
                    )}
                </div>
            </div>
        </Link>
    );
}