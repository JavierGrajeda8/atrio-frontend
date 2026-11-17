import { FormattedMessage, useIntl } from "@atrio/i18n";
import type { MessageId } from "@atrio/i18n";
import { Link, Outlet } from "@tanstack/react-router";

interface NavItem {
  to: "/" | "/visits" | "/announcements" | "/admin" | "/admin/management" | "/admin/log";
  label: MessageId;
  /** Inicio y Panel solo están activos en su propia ruta, no en las de abajo. */
  exact?: boolean;
}

const residentNav: NavItem[] = [
  { to: "/", label: "web.nav.home", exact: true },
  { to: "/visits", label: "web.nav.visits" },
  { to: "/announcements", label: "web.nav.announcements" },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "web.nav.adminPanel", exact: true },
  { to: "/admin/management", label: "web.nav.adminManagement" },
  { to: "/admin/log", label: "web.nav.adminLog" },
];

// El enlace activo lleva `aria-current="page"` (lo pone el router) y se marca con negrita y borde:
// nunca depende solo del color.
const linkClass =
  "flex min-h-touch-min items-center rounded-md border-2 border-transparent px-3 text-sm " +
  "font-bold text-text hover:bg-surface-muted outline-offset-2 " +
  "focus-visible:outline-2 focus-visible:outline-primary " +
  "aria-[current=page]:border-primary aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary";

function NavGroup({ labelId, items }: { labelId: MessageId; items: NavItem[] }) {
  const headingId = `nav-${labelId}`;
  return (
    <div className="flex flex-col gap-2">
      <p id={headingId} className="text-xs font-bold text-text-muted uppercase">
        <FormattedMessage id={labelId} />
      </p>
      <ul aria-labelledby={headingId} className="flex flex-wrap gap-2 md:flex-col">
        {items.map(({ to, label, exact }) => (
          <li key={to}>
            <Link to={to} activeOptions={{ exact: exact ?? false }} className={linkClass}>
              <FormattedMessage id={label} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Layout de residente y administrador. En 390 px la navegación va arriba, en filas que se
 * envuelven; desde `md` pasa a una columna lateral.
 */
export function Shell() {
  const intl = useIntl();

  return (
    <div className="min-h-dvh font-body text-text md:grid md:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
      >
        <FormattedMessage id="web.skipToContent" />
      </a>
      <header className="flex flex-col gap-4 border-b border-border bg-surface px-4 py-4 md:min-h-dvh md:gap-6 md:border-r md:border-b-0 md:py-6">
        <p className="font-display text-2xl font-extrabold">
          <FormattedMessage id="web.brand" />
        </p>
        <nav
          aria-label={intl.formatMessage({ id: "web.nav.label" })}
          className="flex flex-col gap-4"
        >
          <NavGroup labelId="web.nav.resident" items={residentNav} />
          <NavGroup labelId="web.nav.admin" items={adminNav} />
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
