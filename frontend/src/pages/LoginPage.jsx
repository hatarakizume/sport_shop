import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(form);
            const redirectTo = location.state?.from?.pathname || '/';
            navigate(redirectTo, { replace: true });
        } catch (err) {
            const data = err.response?.data;
            const message =
                data?.non_field_errors?.[0] || data?.detail || 'Неверный email или пароль.';
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-sm mx-auto px-5 py-20">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Вход</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm text-neutral-400" htmlFor="password">
                            Пароль
                        </label>
                        <Link to="/password-reset" className="text-sm text-neutral-500 hover:text-orange-500 transition-colors">
                            Забыли пароль?
                        </Link>
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 text-black py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Входим…' : 'Войти'}
                </button>
            </form>

            <p className="text-sm text-neutral-400 mt-6">
                Ещё нет аккаунта?{' '}
                <Link to="/register" className="text-orange-500 hover:underline">
                    Зарегистрироваться
                </Link>
            </p>
        </div>
    );
}