import { spawn } from "node:child_process";
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
const devStartedAt = performance.now();

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
      ssg: { concurrency: 8 },
      warmContent: true,
    }),
    {
      name: "riebeckite-website:dev-warmup",
      apply: "serve",
      configureServer(server) {
        if (!server.httpServer) return;
        server.httpServer.once("listening", () => {
          const origin = server.resolvedUrls?.local?.[0];
          if (!origin) return;
          const elapsed = () =>
            `${((performance.now() - devStartedAt) / 1000).toFixed(1)}s`;
          console.log(`riebeckite: preparing the first page (${elapsed()})`);
          sendDevWarmupRequest(origin).then((status) => {
            if (status === undefined) {
              console.error(
                `riebeckite: dev server did not respond (${elapsed()})`,
              );
              return;
            }
            const suffix = status >= 400 ? ` (HTTP ${status})` : "";
            console.log(
              `riebeckite: ready at ${origin}${suffix} (${elapsed()})`,
            );
          });
        });
      },
    },
    {
      name: "riebeckite-website:build-images",
      apply: "serve",
      configureServer() {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "--conditions=source", "scripts/build_images.ts"],
          { cwd: appRoot, stdio: "inherit" },
        );
        child.on("error", (error) => {
          console.error("Failed to build content assets:", error);
        });
      },
    },
    build(),
  ],
});

async function sendDevWarmupRequest(
  origin: string,
  timeoutMs = 300_000,
): Promise<number | undefined> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      return response.status;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return undefined;
}
