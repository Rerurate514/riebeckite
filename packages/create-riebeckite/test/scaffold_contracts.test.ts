import assert from "node:assert/strict";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createLogger,
  type PackageSpec,
  type PackedPackages,
  packPackages,
  writeFileDependencies,
} from "@riebeckite/test/e2e";
import { build as buildWithEsbuild } from "esbuild";
import { scaffoldRiebeckiteSite } from "../src/scaffold/index.js";
import { SCAFFOLD_PRESET_NAMES } from "../src/scaffold/presets.js";
import {
  DEFAULT_PRESET,
  GITHUB_ACTIONS_SECRETS,
  GITIGNORE_FORBIDDEN,
  GITIGNORE_REQUIRED,
  LOCKFILE_NAME,
  STARTER_LANGUAGES,
  WRANGLER_DEFAULTS,
} from "../src/scaffold/wrangler-defaults.js";

/**
 * Contract tests that verify the generated scaffold matches documentation expectations.
 * These tests prevent drift between implementation, scaffold output, and Getting Started docs.
 */

async function withTemporaryDirectory(
  callback: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-contract-"),
  );
  try {
    await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function generateStarterSite(targetDirectory: string) {
  await scaffoldRiebeckiteSite({
    targetDirectory,
    preset: DEFAULT_PRESET,
    githubActions: true,
    locale: "en", // Ensure default locale is en
  });
}

async function readFile(
  root: string,
  relativePath: string,
): Promise<string | null> {
  const fullPath = path.join(root, relativePath);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch {
    return null;
  }
}

async function readJson<T>(
  root: string,
  relativePath: string,
): Promise<T | null> {
  const content = await readFile(root, relativePath);
  if (!content) return null;
  return JSON.parse(content) as T;
}

async function fileExists(
  root: string,
  relativePath: string,
): Promise<boolean> {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function dirExists(root: string, relativePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(root, relativePath));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

interface GeneratedManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function readGeneratedManifest(
  siteDir: string,
): Promise<GeneratedManifest> {
  return JSON.parse(
    await fs.readFile(path.join(siteDir, "package.json"), "utf8"),
  ) as GeneratedManifest;
}

async function findWorkspacePackages(): Promise<Map<string, string>> {
  const packages = new Map<string, string>();
  const walk = async (relative: string): Promise<void> => {
    const absolute = path.join(REPO_ROOT, relative);
    const entries = await fs.readdir(absolute, { withFileTypes: true });
    if (
      entries.some((entry) => entry.isFile() && entry.name === "package.json")
    ) {
      const manifest = JSON.parse(
        await fs.readFile(path.join(absolute, "package.json"), "utf8"),
      ) as GeneratedManifest;
      if (manifest.name) packages.set(manifest.name, relative);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await walk(path.join(relative, entry.name));
    }
  };
  await walk("packages");
  return packages;
}

async function collectStarterClosure(
  siteDir: string,
): Promise<readonly PackageSpec[]> {
  const nameToDirectory = await findWorkspacePackages();
  const siteManifest = await readGeneratedManifest(siteDir);
  const seeds = [
    ...Object.keys(siteManifest.dependencies ?? {}),
    ...Object.keys(siteManifest.devDependencies ?? {}),
  ].filter(
    (name) => name.startsWith("@riebeckite/") || name === "create-riebeckite",
  );
  const seen = new Set<string>();
  const specs: PackageSpec[] = [];
  while (seeds.length > 0) {
    const name = seeds.shift();
    if (name === undefined || seen.has(name)) continue;
    seen.add(name);
    const directory = nameToDirectory.get(name);
    assert.ok(directory, `workspace package ${name} must exist`);
    specs.push({ name, directory });
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(REPO_ROOT, directory, "package.json"),
        "utf8",
      ),
    ) as GeneratedManifest;
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (
        (dependency.startsWith("@riebeckite/") ||
          dependency === "create-riebeckite") &&
        !seen.has(dependency)
      ) {
        seeds.push(dependency);
      }
    }
  }
  return specs;
}

