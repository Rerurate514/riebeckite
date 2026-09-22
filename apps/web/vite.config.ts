import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import { defaultOptions } from "@hono/vite-dev-server";
import adapter from "@hono/vite-dev-server/cloudflare";
import ssg from "@hono/vite-ssg";
import tailwindcss from "@tailwindcss/vite";
import honox from "honox/vite";
import { defineConfig } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const coreEntry = path.resolve(webRoot, "../../packages/core/index.ts");
const autoCardLinkEntry = path.resolve(
  webRoot,
  "../../packages/plugin-autocardlink/index.ts",
);
const autoCardLinkStyle = path.resolve(
  webRoot,
  "../../packages/plugin-autocardlink/style.css",
);
const codeEnhanceEntry = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/index.ts",
);
const codeEnhanceClientEntry = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/client.ts",
);
const codeEnhanceStyle = path.resolve(
  webRoot,
  "../../packages/plugin-code-enhance/style.css",
);
const lightboxEntry = path.resolve(
  webRoot,
  "../../packages/plugin-lightbox/index.ts",
);
const lightboxStyle = path.resolve(
  webRoot,
  "../../packages/plugin-lightbox/style.css",
);
const mermaidEntry = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/index.ts",
);
const mermaidClientEntry = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/client.ts",
);
const mermaidStyle = path.resolve(
  webRoot,
  "../../packages/plugin-mermaid/style.css",
);
const diagnosticsEntry = path.resolve(
  webRoot,
  "../../packages/plugin-diagnostics/index.ts",
);
const seoEntry = path.resolve(webRoot, "../../packages/plugin-seo/index.ts");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@riebeckite\/core$/, replacement: coreEntry },
      {
        find: /^@riebeckite\/plugin-autocardlink$/,
        replacement: autoCardLinkEntry,
      },
      {
        find: /^@riebeckite\/plugin-autocardlink\/style\.css$/,
        replacement: autoCardLinkStyle,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance$/,
        replacement: codeEnhanceEntry,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance\/client$/,
        replacement: codeEnhanceClientEntry,
      },
      {
        find: /^@riebeckite\/plugin-code-enhance\/style\.css$/,
        replacement: codeEnhanceStyle,
      },
      {
        find: /^@riebeckite\/plugin-lightbox$/,
        replacement: lightboxEntry,
      },
      {
        find: /^@riebeckite\/plugin-lightbox\/style\.css$/,
        replacement: lightboxStyle,
      },
      {
        find: /^@riebeckite\/plugin-mermaid$/,
        replacement: mermaidEntry,
      },
      {
        find: /^@riebeckite\/plugin-mermaid\/client$/,
        replacement: mermaidClientEntry,
      },
      {
        find: /^@riebeckite\/plugin-mermaid\/style\.css$/,
        replacement: mermaidStyle,
      },
      {
        find: /^@riebeckite\/plugin-diagnostics$/,
        replacement: diagnosticsEntry,
      },
      {
        find: /^@riebeckite\/plugin-seo$/,
        replacement: seoEntry,
      },
    ],
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
          "parse-numeric-range",
          "mermaid",
          "slugify",
          "vfile-matter",
        ],
      },
    },
  },
});
