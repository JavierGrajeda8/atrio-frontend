import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "@atrio/i18n";
import "@atrio/ui/styles.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root");

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
