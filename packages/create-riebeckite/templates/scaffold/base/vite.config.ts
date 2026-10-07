import build from "@hono/vite-build/node";
import { riebeckiteVite } from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
    ...riebeckiteVite(),
    build(),
  ],
});
