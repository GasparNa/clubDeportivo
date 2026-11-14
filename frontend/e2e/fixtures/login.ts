import { api } from "@/lib/http-client";

export interface LoginFixture {
  token: string;
  user: {
    id: string;
    email: string;
    rol: string;
    estado: string;
  };
}

interface LoginResponse {
  token: string;
  usuario: {
    id?: string;
    id_usuario?: string;
    email: string;
    rol: string;
    estado: string;
  };
}

function toLoginFixture(response: LoginResponse): LoginFixture {
  const id = response.usuario.id ?? response.usuario.id_usuario;
  if (!response.token || !response.usuario || !id) {
    throw new Error("Login fallido: la respuesta no contiene sesión completa.");
  }

  return {
    token: response.token,
    user: { id, email: response.usuario.email, rol: response.usuario.rol, estado: response.usuario.estado },
  };
}

/**
 * Intenta iniciar sesión con las credenciales de las variables de entorno.
 * Si no hay credenciales definidas, lanza un error informativo documentando la limitación.
 *
 * Las credenciales esperadas via env:
 * - NEXT_PUBLIC_API_URL: URL base de la API (ej: http://localhost:3001/api/v1)
 * - SOCIO_EMAIL: Email de un socio ACTIVO existente
 * - SOCIO_PASSWORD: Contraseña del socio
 *
 * LIMITATION: El seed actual no incluye un socio con estado ACTIVO.
 * Si las credenciales no funcionan, los tests serán marcados con pending
 * y el usuario deberá crear un socio ACTIVO manualmente o via API.
 */
export async function loginWithEnv(): Promise<LoginFixture> {
  const email = process.env.SOCIO_EMAIL;
  const password = process.env.SOCIO_PASSWORD;

  if (!email || !password) {
    const missing = !email ? "SOCIO_EMAIL" : "SOCIO_PASSWORD";
    throw new Error(
      `Falta la variable de entorno ${missing}. ` +
        "Define credenciales de socio en las variables de entorno para los tests e2e. " +
        "Ver README e2e para detalles."
    );
  }

  const response = await api.post<LoginResponse>("/auth/login", { email, password });
  return toLoginFixture(response);
}

export async function loginWithApi(
  email: string,
  password: string
): Promise<LoginFixture> {
  const response = await api.post<LoginResponse>("/auth/login", { email, password });
  return toLoginFixture(response);
}