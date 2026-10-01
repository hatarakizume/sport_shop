import api from './axios';

export async function getOrders() {
    const { data } = await api.get('/api/orders/');
    return data.results ?? data;
}

export async function getOrder(id) {
    const { data } = await api.get(`/api/orders/${id}/`);
    return data;
}

export async function createOrder(addressId) {
    const { data } = await api.post('/api/orders/', { address_id: addressId });
    return data;
}

export async function cancelOrder(id) {
    const { data } = await api.post(`/api/orders/${id}/cancel/`);
    return data;
}