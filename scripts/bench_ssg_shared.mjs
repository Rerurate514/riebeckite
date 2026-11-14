import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const appRequire = createRequire(path.join(root, "website", "package.json"));
const { build, defineConfig } = await import(
  pathToFileURL(appRequire.resolve("vite")).href
);
const { default: honox } = await import(
  pathToFileURL(appRequire.resolve("honox/vite")).href
);
const { default: viteBuild } = await import(
  pathToFileURL(
    path.join(
      root,
      "website",
      "node_modules",
      "@hono",
      "vite-build",
      "dist",
      "adapter",
      "node",
      "index.mjs",
    ),
  ).href
);
const { riebeckiteVite } = await import(
  pathToFileURL(
    path.join(root, "packages", "integrations", "honox", "dist", "index.js"),
  ).href
);
const workRoot = path.join(
  root,
  "website",
  ".riebeckite",
  "ssg-large-vault-benchmark",
);
const sizes = parseList(process.env.RIEBECKITE_BENCH_SIZES ?? "1000,10000").map(
  Number,
);
const scenarios = new Set(
  parseList(process.env.RIEBECKITE_BENCH_SCENARIOS ?? ""),
);
const repeatCount = Number(process.env.RIEBECKITE_BENCH_REPEATS ?? "3");
const cacheStateMode = process.env.RIEBECKITE_BENCH_CACHE_STATE ?? "all";

export const entryScript = fileURLToPath(
  new URL("./benchmark_ssg_large_vault.mjs", import.meta.url),
);

export function contentStatePaths(siteRoot) {
  return [
    path.join(siteRoot, ".riebeckite", "build", "content-state.json"),
    path.join(siteRoot, "vault", ".riebeckite", "content-state.json"),
  ];
}

export function shouldRun(name) {
  return scenarios.size === 0 || scenarios.has(name);
}

export function parseList(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export {
  build,
  cacheStateMode,
  defineConfig,
  execFileAsync,
  honox,
  repeatCount,
  riebeckiteVite,
  root,
  scenarios,
  sizes,
  viteBuild,
  workRoot,
};
