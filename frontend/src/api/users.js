import api from './axios';


export async function getProfile() {
    const { data } = await api.get('/api/users/profile/');
    return data;
}

export async function updateProfile(payload) {
    const { data } = await api.patch('/api/users/profile/', payload);
    return data;
}


export async function getAddresses() {
    const { data } = await api.get('/api/users/addresses/');
    return data.results ?? data;
}

export async function createAddress(payload) {
    const { data } = await api.post('/api/users/addresses/', payload);
    return data;
}

export async function updateAddress(id, payload) {
    const { data } = await api.patch(`/api/users/addresses/${id}/`, payload);
    return data;
}

export async function deleteAddress(id) {
    await api.delete(`/api/users/addresses/${id}/`);
}