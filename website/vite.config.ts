import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import {
  replaceHonoxIslandDependencyPlugin,
  riebeckiteVite,
} from "@riebeckite/honox";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = path.resolve(appRoot, "..");

export default defineConfig({
  server: {
    host: "127.0.0.1",
  },
  build: {
    // The warning targets lazily loaded vendor chunks that cannot be split:
    // mermaid ships its shared parser chunk. It is behind a dynamic import, so
    // a tighter limit would only hide the size of code the initial route never
    // downloads.
    chunkSizeWarningLimit: 2048,
    rolldownOptions: {
      checks: {
        // riebeckite-ssg renders every page inside the Vite pass, so it always
        // dominates plugin time and there is no threshold to tune.
        pluginTimings: false,
      },
    },
  },
  plugins: [
    ...replaceHonoxIslandDependencyPlugin(
      honox({
        devServer: {
          adapter,
          exclude: [
            ...defaultOptions.exclude,
            /\.(png|jpe?g|gif|svg|webp|ico)$/,
            /^\/assets\/attachments\//,
          ],
        },
        client: { input: ["/app/client.ts", "/app/style.css"] },
      }),
    ),
    tailwindcss(),
    ...riebeckiteVite({
      appRoot,
      workspaceRoot,
    }),
    build(),
  ],
});
