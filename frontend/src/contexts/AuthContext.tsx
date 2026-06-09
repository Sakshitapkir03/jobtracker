"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@/types";
import { getToken, getStoredUser, setAuth, clearAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const stored = getStoredUser() as User | null;
    if (stored) setUser(stored);
    // Verify token is still valid
    authApi
      .me()
      .then((r) => {
        setUser(r.data);
        setAuth(token, r.data);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(token: string, u: User) {
    setAuth(token, u);
    setUser(u);
  }

  function logout() {
    clearAuth();
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
