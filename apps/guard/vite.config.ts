import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Los colores del manifiesto salen del tema generado desde docs/brand/tokens.css (sin hex sueltos).
const theme = readFileSync(new URL("../../packages/ui/src/theme.css", import.meta.url), "utf-8");
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`).exec(theme);
  if (!match?.[1]) throw new Error(`Falta el token --${name} en packages/ui/src/theme.css`);
  return match[1];
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // `prompt`: una versión nueva espera y nunca recarga la app en pleno turno (OFF-09).
      // La política completa de actualización llega con FR-06d.
      registerType: "prompt",
      manifest: {
        id: "/",
        name: "Atrio Garita",
        short_name: "Atrio",
        description: "Validación de accesos en la garita, también sin conexión.",
        lang: "es-GT",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: token("anil-600"),
        background_color: token("cal"),
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        // Solo el shell estático (precaché). Sin `runtimeCaching`: nunca se cachean respuestas
        // de la API (OFF-01) y una navegación a /api/ no se resuelve con index.html.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      // Los íconos ya entran por `globPatterns`; evita que figuren dos veces en el precaché.
      includeManifestIcons: false,
    }),
  ],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
});
