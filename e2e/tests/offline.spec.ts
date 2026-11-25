import { expect, test } from "@playwright/test";
import { url } from "../support/apps";
import { expectNoA11yViolations, watchPage } from "../support/page";

// FR-10c · OFF-01: guard debe abrir sin red tras una primera carga con red, y pass debe avisar
// con claridad cuando se pierde la conexión. Sin esperas fijas: se esperan estados visibles.

const OFFLINE_INDICATOR = /Sin conexión|Datos offline vencidos/;

test.describe("FR-10c — guard sin conexión (OFF-01)", () => {
  test("tras la primera carga, con la red cortada y recargando, el shell abre", async ({
    page,
    context,
  }) => {
    const health = await watchPage(page);
    await page.goto(url("guard"));
    await expect(page.getByText("En línea")).toBeVisible();

    // El service worker queda activo y el shell, en el precaché.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    expect(await page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("link", { name: "Escanear QR" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ingresar código" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sin pase" })).toBeVisible();
    await expect(page.getByText(OFFLINE_INDICATOR)).toBeVisible();
    await expectNoA11yViolations(page);
    expect(health.problems).toEqual([]);
  });

  test("sin red también abre una ruta directa y se navega dentro del shell", async ({
    page,
    context,
  }) => {
    await page.goto(url("guard"));
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);

    await page.goto(url("guard", "/code"));
    await expect(page.getByRole("heading", { name: "Ingresar código" })).toBeVisible();
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(page.getByRole("link", { name: "Escanear QR" })).toBeVisible();
    await page.getByRole("link", { name: "Sin pase" }).click();
    await expect(page.getByRole("heading", { name: "Sin pase" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("al volver la red el indicador vuelve a «En línea»", async ({ page, context }) => {
    await page.goto(url("guard"));
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await expect(page.getByText(OFFLINE_INDICATOR)).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText("En línea")).toBeVisible();
  });
});

test.describe("FR-10c — pass sin conexión", () => {
  test("al perder la red muestra un aviso claro y accesible, y lo quita al volver", async ({
    page,
    context,
  }) => {
    const health = await watchPage(page);
    await page.goto(url("pass", "/#token-de-prueba"));
    await expect(page.getByRole("heading", { name: "Tu pase de visita" })).toBeVisible();
    const notice = page.getByRole("status").filter({ hasText: "Sin conexión" });
    await expect(notice).toHaveCount(0);

    await context.setOffline(true);
    await expect(notice).toBeVisible();
    await expectNoA11yViolations(page);

    await context.setOffline(false);
    await expect(notice).toHaveCount(0);
    expect(health.problems).toEqual([]);
  });
});
