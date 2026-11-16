import { canApplyUpdate, defaultHooks } from "./policy";
import type { UpdateHooks } from "./policy";

export interface UpdateCoordinator {
  /** El service worker nuevo está esperando. */
  notifyUpdateAvailable(): void;
  /** El guardia hizo algo (toque, tecla, un resultado de validación…). */
  markActivity(): void;
  /** Aplica la actualización si la política lo permite; devuelve si la aplicó. */
  check(): Promise<boolean>;
}

interface Options {
  /** Activa el service worker nuevo y recarga la página. */
  apply: () => Promise<void>;
  hooks?: UpdateHooks;
  now?: () => number;
}

/** Decide cuándo aplicar una versión nueva. No usa la red ni conoce al service worker. */
export function createUpdateCoordinator({
  apply,
  hooks = defaultHooks,
  now = Date.now,
}: Options): UpdateCoordinator {
  let lastActivity = now();
  let available = false;
  let busy = false;

  return {
    notifyUpdateAvailable() {
      available = true;
    },
    markActivity() {
      lastActivity = now();
    },
    async check() {
      if (!available || busy) return false;
      busy = true;
      try {
        const pendingEvents = await hooks.pendingEvents();
        // La inactividad se mide después de esperar al gancho: pudo haber actividad mientras tanto.
        const allowed = canApplyUpdate({
          idleMs: now() - lastActivity,
          pendingEvents,
          shiftStarting: hooks.shiftStarting(),
        });
        if (!allowed) {
          busy = false;
          return false;
        }
        await apply();
        return true; // la página se recarga: `busy` queda activo para no aplicar dos veces
      } catch (error) {
        busy = false;
        throw error;
      }
    },
  };
}
