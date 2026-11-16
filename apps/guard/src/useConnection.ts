import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { connectionState } from "./connection";
import type { ConnectionState } from "./connection";
import { getGuardDb, getLastSync } from "./db/db";
import type { GuardDb } from "./db/db";

const TICK_MS = 30_000;

function readOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Estado de conexión de la garita: red del dispositivo + `meta.lastSync` (se actualiza solo
 * cuando cambia en la base) + el paso del tiempo (cada 30 s, para la edad y el vencimiento).
 *
 * `navigator.onLine` solo dice si hay red local, no si hay internet; la comprobación real llega
 * con la sincronización del paquete offline.
 */
export function useConnection(db: GuardDb = getGuardDb()): ConnectionState {
  const [online, setOnline] = useState(readOnline);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      setOnline(readOnline());
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    // Si la base no abre, "nunca sincronizó": sin red cuenta como vencido (falla seguro).
    const subscription = liveQuery(() => getLastSync(db)).subscribe({
      // `now` se renueva junto con lastSync: si no, justo después de sincronizar la edad saldría
      // negativa (vencido) o desfasada hasta el siguiente tic.
      next: (value) => {
        setNow(Date.now());
        setLastSync(value);
      },
      error: () => setLastSync(null),
    });
    return () => subscription.unsubscribe();
  }, [db]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return connectionState({ online, lastSync, now });
}
