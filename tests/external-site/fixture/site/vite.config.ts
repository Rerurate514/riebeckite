import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/node";
import ssg from "@hono/vite-ssg";
import { riebeckite, riebeckiteSsgExtensionMap } from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

// This fixture deliberately lives outside the Riebeckite monorepo. It must
// resolve every Riebeckite package through node_modules only.
export default defineConfig({
  plugins: [
    honox({
      client: { input: ["/app/client.ts", "/app/style.css"] }
    }),
    // `workspaceRoot` is passed explicitly: the default (`root/../..`) assumes
    // a monorepo `packages/*` layout. See the A3/A4 root-model note in
    // tests/external-site/README.md.
    riebeckite({ appRoot, workspaceRoot: appRoot }),
    build(),
    ssg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap()
    })
  ],
  // Riebeckite Core pulls in a few CommonJS packages. Vite's SSR environment
  // must treat them as external, otherwise the SSG pass inlines and breaks on
  // `module is not defined`. This mirrors the reference app (apps/web).
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
          "vfile-matter"
        ]
      }
    }
  }
});
