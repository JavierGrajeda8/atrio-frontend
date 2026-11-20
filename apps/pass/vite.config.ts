import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { securityHeadersPlugin } from "../../packages/config/security-headers";

export default defineConfig({
  plugins: [securityHeadersPlugin("pass"), preact()],
  server: { port: 5175, strictPort: true },
  preview: { port: 5175, strictPort: true },
});