let packedWorkspacePromise: Promise<PackedPackages> | undefined;

async function packStarterWorkspace(siteDir: string): Promise<PackedPackages> {
  const tarballDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-scaffold-packs-"),
  );
  const packages = await collectStarterClosure(siteDir);
  return packPackages(tarballDir, {
    repoRoot: REPO_ROOT,
    packages,
    concurrency: 1,
    logger: createLogger("scaffold-contract"),
  });
}

async function assertRegistryArtifacts(siteDir: string): Promise<void> {
  const manifest = await readGeneratedManifest(siteDir);
  const declared: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  const { execSync } = await import("node:child_process");
  for (const [name, range] of Object.entries(declared)) {
    if (!name.startsWith("@riebeckite/")) continue;
    execSync(`npm view ${name}@${range} version`, {
      cwd: siteDir,
      stdio: "pipe",
    });
  }
}

async function prepareGeneratedSiteInstall(siteDir: string): Promise<void> {
  if (process.env.RIEBECKITE_REGISTRY_E2E === "1") {
    await assertRegistryArtifacts(siteDir);
    return;
  }
  packedWorkspacePromise ??= packStarterWorkspace(siteDir);
  writeFileDependencies(siteDir, await packedWorkspacePromise);
}

// =============================================================================
// CONTRACT 1: Scaffold can actually build
// =============================================================================

test("Contract 1: generated starter site installs and builds successfully", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    // Verify package.json has npm scripts that work
    const pkg = await readJson<{ scripts: Record<string, string> }>(
      targetDir,
      "package.json",
    );
    assert.ok(pkg, "package.json must exist");
    assert.ok(pkg?.scripts?.dev, "dev script must exist");
    assert.ok(pkg?.scripts?.build, "build script must exist");
    assert.ok(pkg?.scripts?.check, "check script must exist");
    assert.ok(pkg?.scripts?.doctor, "doctor script must exist");

    // Run npm install
    const { execSync } = await import("node:child_process");
    await prepareGeneratedSiteInstall(targetDir);
    execSync("npm install", { cwd: targetDir, stdio: "pipe" });

    // Verify lockfile was created
    assert.ok(
      await fileExists(targetDir, LOCKFILE_NAME),
      `${LOCKFILE_NAME} must be created by npm install`,
    );

    // Run check command
    execSync("npm exec riebeckite check", { cwd: targetDir, stdio: "pipe" });

    // Run build command
    execSync("npm exec riebeckite build", { cwd: targetDir, stdio: "pipe" });

    // Verify critical build outputs exist
    // Default locale (en) content is at root (e.g., dist/examples.html, dist/guide.html)
    // Other locales have their own folders (dist/ja/index.html, etc.)
    assert.ok(
      await fileExists(targetDir, "dist/examples.html"),
      "dist/examples.html must exist (default locale content)",
    );
    assert.ok(
      await fileExists(targetDir, "dist/sitemap.xml"),
      "dist/sitemap.xml must exist after build",
    );
    assert.ok(
      await fileExists(targetDir, "dist/robots.txt"),
      "dist/robots.txt must exist after build",
    );
    assert.ok(
      await dirExists(targetDir, "dist/assets"),
      "dist/assets directory must exist after build",
    );
    // Verify at least one localized index exists
    assert.ok(
      await fileExists(targetDir, "dist/ja/index.html"),
      "dist/ja/index.html must exist (localized content)",
    );

    const guideHtml = await readFile(targetDir, "dist/guide.html");
    assert.ok(guideHtml, "dist/guide.html must exist");
    assert.ok(
      guideHtml?.includes("rr-search"),
      "generated site must render the search plugin UI",
    );
    assert.ok(
      guideHtml?.includes("rr-table-of-contents"),
      "generated site must render the table of contents",
    );
  });
});

// =============================================================================
// CONTRACT 2: Starter files match documentation
// =============================================================================

