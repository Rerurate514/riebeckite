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
const workspaceRoot = path.resolve(appRoot, "../..");

export default defineConfig({
  build: {
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
            /\.(png|jpe?g|gif|svg|webp)$/,
            /^\/assets\/attachments\//,
          ],
        },
        client: { input: ["/app/client.ts", "/app/style.css"] },
      }),
    ),
    tailwindcss(),
    ...riebeckiteVite({
      appRoot,
      configRoot: workspaceRoot,
      workspaceRoot,
    }),
    build(),
  ],
});
