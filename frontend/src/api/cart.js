import api from './axios';

export async function getCart() {
    const { data } = await api.get('/api/cart/');
    return data;
}

export async function addToCart({ product_variant_id, quantity = 1 }) {
    const { data } = await api.post('/api/cart/items/', {
        product_variant_id,
        quantity,
    });
    return data;
}

export async function updateCartItem(itemId, quantity) {
    const { data } = await api.patch(`/api/cart/items/${itemId}/`, { quantity });
    return data;
}

export async function removeCartItem(itemId) {
    await api.delete(`/api/cart/items/${itemId}/`);
}