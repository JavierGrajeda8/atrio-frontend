import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { securityHeadersPlugin } from "../../packages/config/security-headers";

export default defineConfig({
  plugins: [securityHeadersPlugin("web"), react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
});
