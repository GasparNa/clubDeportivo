import { test, expect } from "@playwright/test";
import { crearRespuestaLogin, stubApi } from "../fixtures/sesion";

async function iniciarSesion(page: import("@playwright/test").Page) {
  await page.getByLabel("Email").fill("socio.e2e@club.test");
  await page.getByLabel("Contraseña").fill("clave-e2e");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test.describe("Login según estado de cuenta - e2e", () => {
  test("PENDIENTE con redirect termina en inicio", async ({ page }) => {
    await stubApi(page, {
      login: crearRespuestaLogin({ estado: "PENDIENTE" }),
    });
    await page.goto("/login?redirect=%2Fmy-reservations");
    await iniciarSesion(page);

    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(
      page.getByRole("status", { name: "Estado de la cuenta" }),
    ).toHaveCount(0);
  });

  test("ACTIVO con redirect termina en la ruta indicada", async ({ page }) => {
    await stubApi(page, {
      login: crearRespuestaLogin({ estado: "ACTIVO" }),
    });
    await page.goto("/login?redirect=%2Freservations%2Fnew");
    await iniciarSesion(page);

    await expect(page).toHaveURL((url) => url.pathname === "/reservations/new");
  });

  test("ACTIVO sin redirect termina en el dashboard por rol", async ({ page }) => {
    await stubApi(page, {
      login: crearRespuestaLogin({ estado: "ACTIVO" }),
    });
    await page.goto("/login");
    await iniciarSesion(page);

    await expect(page).toHaveURL((url) => url.pathname === "/my-reservations");
  });
});
