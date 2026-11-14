import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const scriptPath = fileURLToPath(import.meta.url);

export const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");

export const builtins = new Set(
  builtinModules.flatMap((name) => [name, `node:${name}`]),
);

export const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  ".riebeckite",
  ".wrangler",
  ".git",
  "coverage",
  "templates",
  "fixtures",
  "fixture",
  "__fixtures__",
  "__golden__",
  "golden",
  "snapshots",
  "vendor",
]);

export const workspacePatterns = [
  "packages/*",
  "packages/integrations/*",
  "packages/plugins/*",
  "packages/themes/*",
  "website",
];

export const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

export const allowedPluginDependencies = new Map([
  [
    "@riebeckite/plugin-article-metadata",
    new Set(["@riebeckite/plugin-taxonomy"]),
  ],
  ["@riebeckite/plugin-docs", new Set(["@riebeckite/plugin-navigation"])],
]);

export const packageKinds = new Map([
  ["@riebeckite/core", "core"],
  ["@riebeckite/cli", "cli"],
  ["@riebeckite/node", "library"],
  ["@riebeckite/ui", "library"],
  ["@riebeckite/diagnostics", "library"],
  ["@riebeckite/diagram", "library"],
  ["@riebeckite/graph", "library"],
  ["@riebeckite/git-history", "library"],
  ["@riebeckite/preview", "library"],
  ["@riebeckite/runtime", "library"],
  ["@riebeckite/spa", "library"],
  ["@riebeckite/test", "test"],
]);

export const nonImportedDependencies = new Map([
  [
    "@riebeckite/cli",
    new Set([
      "@hono/vite-build", // generated vite.config for new sites
      "esbuild", // external at bundle time, used by build tooling
      "hono", // generated app routes and types
      "honox", // generated app routes and vite plugin
      "vite", // loaded from the user's site at dev/build time
    ]),
  ],
  ["@riebeckite/plugin-d2", new Set(["@d2lang/d2"])], // WASM engine loaded by module name
  ["@riebeckite/plugin-diff", new Set(["hono"])], // JSX runtime via jsxImportSource
  [
    "@riebeckite/plugin-excalidraw",
    new Set([
      "@excalidraw/excalidraw", // browser renderer resolved by package name
      "esbuild", // bundler loaded by name
      "lz-string", // browser module loaded by name
    ]),
  ],
  ["@riebeckite/plugin-icons", new Set(["lucide-static"])], // icon files read from the package
  [
    "@riebeckite/plugin-markmap",
    new Set(["markmap-lib", "markmap-view"]), // client renderer loaded by name
  ],
  ["@riebeckite/plugin-mermaid", new Set(["mermaid"])], // client renderer loaded by name
  ["@riebeckite/plugin-og-image", new Set(["hono"])], // JSX runtime via jsxImportSource
  ["@riebeckite/plugin-qr-code", new Set(["qrcode"])], // encoder loaded by name
  ["@riebeckite/plugin-search", new Set(["hono"])], // JSX runtime via jsxImportSource
  ["@riebeckite/web", new Set(["lz-string", "slugify"])], // Vite SSR externals resolved by package name
]);
