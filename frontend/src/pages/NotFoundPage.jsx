import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="max-w-6xl mx-auto px-5 py-24 text-center">
            <div className="text-[12px] text-orange-500 mb-4">( 404 )</div>
            <h1 className="text-4xl font-medium tracking-tight mb-4">Страница не найдена</h1>
            <p className="text-neutral-400 mb-8">
                Такой страницы не существует, либо она была перемещена.
            </p>
            <Link
                to="/"
                className="inline-block bg-orange-500 text-black px-5 py-2.5 rounded-lg font-medium hover:bg-orange-400 transition-colors"
            >
                На главную
            </Link>
        </div>
    );
}