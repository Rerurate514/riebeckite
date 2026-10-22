import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

await build({
  entryPoints: [path.join(appRoot, "app", "worker.ts")],
  outfile: path.join(appRoot, "dist", "worker.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  conditions: ["source", "import", "module", "default"],
  mainFields: ["module", "main"],
  resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".css", ".json"],
  external: ["node:*"],
  logLevel: "info",
});
