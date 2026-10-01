import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCart } from '../api/cart';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCount(0);
      return;
    }
    try {
      const cart = await getCart();
      setCount(cart.total_quantity || 0);
    } catch {
      setCount(0);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart должен использоваться внутри <CartProvider>');
  }
  return ctx;
}
