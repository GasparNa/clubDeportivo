import type { Page } from "@playwright/test";
import type { Role, UserStatus } from "@/lib/types";

export const USUARIO_ID = "550e8400-e29b-41d4-a716-446655440000";
export const MENSAJE_PENDIENTE =
  "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar.";
export const MENSAJE_NO_ACTIVA =
  "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club.";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const API_PATTERN = "**/api/v1/**";
const HEADERS_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

interface DatosSesion {
  estado: UserStatus;
  rol?: Role;
  id?: string;
  email?: string;
}

interface Sesion {
  token: string;
  user: {
    id: string;
    email: string;
    rol: Role;
    estado: UserStatus;
    nombre: string;
    apellido: string;
  };
}

interface OpcionesStubApi {
  login?: unknown;
}

function base64(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function crearSesion(datos: DatosSesion): Sesion {
  const id = datos.id ?? USUARIO_ID;
  const email = datos.email ?? "socio.e2e@club.test";
  const rol = datos.rol ?? "SOCIO";
  const ahora = Math.floor(Date.now() / 1000);
  const header = base64({ alg: "HS256", typ: "JWT" });
  const payload = base64({
    sub: id,
    email,
    rol,
    estado: datos.estado,
    iat: ahora,
    exp: ahora + 3600,
  });

  return {
    token: `${header}.${payload}.c2lnbmF0dXJhLWUyZQ`,
    user: {
      id,
      email,
      rol,
      estado: datos.estado,
      nombre: "Socio",
      apellido: "E2E",
    },
  };
}

export function crearRespuestaLogin(datos: DatosSesion): unknown {
  const sesion = crearSesion(datos);
  return {
    token: sesion.token,
    usuario: {
      id_usuario: sesion.user.id,
      email: sesion.user.email,
      rol: sesion.user.rol,
      estado: sesion.user.estado,
    },
  };
}

export async function fijarSesion(page: Page, datos: DatosSesion): Promise<Sesion> {
  const sesion = crearSesion(datos);
  await page.context().addCookies([
    {
      name: "token",
      value: sesion.token,
      url: BASE_URL,
      sameSite: "Lax",
    },
  ]);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    { token: sesion.token, user: sesion.user },
  );
  return sesion;
}

export async function stubApi(page: Page, opciones: OpcionesStubApi = {}): Promise<void> {
  await page.route(API_PATTERN, async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: HEADERS_CORS });
      return;
    }

    const url = new URL(request.url());
    if (
      opciones.login !== undefined &&
      request.method() === "POST" &&
      url.pathname.endsWith("/auth/login")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: HEADERS_CORS,
        body: JSON.stringify(opciones.login),
      });
      return;
    }

    const body = request.method() === "GET" ? [] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: HEADERS_CORS,
      body: JSON.stringify(body),
    });
  });
}
