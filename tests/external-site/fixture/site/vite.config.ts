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
  ]
});
