import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
  server: { port: 5175, strictPort: true },
  preview: { port: 5175, strictPort: true },
});
