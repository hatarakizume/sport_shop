import { useEffect, useState } from 'react';
import { getProfile, updateProfile, getAddresses, deleteAddress } from '../api/users';
import { changePassword } from '../api/auth';

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getProfile(), getAddresses()]).then(([p, a]) => {
            setProfile(p);
            setAddresses(a);
            setLoading(false);
        });
    }, []);

    async function handleRemoveAddress(id) {
        await deleteAddress(id);
        setAddresses((prev) => prev.filter((a) => a.id !== id));
    }

    if (loading) {
        return <div className="max-w-2xl mx-auto px-5 py-20 text-neutral-400 text-sm">Загрузка…</div>;
    }

    return (
        <div className="max-w-2xl mx-auto px-5 py-12 space-y-12">
            <div>
                <h1 className="text-3xl font-medium tracking-tight mb-8">Профиль</h1>
                <ProfileForm profile={profile} onSaved={setProfile} />
            </div>

            <div>
                <h2 className="text-xl font-medium mb-4">Адреса доставки</h2>
                {addresses.length === 0 ? (
                    <p className="text-sm text-neutral-500">Адресов пока нет — добавьте при оформлении заказа.</p>
                ) : (
                    <div className="space-y-2">
                        {addresses.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm"
                            >
                                <span>
                                    {a.city}, {a.street} {a.house}
                                    {a.apartment ? `, кв. ${a.apartment}` : ''}
                                    {a.is_default && <span className="text-orange-500 ml-2">(по умолчанию)</span>}
                                </span>
                                <button
                                    onClick={() => handleRemoveAddress(a.id)}
                                    className="text-neutral-600 hover:text-red-500 transition-colors"
                                >
                                    Удалить
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-xl font-medium mb-4">Смена пароля</h2>
                <ChangePasswordForm />
            </div>
        </div>
    );
}

function ProfileForm({ profile, onSaved }) {
    const [phone, setPhone] = useState(profile.phone || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile.date_of_birth || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        try {
            const updated = await updateProfile({ phone, date_of_birth: dateOfBirth || null });
            onSaved(updated);
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="text-neutral-500 mb-1">Email</div>
                    <div className="text-neutral-200">{profile.email}</div>
                </div>
                <div>
                    <div className="text-neutral-500 mb-1">ФИО</div>
                    <div className="text-neutral-200">{profile.full_name}</div>
                </div>
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="phone">
                    Телефон
                </label>
                <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                />
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="dob">
                    Дата рождения
                </label>
                <input
                    id="dob"
                    type="date"
                    value={dateOfBirth || ''}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                />
            </div>

            <button
                type="submit"
                disabled={saving}
                className="bg-orange-500 text-black px-5 py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
                {saving ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить'}
            </button>
        </form>
    );
}

function ChangePasswordForm() {
    const [form, setForm] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErrors({});
        setDone(false);
        setSubmitting(true);
        try {
            await changePassword(form);
            setDone(true);
            setForm({ old_password: '', new_password: '', new_password_confirm: '' });
        } catch (err) {
            const data = err.response?.data;
            setErrors(typeof data === 'object' ? data : { non_field_errors: ['Не удалось сменить пароль.'] });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="old_password">
                    Текущий пароль
                </label>
                <input
                    id="old_password"
                    name="old_password"
                    type="password"
                    value={form.old_password}
                    onChange={handleChange}
                    required
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 transition-colors"
                />
                {errors.old_password && <p className="text-sm text-red-500 mt-1">{errors.old_password[0]}</p>}
            </div>

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
                {errors.new_password && <p className="text-sm text-red-500 mt-1">{errors.new_password[0]}</p>}
            </div>

            <div>
                <label className="block text-sm text-neutral-400 mb-1.5" htmlFor="new_password_confirm">
                    Повторите новый пароль
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

            {errors.non_field_errors && <p className="text-sm text-red-500">{errors.non_field_errors[0]}</p>}
            {done && <p className="text-sm text-green-500">Пароль изменён.</p>}

            <button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 text-black px-5 py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
                {submitting ? 'Меняем…' : 'Изменить пароль'}
            </button>
        </form>
    );
}