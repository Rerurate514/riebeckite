import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import ssg from "@hono/vite-ssg";
import { riebeckite, riebeckiteSsgExtensionMap } from "@riebeckite/honox";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
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
    tailwindcss(),
    riebeckite({
      appRoot,
      configRoot: path.resolve(appRoot, "../.."),
      workspaceRoot: path.resolve(appRoot, "../.."),
    }),
    build(),
    ssg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
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
          "parse-numeric-range",
          "slugify",
          "vfile-matter",
        ],
      },
    },
  },
});