test("Contract 2: starter preset generates exact content files documented in Getting Started", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    // Verify base files exist (these are the files Getting Started documents)
    const expectedBaseFiles = [
      "content/index.md",
      "content/guide.md",
      "content/examples.md",
      "content/notes/planning.md",
      "content/notes/writing.md",
    ];
    for (const file of expectedBaseFiles) {
      assert.ok(
        await fileExists(targetDir, file),
        `Starter content file ${file} must exist`,
      );
    }

    // Verify localized variants: index and examples get all languages, guide and notes do not
    // This matches the scaffold's actual behavior (see content-pages.ts)
    const localizedFiles = [
      // index.md gets all languages
      "content/index.ja.md",
      "content/index.zh-CN.md",
      "content/index.es.md",
      "content/index.de.md",
      "content/index.fr.md",
      "content/index.ko.md",
      // examples.md gets all languages
      "content/examples.ja.md",
      "content/examples.zh-CN.md",
      "content/examples.es.md",
      "content/examples.de.md",
      "content/examples.fr.md",
      "content/examples.ko.md",
    ];
    for (const file of localizedFiles) {
      assert.ok(
        await fileExists(targetDir, file),
        `Localized content file ${file} must exist`,
      );
    }

    // Verify guide.md does NOT have localized variants (current scaffold behavior)
    for (const lang of STARTER_LANGUAGES) {
      if (lang === "en") continue;
      const localizedFile = `content/guide.${lang}.md`;
      assert.ok(
        !(await fileExists(targetDir, localizedFile)),
        `guide.md must not have ${localizedFile} (current behavior)`,
      );
    }

    // Verify notes/* do NOT have localized variants (current scaffold behavior)
    for (const note of ["planning", "writing"]) {
      for (const lang of STARTER_LANGUAGES) {
        if (lang === "en") continue;
        const localizedFile = `content/notes/${note}.${lang}.md`;
        assert.ok(
          !(await fileExists(targetDir, localizedFile)),
          `notes/${note}.md must not have ${localizedFile} (current behavior)`,
        );
      }
    }

    // Verify no .en.md files exist (base file is unsuffixed)
    for (const file of expectedBaseFiles) {
      const enFile = file.replace(".md", ".en.md");
      assert.ok(
        !(await fileExists(targetDir, enFile)),
        `Must not generate ${enFile} (base file is unsuffixed)`,
      );
    }
  });
});

test("Contract 2b: Getting Started first-post example matches actual generated structure", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    // Verify the exact path structure documented in quick-start.md
    // content/first-post.md should work when created by user
    const _contentDir = path.join(targetDir, "content");
    assert.ok(
      await dirExists(targetDir, "content"),
      "content/ directory must exist",
    );

    // The starter preset generates these specific files (from presets.ts)
    assert.ok(
      await fileExists(targetDir, "content/index.md"),
      "content/index.md (base) must exist",
    );
    assert.ok(
      await fileExists(targetDir, "content/index.ja.md"),
      "content/index.ja.md must exist",
    );
    assert.ok(
      await fileExists(targetDir, "content/guide.md"),
      "content/guide.md must exist",
    );
    assert.ok(
      await fileExists(targetDir, "content/examples.md"),
      "content/examples.md must exist",
    );
    assert.ok(
      await fileExists(targetDir, "content/notes/planning.md"),
      "content/notes/planning.md must exist",
    );
    assert.ok(
      await fileExists(targetDir, "content/notes/writing.md"),
      "content/notes/writing.md must exist",
    );
  });
});

// =============================================================================
// CONTRACT 3: Package manager consistency
// =============================================================================

