import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/node";
import {
  defaultSsrExternals,
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    honox({
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    riebeckite({ appRoot }),
    build(),
    riebeckiteSsg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
    }),
  ],
  environments: {
    ssr: {
      resolve: {
        external: [...defaultSsrExternals],
      },
    },
  },
});
