import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import type { MessageId } from "@atrio/i18n";
import { NotFound, Page } from "./Page";
import { AuthLayout } from "./AuthLayout";
import { LoginPage } from "./LoginPage";
import { ResidentialSelectorPage } from "./ResidentialSelectorPage";
import { Shell } from "./Shell";
import { UiCatalog } from "./UiCatalog";

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound });

// Layout residente/administrador: envuelve las pantallas de la app.
const shellRoute = createRoute({ getParentRoute: () => rootRoute, id: "shell", component: Shell });

// Pantallas de entrada (sin la navegación de la app): login y selector de residencial.
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth",
  component: AuthLayout,
});

// Genérico en `path` para conservar la ruta literal y que `<Link to>` esté tipado.
const page = <TPath extends string>(path: TPath, titleId: MessageId) =>
  createRoute({
    getParentRoute: () => shellRoute,
    path,
    component: () => <Page titleId={titleId} />,
  });

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([
    page("/", "web.nav.home"),
    page("/visits", "web.nav.visits"),
    page("/announcements", "web.nav.announcements"),
    page("/admin", "web.nav.adminPanel"),
    page("/admin/management", "web.nav.adminManagement"),
    page("/admin/log", "web.nav.adminLog"),
  ]),
  authRoute.addChildren([
    createRoute({ getParentRoute: () => authRoute, path: "/login", component: LoginPage }),
    createRoute({
      getParentRoute: () => authRoute,
      path: "/residentials",
      component: ResidentialSelectorPage,
    }),
  ]),
  // Catálogo de componentes (FR-03b): fuera del layout, tiene su propia página completa.
  createRoute({ getParentRoute: () => rootRoute, path: "/_ui", component: UiCatalog }),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, defaultNotFoundComponent: NotFound });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
