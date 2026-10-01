import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: '',
        full_name: '',
        password: '',
        password_confirm: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);
        try {
            await register(form);
            navigate('/');
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setErrors(data);
            } else {
                setErrors({ non_field_errors: ['Что-то пошло не так. Попробуйте ещё раз.'] });
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-sm mx-auto px-5 py-20">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Регистрация</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                />
                <Field
                    label="ФИО"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    error={errors.full_name}
                />
                <Field
                    label="Пароль"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                />
                <Field
                    label="Подтверждение пароля"
                    name="password_confirm"
                    type="password"
                    value={form.password_confirm}
                    onChange={handleChange}
                    error={errors.password_confirm}
                />

                {errors.non_field_errors && (
                    <p className="text-sm text-red-500">{errors.non_field_errors[0]}</p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 text-black py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Создаём аккаунт…' : 'Создать аккаунт'}
                </button>
            </form>

            <p className="text-sm text-neutral-400 mt-6">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="text-orange-500 hover:underline">
                    Войти
                </Link>
            </p>
        </div>
    );
}

function Field({ label, name, type = 'text', value, onChange, error }) {
    return (
        <div>
            <label className="block text-sm text-neutral-400 mb-1.5" htmlFor={name}>
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                required
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
            />
            {error && <p className="text-sm text-red-500 mt-1">{Array.isArray(error) ? error[0] : error}</p>}
        </div>
    );
}