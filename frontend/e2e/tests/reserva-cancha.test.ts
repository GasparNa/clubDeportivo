import { test, expect } from "@playwright/test";
import { loginWithApi } from "../fixtures/login";
import {
  getAvailableSlots,
  getCourchesByDiscipline,
  getDisciplines,
  reservationDateOffset,
} from "../fixtures/reservation";

test.describe("Reserva de cancha - e2e", () => {
  test("debería reservar una cancha con franja a más de 24 horas y verla en Mis reservas", async ({
    page,
  }) => {
    const email = process.env.SOCIO_EMAIL;
    const password = process.env.SOCIO_PASSWORD;
    test.skip(!email || !password, "Defina SOCIO_EMAIL y SOCIO_PASSWORD para ejecutar este flujo.");

    let loginResult;
    try {
      loginResult = await loginWithApi(email!, password!);
    } catch (error) {
      test.skip(`No se pudo autenticar el socio E2E: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const disciplines = (await getDisciplines(loginResult.token)).filter(
      (discipline) => discipline.estado === "ACTIVO",
    );
    test.skip(disciplines.length === 0, "No hay disciplinas activas disponibles.");
    const discipline = disciplines[0];
    const courts = await getCourchesByDiscipline(loginResult.token, discipline.id);
    test.skip(courts.length === 0, "No hay canchas disponibles para la disciplina.");
    const court = courts[0];
    const date = reservationDateOffset(2);
    const slots = await getAvailableSlots(loginResult.token, court.id, date);
    test.skip(slots.length === 0, `No hay franjas disponibles para ${date}.`);
    const slot = slots[0];

    await page.goto("/");
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      },
      loginResult,
    );
    await page.reload();
    await page.goto("/reservations/new");
    await page.getByRole("button", { name: new RegExp(`^${discipline.nombre}`) }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: new RegExp(`^${court.nombre}`) }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.locator("input[type='date']").fill(date);
    await page.getByRole("button", { name: `${slot.hora_inicio} – ${slot.hora_fin}` }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirmar reserva" }).click();
    await page.waitForURL(/\/reservations\/.+/);
    const reservationUrl = page.url();
    await expect(page.getByText("CONFIRMADA").first()).toBeVisible();

    await page.goto("/my-reservations");
    await expect(page.getByText("CONFIRMADA").first()).toBeVisible();

    await page.goto(reservationUrl);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancelar reserva" }).click();
    await expect(page.getByText("CANCELADA").first()).toBeVisible();
  });
});
