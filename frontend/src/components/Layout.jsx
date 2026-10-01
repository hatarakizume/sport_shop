import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const navLink = ({ isActive }) =>
    `transition-colors hover:text-neutral-100 ${isActive ? 'text-neutral-100' : 'text-neutral-400'}`;

  return (
    <div className="flex min-h-screen flex-col bg-black text-neutral-100">
      <header
        className={
          isHome
            ? 'fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 to-transparent'
            : 'sticky top-0 z-30 border-b border-neutral-800 bg-black/85 backdrop-blur'
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-16">
          <Link to="/" className="text-[15px] font-medium tracking-wide">
            sport shop
          </Link>

          <nav className="hidden items-center gap-7 text-sm md:flex" aria-label="Основная навигация">
            <NavLink to="/catalog" className={navLink}>
              Каталог
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/orders" className={navLink}>
                Заказы
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <>
                <NavLink to="/cart" className={({ isActive }) => `relative ${navLink({ isActive })}`}>
                  Корзина
                  {count > 0 && (
                    <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-medium text-black">
                      {count}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/profile" className={navLink}>
                  <span className="hidden sm:inline">{user?.full_name || user?.email}</span>
                  <span className="sm:hidden">Профиль</span>
                </NavLink>
                <button onClick={handleLogout} className="text-neutral-400 transition-colors hover:text-neutral-100">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-neutral-400 transition-colors hover:text-neutral-100">
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-orange-500 px-4 py-1.5 font-medium text-black transition-colors hover:bg-orange-400"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-neutral-500 md:px-16">
          <span>© 2026 Sport shop</span>
          <Link to="/catalog" className="transition-colors hover:text-neutral-200">
            Каталог
          </Link>
        </div>
      </footer>
    </div>
  );
}
