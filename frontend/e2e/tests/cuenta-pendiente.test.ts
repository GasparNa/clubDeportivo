import { test, expect } from "@playwright/test";
import {
  MENSAJE_NO_ACTIVA,
  MENSAJE_PENDIENTE,
  USUARIO_ID,
  fijarSesion,
  stubApi,
} from "../fixtures/sesion";

const SCREEN_PENDIENTE = [
  "/my-reservations",
  "/reservations/new",
  `/reservations/${USUARIO_ID}/rent-equipment`,
];

async function esperarAviso(
  page: import("@playwright/test").Page,
  mensaje: string,
  estado: RegExp,
) {
  const contenido = page.locator("main#contenido");
  const aviso = page.getByRole("status", { name: "Estado de la cuenta" });

  await expect(aviso).toBeVisible();
  await expect(contenido.getByText(mensaje, { exact: true })).toBeVisible();
  await expect(aviso.getByText(estado)).toBeVisible();
  await expect(aviso.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
    "href",
    "/profile",
  );
  await expect((await contenido.innerText()).trim()).not.toBe("");
}

test.describe("Aviso de cuenta no ACTIVA - e2e", () => {
  for (const ruta of SCREEN_PENDIENTE) {
    test(`muestra aviso PENDIENTE en ${ruta}`, async ({ page }) => {
      await stubApi(page);
      await fijarSesion(page, { estado: "PENDIENTE" });
      await page.goto(ruta);

      await esperarAviso(page, MENSAJE_PENDIENTE, /^pendiente$/i);

      const contenido = page.locator("main#contenido");
      await expect(contenido.getByText("Nueva reserva", { exact: true })).toHaveCount(0);
      await expect(contenido.getByText("Disciplina", { exact: true })).toHaveCount(0);
      await expect(contenido.getByText("Cancha", { exact: true })).toHaveCount(0);
      await expect(contenido.getByText("Franja horaria", { exact: true })).toHaveCount(0);
      await expect(
        contenido.getByRole("button", { name: "Confirmar reserva" }),
      ).toHaveCount(0);
      await expect(
        contenido.getByRole("heading", { name: "Alquilar Equipamiento" }),
      ).toHaveCount(0);
      await expect(contenido.getByRole("button")).toHaveCount(0);
    });
  }

  test("muestra aviso INACTIVO al alquilar equipamiento", async ({ page }) => {
    await stubApi(page);
    await fijarSesion(page, { estado: "INACTIVO" });
    await page.goto(`/reservations/${USUARIO_ID}/rent-equipment`);

    await esperarAviso(page, MENSAJE_NO_ACTIVA, /^inactivo$/i);

    const contenido = page.locator("main#contenido");
    await expect(
      contenido.getByRole("heading", { name: "Alquilar Equipamiento" }),
    ).toHaveCount(0);
    await expect(contenido.getByRole("button")).toHaveCount(0);
  });

  test("usuario ACTIVO conserva Mis reservas", async ({ page }) => {
    await stubApi(page);
    await fijarSesion(page, { estado: "ACTIVO" });
    await page.goto("/my-reservations");

    await expect(
      page.getByRole("heading", { name: "Mis Reservas" }),
    ).toBeVisible();
    await expect(
      page.locator("main#contenido").getByText("Nueva reserva", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Estado de la cuenta" }),
    ).toHaveCount(0);
  });

  test("visitante sin sesión es redirigido a login desde Mis reservas", async ({
    page,
  }) => {
    await stubApi(page);
    await page.goto("/my-reservations");

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/login" &&
        url.searchParams.get("redirect") === "/my-reservations",
    );
    await expect(
      page.getByRole("status", { name: "Estado de la cuenta" }),
    ).toHaveCount(0);
  });

  test("visitante sin sesión es redirigido a login desde alquiler", async ({
    page,
  }) => {
    const ruta = `/reservations/${USUARIO_ID}/rent-equipment`;
    await stubApi(page);
    await page.goto(ruta);

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === "/login" && url.searchParams.get("redirect") === ruta,
    );
    await expect(
      page.getByRole("status", { name: "Estado de la cuenta" }),
    ).toHaveCount(0);
  });

  for (const ruta of ["/", "/disciplines", "/availability"]) {
    test(`ruta pública ${ruta} carga sin redirección ni aviso`, async ({
      page,
    }) => {
      await stubApi(page);
      await page.goto(ruta);

      await expect(page).toHaveURL((url) => url.pathname === ruta);
      await expect(
        page.getByRole("status", { name: "Estado de la cuenta" }),
      ).toHaveCount(0);
    });
  }
});
