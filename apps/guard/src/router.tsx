import { useSyncExternalStore } from "react";
import type { ComponentProps, MouseEvent } from "react";

export const ROUTES = {
  home: "/",
  scan: "/scan",
  code: "/code",
  walkIn: "/walk-in",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

// Ruteo mínimo por `pathname`: sin dependencia (guard tiene presupuesto de 200 KB). Funciona
// sin red porque el service worker responde toda navegación con el shell.
export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function Link({ to, onClick, ...props }: ComponentProps<"a"> & { to: RoutePath }) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    onClick?.(event);
    const plain = event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey);
    if (event.defaultPrevented || !plain) return;
    event.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={handleClick} {...props} />;
}
