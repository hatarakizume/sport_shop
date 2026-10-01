import api from './axios';

export async function getProducts(params = {}) {
    const { data } = await api.get('/api/catalog/products/', { params });
    return data;
}

export async function getProduct(slug) {
    const { data } = await api.get(`/api/catalog/products/${slug}/`);
    return data;
}

export async function getCategories() {
    const { data } = await api.get('/api/catalog/categories/');
    return data.results ?? data;
}

export async function getBrands() {
    const { data } = await api.get('/api/catalog/brands/');
    return data.results ?? data;
}