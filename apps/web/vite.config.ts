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
    // The warning targets lazily loaded vendor chunks that cannot be split:
    // excalidraw ships its font-subsetting WebAssembly as one base64 module
    // (~1.8 MB) plus its own pre-bundled editor, and mermaid ships its shared
    // parser chunk. All of them are behind dynamic imports, so a tighter limit
    // would only hide the size of code the initial route never downloads.
    chunkSizeWarningLimit: 2048,
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
