// Solo para pruebas: `virtual:pwa-register` lo genera vite-plugin-pwa en el build y no existe en
// Vitest. Cada prueba que lo necesita lo reemplaza con `vi.mock("virtual:pwa-register", …)`.
export function registerSW(): () => Promise<void> {
  throw new Error("virtual:pwa-register no está disponible en pruebas: usa vi.mock");
}
