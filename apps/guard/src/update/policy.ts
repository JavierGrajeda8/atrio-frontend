/** Inactividad mínima antes de aplicar una versión nueva (OFF-09). */
export const IDLE_BEFORE_UPDATE_MS = 5 * 60_000;

export interface UpdateContext {
  /** Tiempo desde la última actividad del guardia. */
  idleMs: number;
  /** Eventos de acceso en cola sin sincronizar (OFF-05). */
  pendingEvents: number;
  /** El turno está por empezar: el mejor momento para actualizar (OFF-09). */
  shiftStarting: boolean;
}

/**
 * Puntos de integración que llegan con milestones posteriores. Hoy no existe el concepto de
 * turno ni la cola de eventos, así que los valores por defecto son los neutros.
 */
export interface UpdateHooks {
  /** Cantidad de eventos pendientes de sincronizar (la cola de FR posteriores). */
  pendingEvents(): number | Promise<number>;
  /** `true` al iniciar un turno (el turno aún no existe). */
  shiftStarting(): boolean;
}

export const defaultHooks: UpdateHooks = {
  pendingEvents: () => 0,
  shiftStarting: () => false,
};

/**
 * OFF-09: nunca se recarga la app en mitad de un turno. Una versión nueva se aplica al iniciar
 * turno o tras 5 min de inactividad, y siempre sin eventos pendientes (un dato no sincronizado
 * pesa más que estar en la última versión). Ante un valor dudoso (reloj atrasado, conteo no
 * numérico) no se aplica.
 */
export function canApplyUpdate({ idleMs, pendingEvents, shiftStarting }: UpdateContext): boolean {
  if (pendingEvents !== 0) return false;
  return shiftStarting || idleMs >= IDLE_BEFORE_UPDATE_MS;
}
