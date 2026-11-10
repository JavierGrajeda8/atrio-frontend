import { UiCatalog } from "./UiCatalog";

// Ruta simple hasta que el enrutado real llegue con FR-08a.
export function App() {
  if (window.location.pathname === "/_ui") return <UiCatalog />;
  return <main data-app="web" className="bg-bg font-body text-text min-h-dvh" />;
}
