import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Decodifica el payload del JWT sin verificar la firma (solo lectura de rol).
 * La verificación real de firma la hace el backend.
 */
function decodeJwtPayload(token: string): { rol?: string; sub?: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/** Rutas públicas accesibles sin autenticación */
const PUBLIC_ROUTES = ["/", "/login", "/register", "/disciplines", "/availability"];

/** Rutas que requieren rol específico (prefijo) */
const ROLE_ROUTES: Record<string, string[]> = {
  SOCIO: ["/profile", "/my-reservations", "/reservations", "/my-payments", "/equipment-rentals", "/notifications"],
  GERENTE: ["/permission-requests", "/reservations", "/equipment-rentals", "/payments/new", "/notifications", "/profile", "/my-reservations", "/my-payments"],
  ADMINISTRADOR: ["/admin", "/permission-requests", "/reservations", "/equipment-rentals", "/payments/new", "/notifications", "/profile", "/my-reservations", "/my-payments"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y archivos estáticos
  if (
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  // Sin token → redirigir a login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);
  const rol = payload?.rol;

  if (!rol) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar acceso por rol
  const allowedRoutes = ROLE_ROUTES[rol] || [];
  const hasAccess = allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!hasAccess) {
    // Redirigir al dashboard correspondiente según rol
    const dashboardMap: Record<string, string> = {
      SOCIO: "/my-reservations",
      GERENTE: "/permission-requests",
      ADMINISTRADOR: "/admin/users",
    };
    const dashboard = dashboardMap[rol] || "/";
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};