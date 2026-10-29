import path from "node:path";
import { fileURLToPath } from "node:url";
import { riebeckiteVite } from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../../..");

export default defineConfig({
  server: { host: "127.0.0.1" },
  plugins: [
    honox({
      client: { input: ["/app/client.ts", "/app/style.css"] },
    }),
    ...riebeckiteVite({ appRoot, configRoot: appRoot, workspaceRoot }),
  ],
});
