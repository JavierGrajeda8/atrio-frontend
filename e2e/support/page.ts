import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export interface PageHealth {
  /** Violaciones de la CSP y errores de consola o de la página, recogidos desde que se creó. */
  problems: string[];
}

/**
 * Empieza a recoger violaciones de CSP, errores de consola y errores de la página. Llamar ANTES
 * de `goto`: las apps se sirven con sus `_headers` reales, así que una violación es un defecto.
 */
export async function watchPage(page: Page): Promise<PageHealth> {
  const health: PageHealth = { problems: [] };
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error(`CSP ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") health.problems.push(message.text());
  });
  page.on("pageerror", (error) => health.problems.push(error.message));
  return health;
}

/** Cero violaciones de axe (WCAG 2.x A/AA y buenas prácticas) en la página tal como está. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(
    violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}
