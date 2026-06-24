import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);
const GUEST_CART_KEY = "lipovoy_guest_cart";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await apiFetch("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email, password) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, isAdmin: user?.role === "admin" }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function loadGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestCart(cart) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}
