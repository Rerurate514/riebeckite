import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import ssg from "@hono/vite-ssg";
import { riebeckite } from "@riebeckite/honox";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

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
    riebeckite(),
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
          "parse-numeric-range",
          "slugify",
          "vfile-matter",
        ],
      },
    },
  },
});
