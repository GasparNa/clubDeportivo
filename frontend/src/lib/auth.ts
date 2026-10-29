import type { Role, UserStatus } from "./types";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface JwtPayload {
  sub: string;
  email: string;
  rol: Role;
  exp?: number;
  iat?: number;
}

export interface SessionUser {
  id: string;
  email: string;
  rol: Role;
  estado?: UserStatus;
  nombre?: string;
  apellido?: string;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function persistCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
  }
}

export function setSession(token: string, user?: SessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  persistCookie(token);

  const fromJwt = decodeJwtPayload(token);
  const session: SessionUser = user ?? {
    id: fromJwt?.sub ?? "",
    email: fromJwt?.email ?? "",
    rol: fromJwt?.rol ?? "INVITADO",
  };
  localStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  persistCookie(null);
}

export function readSession(): { token: string | null; user: SessionUser | null } {
  const token = getToken();
  if (!token) return { token: null, user: null };

  const payload = decodeJwtPayload(token);
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    clearSession();
    return { token: null, user: null };
  }

  const stored = getStoredUser();
  const user: SessionUser | null =
    stored ??
    (payload
      ? { id: payload.sub, email: payload.email, rol: payload.rol }
      : null);

  return { token, user };
}

const AUTH_EVENT = "club-auth-change";
let sessionSnapshot: SessionUser | null | undefined;

function invalidateSessionSnapshot() {
  sessionSnapshot = undefined;
}

export function notifySessionChange() {
  invalidateSessionSnapshot();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

export function subscribeSession(listener: () => void) {
  const onChange = () => {
    invalidateSessionSnapshot();
    listener();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_EVENT, onChange);
  };
}

export function getSessionSnapshot(): SessionUser | null {
  if (sessionSnapshot !== undefined) return sessionSnapshot;
  sessionSnapshot = readSession().user;
  return sessionSnapshot;
}

export function getSessionServerSnapshot(): SessionUser | null {
  return null;
}
