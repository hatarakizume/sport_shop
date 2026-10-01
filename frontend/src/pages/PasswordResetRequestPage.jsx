import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth';

export default function PasswordResetRequestPage() {
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await requestPasswordReset(email);
        } finally {
            setSubmitting(false);
            setSent(true);
        }
    }

    if (sent) {
        return (
            <div className="max-w-sm mx-auto px-5 py-20 text-center">
                <div className="text-[12px] text-orange-500 mb-4">( Проверьте почту )</div>
                <h1 className="text-2xl font-medium tracking-tight mb-4">Письмо отправлено</h1>
                <p className="text-neutral-400 text-sm">
                    Если аккаунт с email <span className="text-neutral-200">{email}</span> существует,
                    на него придёт ссылка для сброса пароля.
                </p>
                <Link to="/login" className="inline-block mt-8 text-orange-500 hover:underline text-sm">
                    Вернуться ко входу
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-sm mx-auto px-5 py-20">
            <h1 className="text-3xl font-medium tracking-tight mb-3">Восстановление пароля</h1>
            <p className="text-sm text-neutral-400 mb-8">
                Укажите email, указанный при регистрации — пришлём ссылку для сброса пароля.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 text-black py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
                >
                    {submitting ? 'Отправляем…' : 'Отправить ссылку'}
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