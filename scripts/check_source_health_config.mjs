import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const sourceRoots = ["packages", "website", "scripts"];

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

export const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "templates",
  "fixtures",
  "fixture",
  "__fixtures__",
  "__snapshots__",
  "snapshots",
  "migrations",
  "generated",
  "vendor",
  "test",
  "tests",
  "__tests__",
  "spec",
]);

export const ignoredFilePattern = /(^|[./_-])(test|spec)([./_-]|$)/i;

export const fileWarningLines = 400;

export const fileStrongWarningLines = 800;

export const functionWarningLines = 80;
