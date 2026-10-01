import { createContext, useContext, useEffect, useState } from 'react';
import { getProfile } from '../api/users';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!authApi.isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const data = await getProfile();
        setUser({ email: data.email, full_name: data.full_name });
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function login(credentials) {
    const u = await authApi.login(credentials);
    setUser(u);
    return u;
  }

  async function register(payload) {
    const u = await authApi.register(payload);
    setUser(u);
    return u;
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  }
  return ctx;
}