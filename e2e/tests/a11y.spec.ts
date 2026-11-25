import { expect, test } from "@playwright/test";
import { GUARD_PATHS, PASS_PATHS, SCHEMES, WEB_PATHS, url } from "../support/apps";
import { expectNoA11yViolations, watchPage } from "../support/page";

// FR-10c · FE-05: axe en cada página de web, guard y pass, en claro y oscuro, a 390 px. Las apps
// se sirven con sus `_headers` reales: además de axe, una violación de la CSP o un error de
// consola también hace fallar la prueba.

const PAGES = [
  ...WEB_PATHS.map((path) => ["web", path] as const),
  ...GUARD_PATHS.map((path) => ["guard", path] as const),
  ...PASS_PATHS.map((path) => ["pass", path] as const),
];

for (const scheme of SCHEMES) {
  test.describe(`FR-10c — accesibilidad (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    for (const [app, path] of PAGES) {
      test(`${app} ${path}: axe sin violaciones ni errores de CSP`, async ({ page }) => {
        const health = await watchPage(page);
        await page.goto(url(app, path));
        // Espera a que la app monte (sin esperas fijas).
        await expect(page.locator("#root > *").first()).toBeVisible();
        await expectNoA11yViolations(page);
        expect(health.problems).toEqual([]);
      });
    }
  });
}
