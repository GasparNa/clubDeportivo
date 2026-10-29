"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  clearSession,
  getSessionServerSnapshot,
  getSessionSnapshot,
  notifySessionChange,
  setSession,
  subscribeSession,
  type SessionUser,
} from "./auth";

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (token: string, user?: SessionUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeSession, getSessionSnapshot, getSessionServerSnapshot);

  const login = useCallback((token: string, sessionUser?: SessionUser) => {
    setSession(token, sessionUser);
    notifySessionChange();
  }, []);

  const logout = useCallback(() => {
    clearSession();
    notifySessionChange();
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}

/**
 * Hook que verifica si el usuario actual tiene estado ACTIVO y puede realizar reservas.
 * Lanza error si no está autenticado o no está ACTIVO (para ser capturado por el componente).
 * Durante build/prerender, retorna null para evitar errores.
 */
export function useRequireActiveUser(): SessionUser | null {
  const { user, isAuthenticated } = useAuth();
  
  // Durante build/prerender (server), isAuthenticated será false
  // Retornamos null y el componente manejará el caso
  if (typeof window === "undefined") {
    return null;
  }
  
  if (!isAuthenticated) {
    throw new Error("NOT_AUTHENTICATED");
  }
  
  if (!user?.estado || user.estado !== "ACTIVO") {
    throw new Error("USER_NOT_ACTIVE");
  }
  
  return user;
}
