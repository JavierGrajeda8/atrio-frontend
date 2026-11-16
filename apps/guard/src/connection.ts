/** Vigencia de los datos offline: 12 h por defecto (DECISIONS Q-11; configurable hasta 24 h). */
export const OFFLINE_DATA_MAX_AGE_HOURS = 12;

export type ConnectionState =
  { kind: "online" } | { kind: "offline"; ageMinutes: number } | { kind: "expired" };

export interface ConnectionInput {
  online: boolean;
  /** `meta.lastSync`: ISO 8601 UTC, o `null` si nunca sincronizó. */
  lastSync: string | null;
  now: number;
  maxAgeHours?: number;
}

/**
 * OFF-07: 🟢 en línea · 🟡 sin conexión con datos vigentes · 🔴 datos offline vencidos.
 *
 * Sin conexión y sin una sincronización válida no hay paquete offline que valga: vencido
 * (SEC-45). Si el reloj del dispositivo retrocedió respecto de `lastSync` tampoco se confía en
 * la edad (SEC-44): vencido. El límite es exclusivo: con exactamente `maxAgeHours` ya venció.
 */
export function connectionState({
  online,
  lastSync,
  now,
  maxAgeHours = OFFLINE_DATA_MAX_AGE_HOURS,
}: ConnectionInput): ConnectionState {
  if (online) return { kind: "online" };
  if (lastSync === null) return { kind: "expired" };

  const syncedAt = Date.parse(lastSync);
  if (Number.isNaN(syncedAt)) return { kind: "expired" };

  const ageMs = now - syncedAt;
  if (ageMs < 0 || ageMs >= maxAgeHours * 3_600_000) return { kind: "expired" };
  return { kind: "offline", ageMinutes: Math.floor(ageMs / 60_000) };
}
