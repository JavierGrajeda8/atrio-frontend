import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@atrio/i18n";
import "@atrio/ui/styles.css";
import { App } from "./App";
import { initGuardDb } from "./db/db";

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root");

// La base local se abre en paralelo: el shell nunca espera a IndexedDB (la garita no se detiene).
// Solo se registra el nombre del error: un mensaje podría incluir datos.
initGuardDb().catch((error: unknown) => {
  console.error(
    "guard-db: no se pudo abrir la base local",
    error instanceof Error ? error.name : "",
  );
});

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
