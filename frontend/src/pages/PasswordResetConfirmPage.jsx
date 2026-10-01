import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth';

export default function PasswordResetConfirmPage() {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({ new_password: '', new_password_confirm: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);
        try {
            await confirmPasswordReset({ uid, token, ...form });
            setDone(true);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setErrors(data);
            } else {
                setErrors({ non_field_errors: ['Ссылка недействительна или устарела.'] });
            }
        } finally {
            setSubmitting(false);
        }
    }

    if (done) {
        return (
            <div className="max-w-sm mx-auto px-5 py-20 text-center">
                <div className="text-[12px] text-orange-500 mb-4">( Готово )</div>
                <h1 className="text-2xl font-medium tracking-tight mb-4">Пароль изменён</h1>
                <p className="text-neutral-400 text-sm mb-8">
                    Теперь можно войти в аккаунт с новым паролем.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    className="bg-orange-500 text-black px-5 py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors"
                >
                    Войти
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-sm mx-auto px-5 py-20">
            <h1 className="text-3xl font-medium tracking-tight mb-8">Новый пароль</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="new_password">
                        Новый пароль
                    </label>
                    <input
                        id="new_password"
                        name="new_password"
                        type="password"
                        value={form.new_password}
                        onChange={handleChange}
                        required
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                    />
                    {errors.new_password && (
                        <p className="text-sm text-red-500 mt-1">{errors.new_password[0]}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="new_password_confirm">
                        Повторите пароль
                    </label>
                    <input
                        id="new_password_confirm"
                        name="new_password_confirm"
                        type="password"
                        value={form.new_password_confirm}
                        onChange={handleChange}
                        required
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                {errors.non_field_errors && (
                    <p className="text-sm text-red-500">{errors.non_field_errors[0]}</p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 text-black py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Сохраняем…' : 'Сохранить пароль'}
                </button>
            </form>

            <p className="text-sm text-neutral-400 mt-6">
                <Link to="/login" className="text-orange-500 hover:underline">
                    Вернуться ко входу
                </Link>
            </p>
        </div>
    );
}