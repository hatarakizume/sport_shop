import api from './axios';

export async function register({ email, full_name, password, password_confirm }) {
    const { data } = await api.post('/api/users/register/', {
        email,
        full_name,
        password,
        password_confirm,
    });
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    return data.user;
}

export async function login({ email, password }) {
    const { data } = await api.post('/api/users/login/', { email, password });
    localStorage.setItem('access', data.access);
    localStorage.setItem('refresh', data.refresh);
    return data.user;
}

export async function logout() {
    const refresh = localStorage.getItem('refresh');
    try {
        if (refresh) {
            await api.post('/api/users/logout/', { refresh });
        }
    } finally {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
    }
}

export async function requestPasswordReset(email) {
    const { data } = await api.post('/api/users/password-reset/', { email });
    return data;
}

export async function confirmPasswordReset({ uid, token, new_password, new_password_confirm }) {
    const { data } = await api.post('/api/users/password-reset-confirm/', {
        uid,
        token,
        new_password,
        new_password_confirm,
    });
    return data;
}

export async function changePassword({ old_password, new_password, new_password_confirm }) {
    const { data } = await api.post('/api/users/change-password/', {
        old_password,
        new_password,
        new_password_confirm,
    });
    return data;
}

export function isAuthenticated() {
    return !!localStorage.getItem('access');
}