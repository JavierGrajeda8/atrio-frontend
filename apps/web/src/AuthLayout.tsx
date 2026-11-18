import { FormattedMessage } from "@atrio/i18n";
import { Outlet } from "@tanstack/react-router";

/** Layout de las pantallas de entrada (login y selector): sin la navegación de la app. */
export function AuthLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-8 font-body text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
      >
        <FormattedMessage id="web.skipToContent" />
      </a>
      <header>
        <p className="font-display text-3xl font-extrabold">
          <FormattedMessage id="web.brand" />
        </p>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-col gap-6">
        <Outlet />
      </main>
    </div>
  );
}