test("Contract 3: generated site uses npm consistently across all touchpoints", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    // Check generated README.md uses npm
    const readme = await readFile(targetDir, "README.md");
    assert.ok(readme, "README.md must exist");

    // Should contain npm install, not pnpm install
    assert.ok(
      readme?.includes("npm install"),
      "README must contain 'npm install'",
    );
    assert.ok(
      !readme?.includes("pnpm install"),
      "README must not contain 'pnpm install'",
    );

    // Should contain npm exec riebeckite, not pnpm exec riebeckite
    assert.ok(
      readme?.includes("npm exec riebeckite"),
      "README must contain 'npm exec riebeckite'",
    );
    assert.ok(
      !readme?.includes("pnpm exec riebeckite"),
      "README must not contain 'pnpm exec riebeckite'",
    );

    // Check GitHub Actions workflow uses npm
    const workflow = await readFile(targetDir, ".github/workflows/deploy.yml");
    assert.ok(workflow, "deploy.yml must exist when githubActions: true");
    assert.ok(workflow?.includes("cache: npm"), "workflow must use npm cache");
    assert.ok(workflow?.includes("npm ci"), "workflow must use npm ci");
    assert.ok(
      workflow?.includes("npm exec riebeckite"),
      "workflow must use npm exec riebeckite",
    );
    assert.ok(!workflow?.includes("pnpm"), "workflow must not reference pnpm");

    // Check CLI next-steps use npm (formatScaffoldNextSteps)
    const _nextSteps = await readFile(targetDir, ".riebeckite/NEXT_STEPS.md");
    // Note: next-steps are printed to console, not written to file
    // We verify via the scaffold source in a different test
  });
});

test("Contract 3b: scaffold CLI prints npm commands in next steps", async () => {
  // This verifies the source of truth for CLI output
  // The formatScaffoldNextSteps function in next-steps.ts is the canonical source
  const { formatScaffoldNextSteps } = await import(
    "../src/scaffold/next-steps.js"
  );
  const steps = formatScaffoldNextSteps("my-site");

  assert.ok(
    steps.includes("npm install"),
    "CLI next steps must include 'npm install'",
  );
  assert.ok(
    steps.includes("npm exec riebeckite check"),
    "CLI next steps must include 'npm exec riebeckite check'",
  );
  assert.ok(
    steps.includes("npm exec riebeckite dev"),
    "CLI next steps must include 'npm exec riebeckite dev'",
  );
  assert.ok(
    steps.includes("npm exec riebeckite build"),
    "CLI next steps must include 'npm exec riebeckite build'",
  );

  assert.ok(!steps.includes("pnpm"), "CLI next steps must not mention pnpm");
});

// =============================================================================
// CONTRACT 4: npm argument forwarding
// =============================================================================

test("Contract 4: documented npm exec commands properly forward flags to Riebeckite CLI", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const { execSync } = await import("node:child_process");

    // Install dependencies first
    await prepareGeneratedSiteInstall(targetDir);
    execSync("npm install", { cwd: targetDir, stdio: "pipe" });

    // Test that --list flag reaches Riebeckite CLI (not consumed by npm)
    // Using npm exec -- ensures flags are forwarded
    const output = execSync("npm exec -- riebeckite inspect content --list", {
      cwd: targetDir,
      encoding: "utf8",
    });

    // Should list content entries, not show npm warning
    assert.ok(
      output.includes("Entries"),
      "inspect content --list should show Entries count",
    );
    assert.ok(
      !output.includes("npm warn"),
      "npm should not warn about unknown config",
    );

    // Test check command works
    const checkOutput = execSync("npm exec -- riebeckite check", {
      cwd: targetDir,
      encoding: "utf8",
    });
    assert.ok(
      checkOutput.includes("No problems found"),
      "check should report no configuration problems",
    );
  });
});

test("Contract 4b: documentation uses npm exec -- for commands with flags", async () => {
  const docsRoot = path.resolve(import.meta.dirname, "..", "..", "..", "docs");
  const markdownFiles = await collectMarkdownFiles(docsRoot);
  const offenders: string[] = [];

  for (const file of markdownFiles) {
    const content = await fs.readFile(file, "utf8");
    const lines = content.split("\n");
    for (const [index, line] of lines.entries()) {
      const command = line.trim().replace(/^[$>]\s*/, "");
      if (/^npm exec riebeckite\b.*\s--[\w-]+/.test(command)) {
        offenders.push(
          `${path.relative(process.cwd(), file)}:${index + 1}: ${command}`,
        );
      }
    }
  }

  assert.deepEqual(offenders, []);
});

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(fullPath);
      if (entry.isFile() && entry.name.endsWith(".md")) return [fullPath];
      return [];
    }),
  );
  return files.flat();
}

