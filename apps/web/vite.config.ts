import build from "@hono/vite-build/cloudflare-workers";
import adapter from "@hono/vite-dev-server/cloudflare";
import { defaultOptions } from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import ssg from "@hono/vite-ssg";
import honox from "honox/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const coreEntry = path.resolve(webRoot, "../../packages/core/index.ts");

export default defineConfig({
  resolve: {
    alias: {
      "@riebeckite/core": coreEntry,
    },
  },
  plugins: [
    honox({
      devServer: {
        adapter,
        exclude: [...defaultOptions.exclude, /\.(png|jpe?g|gif|svg|webp)$/],
      },
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    tailwindcss(),
    build(),
    ssg({
      entry: "./app/server.ts",
    }),
  ],
  optimizeDeps: {
    include: ["debug"],
  },
  environments: {
    ssr: {
      resolve: {
        external: [
          "extend",
          "debug",
          "node:fs/promises",
          "node:path",
          "slugify",
          "vfile-matter",
        ],
      },
    },
  },
});
