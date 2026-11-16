import { registerSW } from "virtual:pwa-register";
import { createUpdateCoordinator } from "./coordinator";
import type { UpdateHooks } from "./policy";

/** Eventos que cuentan como actividad del guardia. */
export const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/** Cada cuánto se evalúa si ya se puede aplicar una versión que está esperando. */
export const CHECK_EVERY_MS = 30_000;

/** Cada cuánto se busca una versión nueva (el navegador solo lo hace al navegar). */
export const LOOK_FOR_UPDATE_EVERY_MS = 60 * 60_000;

function logError(error: unknown): void {
  // Solo el nombre: un mensaje podría incluir datos.
  console.error("guard-update", error instanceof Error ? error.name : "");
}

/** Coordinador de la política en marcha; `null` si todavía no se inició (o ya se detuvo). */
let running: { markActivity(): void } | null = null;

/**
 * Avisa de actividad que no pasa por el teclado ni la pantalla: p. ej. el resultado de un
 * escaneo con la cámara o una validación. Sin esto, un guardia que solo escanea parecería
 * inactivo y la app podría actualizarse en pleno turno. No hace nada si la política no corre.
 */
export function markUpdateActivity(): void {
  running?.markActivity();
}

/**
 * Registra el service worker (`registerType: "prompt"`: una versión nueva espera) y aplica las
 * actualizaciones según OFF-09. Devuelve una función que lo detiene.
 */
export function startUpdatePolicy(hooks?: UpdateHooks, target: Window = window): () => void {
  let updateSW: (reloadPage?: boolean) => Promise<void> = () => Promise.resolve();
  const coordinator = createUpdateCoordinator({ apply: () => updateSW(true), hooks });
  const check = () => void coordinator.check().catch(logError);

  const timers: ReturnType<typeof setInterval>[] = [setInterval(check, CHECK_EVERY_MS)];

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      coordinator.notifyUpdateAvailable();
      check();
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      timers.push(
        setInterval(() => {
          if (navigator.onLine) registration.update().catch(logError);
        }, LOOK_FOR_UPDATE_EVERY_MS),
      );
    },
  });

  for (const type of ACTIVITY_EVENTS) {
    target.addEventListener(type, coordinator.markActivity, { capture: true, passive: true });
  }
  running = coordinator;

  return () => {
    running = null;
    for (const timer of timers) clearInterval(timer);
    for (const type of ACTIVITY_EVENTS) {
      target.removeEventListener(type, coordinator.markActivity, { capture: true });
    }
  };
}