// =============================================================================
// CONTRACT 5: Wrangler configuration
// =============================================================================

test("Contract 5: generated wrangler.jsonc matches canonical defaults", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const wranglerContent = await readFile(targetDir, "wrangler.jsonc");
    assert.ok(wranglerContent, "wrangler.jsonc must be generated");

    const wrangler = JSON.parse(wranglerContent);

    // Verify all canonical fields match
    assert.equal(wrangler.$schema, WRANGLER_DEFAULTS.$schema);
    assert.equal(wrangler.name, WRANGLER_DEFAULTS.name);
    assert.equal(
      wrangler.compatibility_date,
      WRANGLER_DEFAULTS.compatibility_date,
    );
    assert.deepEqual(
      wrangler.compatibility_flags,
      WRANGLER_DEFAULTS.compatibility_flags,
    );
    assert.deepEqual(wrangler.assets, WRANGLER_DEFAULTS.assets);
  });
});

test("Contract 5b: template wrangler.jsonc matches canonical defaults", async () => {
  // Template is at repo root: templates/cloudflare/wrangler.jsonc
  // Test runs from packages/create-riebeckite/test, so go up 3 levels to repo root
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const templatePath = path.join(
    repoRoot,
    "templates",
    "cloudflare",
    "wrangler.jsonc",
  );
  const templateContent = await fs.readFile(templatePath, "utf8");

  // Strip comments (JSONC) before parsing
  const jsonContent = templateContent
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const template = JSON.parse(jsonContent);

  // Template should match the same defaults (name may differ as placeholder)
  assert.equal(template.$schema, WRANGLER_DEFAULTS.$schema);
  assert.equal(
    template.compatibility_date,
    WRANGLER_DEFAULTS.compatibility_date,
  );
  assert.deepEqual(
    template.compatibility_flags,
    WRANGLER_DEFAULTS.compatibility_flags,
  );
  assert.deepEqual(template.assets, WRANGLER_DEFAULTS.assets);
});

// =============================================================================
// CONTRACT 6: GitHub Actions scaffold secrets
// =============================================================================

test("Contract 6: generated workflow includes required secret names", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const workflow = await readFile(targetDir, ".github/workflows/deploy.yml");
    assert.ok(workflow, "deploy.yml must exist");

    // Required secrets for basic deployment
    assert.ok(
      workflow.includes(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN),
      `workflow must reference ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_API_TOKEN}`,
    );
    assert.ok(
      workflow.includes(GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID),
      `workflow must reference ${GITHUB_ACTIONS_SECRETS.CLOUDFLARE_ACCOUNT_ID}`,
    );

    // Verify secret references use the correct format
    assert.ok(
      workflow.includes("secrets.CLOUDFLARE_API_TOKEN"),
      "must use secrets.CLOUDFLARE_API_TOKEN",
    );
    assert.ok(
      workflow.includes("secrets.CLOUDFLARE_ACCOUNT_ID"),
      "must use secrets.CLOUDFLARE_ACCOUNT_ID",
    );
  });
});

test("Contract 6b: external content workflow includes additional secrets", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await scaffoldRiebeckiteSite({
      targetDirectory: targetDir,
      preset: DEFAULT_PRESET,
      githubActions: true,
      contentRepository: "octo-org/notes",
      siteRepository: "octo-org/site",
    });

    const workflow = await readFile(targetDir, ".github/workflows/deploy.yml");
    assert.ok(workflow, "deploy.yml must exist");

    // External content requires additional secret
    assert.ok(
      workflow.includes(GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN),
      `external content workflow must reference ${GITHUB_ACTIONS_SECRETS.RIEBECKITE_CONTENT_READ_TOKEN}`,
    );

    const notify = await readFile(targetDir, "github/notify-site.yml");
    assert.ok(notify, "notify-site.yml must exist for external content");
    assert.ok(
      notify.includes(GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN),
      `notify-site.yml must reference ${GITHUB_ACTIONS_SECRETS.SITE_DISPATCH_TOKEN}`,
    );
  });
});

