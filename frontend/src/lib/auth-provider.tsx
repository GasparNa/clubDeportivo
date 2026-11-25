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

export type AccountAccess =
  | { kind: "activo"; user: SessionUser }
  | { kind: "inactivo"; user: SessionUser }
  | { kind: "sin-sesion"; user: null };

export function useAccountAccess(): AccountAccess {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return { kind: "sin-sesion", user: null };
  }

  return user.estado === "ACTIVO"
    ? { kind: "activo", user }
    : { kind: "inactivo", user };
}

/** Verifica si el usuario actual tiene estado ACTIVO y puede realizar reservas. */
export function useRequireActiveUser(): SessionUser | null {
  const acceso = useAccountAccess();

  return acceso.kind === "activo" ? acceso.user : null;
}
