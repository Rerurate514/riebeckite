#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type PackageSpec,
  runExternalSiteE2E,
  walkFiles,
} from "@riebeckite/test/e2e";
import { assertMetaBindBrowserBehavior } from "./browser.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");
const noBrowser = process.argv.includes("--no-browser");

const PACKAGES: PackageSpec[] = [
  { directory: "packages/core", name: "@riebeckite/core" },
  { directory: "packages/test", name: "@riebeckite/test" },
  { directory: "packages/ui", name: "@riebeckite/ui" },
  { directory: "packages/cli", name: "@riebeckite/cli" },
  {
    directory: "packages/diagnostics",
    name: "@riebeckite/diagnostics",
  },
  {
    directory: "packages/integrations/honox",
    name: "@riebeckite/honox",
  },
  { directory: "packages/spa", name: "@riebeckite/spa" },
  { directory: "packages/themes/default", name: "@riebeckite/theme-default" },
  {
    directory: "packages/plugins/color-mode",
    name: "@riebeckite/plugin-color-mode",
  },
  { directory: "packages/plugins/docs", name: "@riebeckite/plugin-docs" },
  {
    directory: "packages/plugins/obsidian-markdown",
    name: "@riebeckite/plugin-obsidian-markdown",
  },
  { directory: "packages/plugins/toc", name: "@riebeckite/plugin-toc" },
  { directory: "packages/create-riebeckite", name: "create-riebeckite" },
  {
    directory: "packages/plugins/meta-bind",
    name: "@riebeckite/plugin-meta-bind",
  },
];

function fail(message: string): never {
  throw new Error(message);
}

function assertBuildOutput(siteDir: string): void {
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) fail("build did not create dist/");

  const htmlFiles = walkFiles(distDir, (file) => file.endsWith(".html"));
  const html = new Map(
    htmlFiles.map((file) => [
      path.relative(distDir, file),
      fs.readFileSync(file, "utf8"),
    ]),
  );
  const demo = [...html.values()].find((content) =>
    content.includes("RIEBECKITE_META_BIND_DEMO"),
  );
  const other = [...html.values()].find((content) =>
    content.includes("RIEBECKITE_META_BIND_OTHER"),
  );
  if (
    ![...html.values()].some((content) =>
      content.includes("RIEBECKITE_META_BIND_HOME"),
    )
  )
    fail("home page did not render");
  if (!demo) fail("demo page did not render");
  if (!other) fail("other page did not render");
  if (!demo.includes('data-meta-bind="input"'))
    fail("demo page has no Meta Bind input");
  if (!demo.includes('data-meta-bind="view"'))
    fail("demo page has no Meta Bind view");
  if (!demo.includes("rb-meta-bind__control"))
    fail("demo page has no Meta Bind control");
  if (other.includes("data-meta-bind"))
    fail("other page unexpectedly contains Meta Bind fields");
  if (
    [...html.values()].some((content) =>
      content.includes("RIEBECKITE_META_BIND_SECRET"),
    )
  )
    fail("unreferenced frontmatter leaked into generated HTML");

  const cssFiles = walkFiles(distDir, (file) => file.endsWith(".css"));
  if (
    !cssFiles.some((file) =>
      fs.readFileSync(file, "utf8").includes(".rb-meta-bind__control"),
    )
  )
    fail("Meta Bind stylesheet was not emitted");

  const jsFiles = walkFiles(distDir, (file) => file.endsWith(".js"));
  if (
    !jsFiles.some((file) =>
      fs
        .readFileSync(file, "utf8")
        .includes("select is only supported in meta-bind code blocks"),
    )
  )
    fail("Meta Bind client module was not emitted");
}

async function main(): Promise<void> {
  await runExternalSiteE2E({
    repoRoot,
    packages: PACKAGES,
    fixture: {
      site: path.join(here, "fixture", "site"),
      vault: path.join(here, "fixture", "vault"),
    },
    dependencyCheckScript: path.join(
      repoRoot,
      "scripts",
      "check_dependencies.mjs",
    ),
    scope: "@riebeckite",
    cliName: "riebeckite",
    resolveCliEntry: (siteDir) =>
      path.join(
        siteDir,
        "node_modules",
        "@riebeckite",
        "cli",
        "bin",
        "riebeckite.mjs",
      ),
    cliCommands: [{ args: ["build"] }, { args: ["check"] }],
    typecheckProjects: [],
    assertions: { buildOutput: assertBuildOutput },
    afterSiteChecks: noBrowser
      ? undefined
      : async ({ siteDir }) => {
          await assertMetaBindBrowserBehavior(siteDir);
        },
    concurrency: 2,
    stepLabel: "meta-bind-contract",
    passMessage: noBrowser
      ? "Meta Bind integration fixture built from published artifacts"
      : "Meta Bind integration and browser fixture passed",
    keepEnv: "RIEBECKITE_META_BIND_CONTRACT_KEEP",
    tempPrefix: "riebeckite-meta-bind-",
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