// =============================================================================
// CONTRACT 7: Git / generated .gitignore
// =============================================================================

test("Contract 7: generated .gitignore excludes build artifacts but keeps lockfile", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const gitignore = await readFile(targetDir, ".gitignore");
    assert.ok(gitignore, ".gitignore must exist");

    // Required exclusions
    for (const pattern of GITIGNORE_REQUIRED) {
      assert.ok(
        gitignore?.includes(pattern),
        `.gitignore must exclude ${pattern}`,
      );
    }

    // Must NOT exclude lockfile
    for (const pattern of GITIGNORE_FORBIDDEN) {
      assert.ok(
        !gitignore?.includes(pattern),
        `.gitignore must not exclude ${pattern} (needed for npm ci)`,
      );
    }
  });
});

// =============================================================================
// CONTRACT 8: First content build
// =============================================================================

test("Contract 8: first content page builds to expected output path", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const { execSync } = await import("node:child_process");

    // Install and build
    await prepareGeneratedSiteInstall(targetDir);
    execSync("npm install", { cwd: targetDir, stdio: "pipe" });

    // Create the first-post.md as documented in Getting Started
    const firstPost = `---
title: First post
publish: true
---

# First post

Hello Riebeckite.
`;
    await fs.writeFile(
      path.join(targetDir, "content", "first-post.md"),
      firstPost,
    );

    // Build
    execSync("npm exec riebeckite build", { cwd: targetDir, stdio: "pipe" });

    // Verify output exists at expected path
    assert.ok(
      await fileExists(targetDir, "dist/first-post.html"),
      "dist/first-post.html must exist after building first-post.md",
    );

    // Verify content was rendered
    const outputHtml = await readFile(targetDir, "dist/first-post.html");
    assert.ok(outputHtml, "first-post.html must be readable");
    assert.ok(
      outputHtml?.includes("Hello Riebeckite"),
      "output must contain article body",
    );
  });
});

// =============================================================================
// CONTRACT 9: frontmatter title behavior
// =============================================================================

test("Contract 9: frontmatter title is metadata, not visible heading", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const { execSync } = await import("node:child_process");

    await prepareGeneratedSiteInstall(targetDir);
    execSync("npm install", { cwd: targetDir, stdio: "pipe" });

    // Create article with frontmatter title but NO body heading
    const articleNoHeading = `---
title: Frontmatter Title Only
publish: true
---

Body text without heading.
`;
    await fs.writeFile(
      path.join(targetDir, "content", "no-heading.md"),
      articleNoHeading,
    );

    execSync("npm exec riebeckite build", { cwd: targetDir, stdio: "pipe" });

    const outputHtml = await readFile(targetDir, "dist/no-heading.html");
    assert.ok(outputHtml, "output must exist");

    // The <title> tag should be the SITE title, not the frontmatter title
    // (Current behavior: site title from config, not frontmatter)
    // The frontmatter title is used for SEO/listings/feeds but not for <title> or <h1>
    assert.ok(outputHtml?.includes("<title>"), "page must have <title> tag");

    // Body heading must come from markdown body (# Heading), not frontmatter
    assert.ok(
      !outputHtml?.includes("<h1>Frontmatter Title Only</h1>"),
      "frontmatter title must not render as <h1>",
    );

    // Now test WITH a body heading
    const articleWithHeading = `---
title: Frontmatter Title
publish: true
---

# Body Heading

Body text.
`;
    await fs.writeFile(
      path.join(targetDir, "content", "with-heading.md"),
      articleWithHeading,
    );

    execSync("npm exec riebeckite build", { cwd: targetDir, stdio: "pipe" });

    const outputHtml2 = await readFile(targetDir, "dist/with-heading.html");
    assert.ok(outputHtml2, "output must exist");
    assert.ok(
      outputHtml2?.includes("<h1"),
      "body # heading must render as <h1>",
    );
    assert.ok(
      outputHtml2?.includes("Body Heading"),
      "body heading text must appear in output",
    );
  });
});

