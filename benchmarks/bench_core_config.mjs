import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const {
  ContentManager,
  NoopLogger,
  SinkTracer,
  defineConfig,
  resolveConfig,
} = await import(pathToFileURL(path.join(root, "packages/core/index.ts")));
export const { FileSystemContentSource } = await import(
  pathToFileURL(path.join(root, "packages/node/index.ts"))
);

export const args = parseArgs(process.argv.slice(2));
export const profiles = listArg(args.profiles) ?? ["baseline", "realistic"];
export const sizes = (
  listArg(args.sizes) ?? ["100", "1000", "5000", "10000"]
).map(Number);
export const scenarios = listArg(args.scenarios) ?? [
  "cold",
  "warm",
  "single-edit",
  "link-edit",
  "title-edit",
  "add",
  "delete",
  "frontmatter-edit",
  "public-draft",
  "hub-edit",
  "rename",
  "asset-edit",
  "config-edit",
  "plugin-edit",
];
export const repeats = Number(args.repeats ?? 3);
export const operation = args.operation ?? "build";
if (!["build", "output-change-set"].includes(operation)) {
  throw new Error(`Unknown operation: ${operation}`);
}
export const baseDir = path.join(os.tmpdir(), "riebeckite-vault-benchmark");
export const resultsDir = args.out
  ? path.resolve(args.out)
  : path.join(root, "benchmarks", "results");

export const l10n = args.l10n
  ? (
      await import(
        pathToFileURL(path.join(root, "packages/plugins/l10n/index.ts"))
      )
    ).l10n({ defaultLang: "en", languages: ["en", "ja"] })
  : null;
