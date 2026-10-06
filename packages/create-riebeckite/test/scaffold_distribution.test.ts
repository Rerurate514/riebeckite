import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createLogger,
  type PackageSpec,
  packPackages,
  run,
  writeFileDependencies,
} from "@riebeckite/test/e2e";
import { resolveTemplateRoot } from "../src/scaffold/template-loader.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

async function findWorkspacePackageDirectories(): Promise<Map<string, string>> {
  const directories = new Map<string, string>();
  const visit = async (relative: string): Promise<void> => {
    const absolute = path.join(REPO_ROOT, relative);
    const entries = await fsp.readdir(absolute, { withFileTypes: true });
    if (
      entries.some((entry) => entry.isFile() && entry.name === "package.json")
    ) {
      const manifest = JSON.parse(
        await fsp.readFile(path.join(absolute, "package.json"), "utf8"),
      ) as { name?: string };
      if (typeof manifest.name === "string") {
        directories.set(manifest.name, relative);
      }
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await visit(path.join(relative, entry.name));
    }
  };
  await visit("packages");
  return directories;
}

async function collectRiebeckiteClosure(
  seeds: readonly string[],
): Promise<readonly PackageSpec[]> {
  const directories = await findWorkspacePackageDirectories();
  const seen = new Set<string>();
  const specs: PackageSpec[] = [];
  const queue = [...seeds];
  while (queue.length > 0) {
    const name = queue.shift();
    if (name === undefined || seen.has(name)) continue;
    seen.add(name);
    const directory = directories.get(name);
    assert.ok(directory, `${name} must be a workspace package`);
    specs.push({ name, directory });
    const manifest = JSON.parse(
      await fsp.readFile(
        path.join(REPO_ROOT, directory, "package.json"),
        "utf8",
      ),
    ) as { dependencies?: Record<string, string> };
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (dependency.startsWith("@riebeckite/") && !seen.has(dependency)) {
        queue.push(dependency);
      }
    }
  }
  return specs;
}

test("the scaffold resolver reads templates from the create-riebeckite package", () => {
  const root = resolveTemplateRoot();
  assert.equal(
    root,
    path.join(
      REPO_ROOT,
      "packages",
      "create-riebeckite",
      "templates",
      "scaffold",
    ),
  );
  assert.ok(fs.existsSync(path.join(root, "base", "app", "server.ts")));
  assert.ok(fs.existsSync(path.join(root, "presets", "minimal")));
});

test("the production template tree lives only in create-riebeckite", () => {
  assert.ok(
    !fs.existsSync(path.join(REPO_ROOT, "packages", "cli", "templates")),
    "the CLI package must not own a second template tree",
  );
  assert.ok(
    !fs.existsSync(path.join(REPO_ROOT, "packages", "cli", "assets")),
    "the CLI package must not ship scaffold assets",
  );
  assert.ok(
    !fs.existsSync(path.join(REPO_ROOT, "templates", "scaffold")),
    "the repository root must not own the scaffold template tree",
  );
});

test("@riebeckite/cli depends on create-riebeckite as a runtime dependency", async () => {
  const manifest = JSON.parse(
    await fsp.readFile(
      path.join(REPO_ROOT, "packages", "cli", "package.json"),
      "utf8",
    ),
  ) as { dependencies?: Record<string, string> };
  assert.equal(manifest.dependencies?.["create-riebeckite"], "workspace:*");
});

test("packed @riebeckite/cli scaffolds from the installed create-riebeckite package", async () => {
  const base = await fsp.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-scaffold-distribution-"),
  );
  try {
    const tarballDir = path.join(base, "tarballs");
    await fsp.mkdir(tarballDir);
    const packages = await collectRiebeckiteClosure([
      "@riebeckite/cli",
      "create-riebeckite",
    ]);
    const packed = await packPackages(tarballDir, {
      repoRoot: REPO_ROOT,
      packages,
      concurrency: 2,
      logger: createLogger("scaffold-distribution"),
    });

    const consumerDir = path.join(base, "consumer");
    await fsp.mkdir(consumerDir);
    await fsp.writeFile(
      path.join(consumerDir, "package.json"),
      `${JSON.stringify(
        {
          name: "riebeckite-external-consumer",
          version: "0.0.0",
          private: true,
        },
        null,
        2,
      )}\n`,
    );
    writeFileDependencies(consumerDir, packed);
    run("npm", ["install", "--no-audit", "--no-fund"], { cwd: consumerDir });

    const installedTemplates = path.join(
      consumerDir,
      "node_modules",
      "create-riebeckite",
      "templates",
      "scaffold",
    );
    assert.ok(
      fs.existsSync(installedTemplates),
      "the installed create-riebeckite package must ship templates/scaffold",
    );
    assert.ok(
      !fs.existsSync(
        path.join(
          consumerDir,
          "node_modules",
          "@riebeckite",
          "cli",
          "templates",
        ),
      ),
      "the published CLI package must not ship a template tree",
    );

    const siteDir = path.join(base, "generated-site");
    const cliBin = path.join(
      consumerDir,
      "node_modules",
      "@riebeckite",
      "cli",
      "bin",
      "riebeckite.mjs",
    );
    run(process.execPath, [cliBin, "init", siteDir, "--preset", "minimal"], {
      cwd: consumerDir,
    });

    for (const relative of [
      "package.json",
      "riebeckite.config.ts",
      "app/server.ts",
      "content/index.md",
      "public/favicon.ico",
    ]) {
      assert.ok(
        fs.existsSync(path.join(siteDir, relative)),
        `${relative} must be generated`,
      );
    }

    assert.ok(
      fs
        .readFileSync(path.join(siteDir, "public", "favicon.ico"))
        .equals(
          fs.readFileSync(
            path.join(installedTemplates, "base", "public", "favicon.ico"),
          ),
        ),
      "generated assets must come from the installed create-riebeckite templates",
    );
  } finally {
    await fsp.rm(base, { recursive: true, force: true });
  }
});