// =============================================================================
// CONTRACT 10: Documentation paths and links (reuse existing check_docs)
// =============================================================================

test("Contract 10: Getting Started documentation links are valid", () => {
  // This is verified by scripts/check_docs.mjs which runs in CI
  // We just ensure the key Getting Started files exist
  // Test runs from packages/create-riebeckite/test, so go up 3 levels to repo root
  const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
  const gettingStartedFiles = [
    "docs/ja/docs/getting-started/README.md",
    "docs/ja/docs/getting-started/quick-start.md",
    "docs/ja/docs/getting-started/installation.md",
    "docs/ja/docs/getting-started/first-content.md",
    "docs/ja/docs/getting-started/deployment.md",
    "docs/ja/docs/getting-started/presets.md",
    "docs/ja/docs/guides/deployment/cloudflare-workers.md",
    "docs/ja/docs/guides/deployment/github-actions.md",
    "docs/ja/docs/guides/deployment/separate-content-repository.md",
  ];

  for (const file of gettingStartedFiles) {
    const fullPath = path.join(repoRoot, file);
    assert.ok(
      fsSync.existsSync(fullPath),
      `Getting Started file ${file} must exist`,
    );
  }
});

// =============================================================================
// CONTRACT 11: Every preset's generated sources compile
// =============================================================================

test("Contract 11: every preset's generated sources compile", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    for (const preset of SCAFFOLD_PRESET_NAMES) {
      const targetDir = path.join(tmpDir, preset);
      await scaffoldRiebeckiteSite({ targetDirectory: targetDir, preset });
      const entryPoints = [
        ...(await collectTypeScriptSources(path.join(targetDir, "app"))),
        path.join(targetDir, "riebeckite.config.ts"),
        path.join(targetDir, "vite.config.ts"),
      ];
      await buildWithEsbuild({
        absWorkingDir: targetDir,
        entryPoints,
        bundle: true,
        write: false,
        outdir: "esbuild-out",
        packages: "external",
        external: ["virtual:*"],
        platform: "node",
        format: "esm",
        jsx: "automatic",
        jsxImportSource: "hono/jsx",
        logLevel: "silent",
      });
    }
  });
});

// =============================================================================
// CONTRACT 12: generated routes supply the current content language
// =============================================================================

test("Contract 12: generated routes derive htmlLanguage from the content entry", async () => {
  await withTemporaryDirectory(async (tmpDir) => {
    const targetDir = path.join(tmpDir, "test-site");
    await generateStarterSite(targetDir);

    const indexRoute = await readFile(targetDir, "app/routes/index.tsx");
    assert.ok(
      indexRoute?.includes(
        'import { getEntryLanguage } from "@riebeckite/core";',
      ),
      "index route must import getEntryLanguage",
    );
    assert.ok(
      indexRoute?.includes(
        'c.set("htmlLanguage", getEntryLanguage(indexEntry));',
      ),
      "index route must derive htmlLanguage from the content entry",
    );

    const slugRoute = await readFile(targetDir, "app/routes/[slug{.+}].tsx");
    assert.ok(
      slugRoute?.includes(
        'import { getEntryLanguage } from "@riebeckite/core";',
      ),
      "slug route must import getEntryLanguage",
    );
    assert.ok(
      slugRoute?.includes(
        'c.set("htmlLanguage", getEntryLanguage(route.entry));',
      ),
      "slug route must derive htmlLanguage from the content entry",
    );

    const slugSource = slugRoute ?? "";
    const pageBranch = slugSource.slice(
      slugSource.indexOf('if (route.kind === "page")'),
      slugSource.indexOf("const post ="),
    );
    assert.ok(
      pageBranch.includes('c.set("htmlLanguage", route.page.language);'),
      "plugin page routes must surface the language resolved by the page type",
    );
  });
});

async function collectTypeScriptSources(directory: string): Promise<string[]> {
  const sources: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...(await collectTypeScriptSources(fullPath)));
    } else if (/\.[cm]?tsx?$/.test(entry.name)) {
      sources.push(fullPath);
    }
  }
  return sources;
}
