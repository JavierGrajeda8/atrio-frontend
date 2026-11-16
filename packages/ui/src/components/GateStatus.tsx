import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export type GateStatusKind = "granted" | "denied" | "offline";

export interface GateStatusProps extends Omit<ComponentProps<"div">, "children"> {
  status: GateStatusKind;
  /** La palabra del estado (p. ej. "Adelante"); el componente la muestra en mayúsculas. */
  label: ReactNode;
  /** Datos del visitante o la razón, debajo de la palabra. */
  details?: ReactNode;
  /** Controles de la pantalla (p. ej. un `Button size="lg"`, de 56 px). */
  actions?: ReactNode;
}

// BRAND §7: fondo completo jade / achiote / maíz con sus tokens `gate-*` (AAA en claro y oscuro).
const styles: Record<GateStatusKind, string> = {
  granted: "bg-gate-granted-bg text-gate-granted-fg",
  denied: "bg-gate-denied-bg text-gate-denied-fg",
  offline: "bg-gate-offline-bg text-gate-offline-fg",
};

// Íconos de trazo de 2 px (estilo Lucide), decorativos: la palabra va siempre al lado.
const icons: Record<GateStatusKind, ReactNode> = {
  granted: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  denied: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  offline: (
    <>
      <path d="M12 20h.01M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.4-1.8M2 8.8a15 15 0 0 1 4.2-2.4M22 8.8a15 15 0 0 0-10-3.8M2 2l20 20" />
    </>
  ),
};

export function GateStatus({
  status,
  label,
  details,
  actions,
  className,
  ...props
}: GateStatusProps) {
  return (
    <div
      role="status"
      data-status={status}
      className={cn(
        // `text-md` (18 px) en la raíz: todo texto de la pantalla hereda el mínimo de garita.
        "flex flex-col items-center justify-center gap-4 p-6 text-center font-body text-md",
        styles[status],
        className,
      )}
      {...props}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        width={96}
        height={96}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icons[status]}
      </svg>
      <p className="font-display text-gate font-extrabold uppercase">{label}</p>
      {details ? <div>{details}</div> : null}
      {actions ? <div className="flex flex-wrap justify-center gap-3">{actions}</div> : null}
    </div>
  );
}
