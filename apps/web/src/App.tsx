import { RouterProvider } from "@tanstack/react-router";
import type { createAppRouter } from "./routes";

export function App({ router }: { router: ReturnType<typeof createAppRouter> }) {
  return <RouterProvider router={router} />;
}
