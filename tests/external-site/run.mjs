#!/usr/bin/env node
/**
 * A1.6 — External Site Build E2E.
 *
 * Proves that Riebeckite can build a site that lives completely outside the
 * monorepo, using only packed tarballs published under `node_modules`.
 *
 * The generated workspace looks like:
 *
 *   <temp>/
 *   ├─ site/            (fixture/site copied here; owns node_modules)
 *   │  ├─ package.json  (rewritten with file: tarball dependencies)
 *   │  ├─ tsconfig.json (checked-in base + the `vite/client` type library,
 *   │  │                 which only exists after the isolated install)
 *   │  ├─ riebeckite.config.ts
 *   │  ├─ vite.config.ts
 *   │  └─ app/...
 *   ├─ vault/           (fixture/vault copied here; OUTSIDE the site root)
 *   └─ tarballs/        (pnpm pack output)
 *
 * It then runs `riebeckite check | doctor | inspect | build`, type-checks the
 * site with both `moduleResolution: bundler` and `NodeNext`, and confirms the
 * generated HTML contains the fixture's marker content.
 *
 * The checked-in `fixture/site/tsconfig.json` intentionally does not list
 * `vite/client`: an editor/TypeScript server would otherwise report TS2688 for
 * a type library that the fixture only gets once this script installs it. The
 * external-consumer type reference is layered on inside the isolated copy by
 * `writeExternalConsumerTsconfig`.
 *
 * Set RIEBECKITE_E2E_KEEP=1 to keep the temporary workspace for inspection.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtureRoot = path.join(here, "fixture");

const PACKAGES = [
  { directory: "packages/core", name: "@riebeckite/core" },
  { directory: "packages/cli", name: "@riebeckite/cli" },
  { directory: "packages/integrations/honox", name: "@riebeckite/honox" },
  { directory: "packages/themes/default", name: "@riebeckite/theme-default" },
  {
    directory: "packages/plugins/obsidian-markdown",
    name: "@riebeckite/plugin-obsidian-markdown",
  },
  {
    directory: "packages/plugins/autocardlink",
    name: "@riebeckite/plugin-autocardlink",
  },
  { directory: "packages/plugins/toc", name: "@riebeckite/plugin-toc" },
  {
    directory: "packages/plugins/backlinks",
    name: "@riebeckite/plugin-backlinks",
  },
  {
    directory: "packages/plugins/recent-posts",
    name: "@riebeckite/plugin-recent-posts",
  },
  { directory: "packages/plugins/search", name: "@riebeckite/plugin-search" },
];

const HOME_MARKER = "RIEBECKITE_EXTERNAL_HOME_MARKER";
const NOTE_MARKER = "RIEBECKITE_EXTERNAL_NOTE_MARKER";

const step = (message) => console.log(`\n[external-site] ${message}`);
const fail = (message) => {
  throw new Error(message);
};

/** Quote a single argv token for a shell command line. */
function quote(value) {
  const text = String(value);
  return /[\s"]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function run(command, args, options = {}) {
  const line = [command, ...args].map(quote).join(" ");
  const result = spawnSync(line, {
    shell: true,
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) {
    fail(`Failed to run: ${line}\n${result.error.message}`);
  }
  if (result.status !== 0 && !options.allowFailure) {
    fail(
      `Command failed (exit ${result.status}): ${line}\n` +
        `--- stdout ---\n${result.stdout ?? ""}\n` +
        `--- stderr ---\n${result.stderr ?? ""}`,
    );
  }
  return result;
}

function walkFiles(root, predicate = () => true) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (predicate(full)) {
        found.push(full);
      }
    }
  }
  return found;
}

function packPackages(tarballDir) {
  step(`packing ${PACKAGES.length} packages with pnpm pack`);
  const packed = new Map();

  for (const pkg of PACKAGES) {
    const packageDir = path.join(repoRoot, pkg.directory);
    if (!fs.existsSync(packageDir)) {
      fail(`Package directory is missing: ${pkg.directory}`);
    }
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
    );
    run("pnpm", ["pack", "--pack-destination", tarballDir], {
      cwd: packageDir,
    });

    const sanitized = pkg.name.replace(/^@/, "").replace(/\//g, "-");
    const tarball = path.join(
      tarballDir,
      `${sanitized}-${manifest.version}.tgz`,
    );
    if (!fs.existsSync(tarball)) {
      fail(`pnpm pack did not produce the expected tarball: ${tarball}`);
    }
    packed.set(pkg.name, { tarball, version: manifest.version });
    console.log(`  packed ${pkg.name} -> ${path.basename(tarball)}`);
  }

  return packed;
}

function writeSitePackageJson(siteDir, packed) {
  const manifestPath = path.join(siteDir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.dependencies = { ...manifest.dependencies };
  manifest.overrides = { ...manifest.overrides };

  for (const [name, info] of packed) {
    const fileSpec = `file:${path
      .relative(siteDir, info.tarball)
      .split(path.sep)
      .join("/")}`;
    manifest.dependencies[name] = fileSpec;
    // Pin transitive `@riebeckite/*` requirements (the tarballs declare the
    // published version, e.g. "0.0.1") to the local tarball so `npm install`
    // never reaches the public registry for workspace packages.
    manifest.overrides[name] = fileSpec;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Layer the external-consumer type requirements onto the checked-in base
 * tsconfig. `vite/client` is a real type library of an installed Vite site, but
 * the fixture's `node_modules` only exists after the isolated `npm install`
 * below. Keeping it out of the checked-in config keeps the repository free of
 * a spurious TS2688 while this copy still validates that `vite/client` resolves
 * like it would in any other external consumer.
 */
function writeExternalConsumerTsconfig(siteDir) {
  step("layering the external-consumer type libraries (vite/client)");
  const configPath = path.join(siteDir, "tsconfig.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const types = new Set(config.compilerOptions?.types ?? []);
  types.add("node");
  types.add("vite/client");
  config.compilerOptions = { ...config.compilerOptions, types: [...types] };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const written = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const effective = new Set(written.compilerOptions?.types ?? []);
  if (!effective.has("vite/client")) {
    fail("external-consumer tsconfig is missing the vite/client type library");
  }
  console.log(`  site/tsconfig.json types: ${[...effective].join(", ")}`);
}

function assertNoMonorepoEscapeHatches(siteDir) {
  step("checking the site for monorepo escape hatches");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(siteDir, "package.json"), "utf8"),
  );
  if (JSON.stringify(manifest).includes("workspace:")) {
    fail("site/package.json must not contain `workspace:` protocol references");
  }

  const sourceFiles = walkFiles(siteDir, (full) => {
    const rel = path.relative(siteDir, full);
    if (rel.startsWith(`node_modules${path.sep}`)) return false;
    if (rel.startsWith(`dist${path.sep}`)) return false;
    return /\.(ts|tsx|mts|cts|js|mjs|json)$/.test(full);
  });

  for (const file of sourceFiles) {
    const contents = fs.readFileSync(file, "utf8");
    if (contents.includes("workspace:")) {
      fail(`${path.relative(siteDir, file)} contains \`workspace:\``);
    }
    if (/\.\.\/\.\.\/(\.\.\/)*packages\//.test(contents)) {
      fail(`${path.relative(siteDir, file)} reaches into the monorepo \`packages/\``);
    }
  }

  if (fs.existsSync(path.join(siteDir, "packages"))) {
    fail("site must not contain a `packages/` directory");
  }
}

function assertIsolatedInstall(siteDir, tempRoot) {
  step("verifying standalone install (no pnpm/monorepo inheritance)");

  const relativeToRepo = path.relative(repoRoot, tempRoot);
  const insideRepo =
    relativeToRepo === "" ||
    (!relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo));
  if (insideRepo) {
    fail("the external workspace must live outside the Riebeckite repository");
  }

  const forbiddenState = [
    path.join(tempRoot, "pnpm-workspace.yaml"),
    path.join(tempRoot, "pnpm-lock.yaml"),
    path.join(siteDir, "pnpm-workspace.yaml"),
    path.join(siteDir, "pnpm-lock.yaml"),
    path.join(siteDir, "node_modules", ".pnpm"),
  ];
  for (const file of forbiddenState) {
    if (fs.existsSync(file)) {
      fail(
        `external site must not inherit pnpm workspace state: ${path.relative(
          tempRoot,
          file,
        )}`,
      );
    }
  }

  const nodeModules = path.join(siteDir, "node_modules");
  if (!fs.existsSync(nodeModules)) {
    fail("the isolated install did not create site/node_modules");
  }

  const viteClientTypes = path.join(nodeModules, "vite", "client.d.ts");
  if (!fs.existsSync(viteClientTypes)) {
    fail("vite/client types are missing from the isolated install");
  }

  const tsc = path.join(nodeModules, "typescript", "bin", "tsc");
  if (!fs.existsSync(tsc)) {
    fail("the isolated install has no local TypeScript compiler");
  }

  console.log(
    `  site/node_modules is local; vite/client -> ${path.relative(
      siteDir,
      viteClientTypes,
    )}`,
  );
}

function assertPublishedArtifacts(siteDir) {
  step("verifying @riebeckite/* resolves to installed tarballs only");
  const scopeDir = path.join(siteDir, "node_modules", "@riebeckite");
  if (!fs.existsSync(scopeDir)) {
    fail("no @riebeckite/* packages were installed");
  }

  for (const entry of fs.readdirSync(scopeDir)) {
    const full = path.join(scopeDir, entry);
    const real = fs.realpathSync(full);
    const relativeToRepo = path.relative(repoRoot, real);
    const insideRepo =
      relativeToRepo === "" ||
      (!relativeToRepo.startsWith("..") && !path.isAbsolute(relativeToRepo));
    if (insideRepo) {
      fail(
        `@riebeckite/${entry} resolves into the Riebeckite repository (${real}); ` +
          "the fixture must use installed tarballs only",
      );
    }
    if (fs.lstatSync(full).isSymbolicLink()) {
      fail(`@riebeckite/${entry} is a symlink; expected a real installed directory`);
    }
    console.log(`  @riebeckite/${entry} -> ${real}`);
  }
}

function runCli(siteDir, command) {
  step(`riebeckite ${command}`);
  const cli = path.join(
    siteDir,
    "node_modules",
    "@riebeckite",
    "cli",
    "bin",
    "riebeckite.mjs",
  );
  const result = run(process.execPath, [cli, ...command.split(" ")], {
    cwd: siteDir,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) console.log(output);
  return result;
}

function runTypecheck(siteDir, project) {
  step(`tsc --noEmit -p ${project}`);
  const tsc = path.join(siteDir, "node_modules", "typescript", "bin", "tsc");
  const result = run(process.execPath, [tsc, "--noEmit", "-p", project], {
    cwd: siteDir,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) console.log(output);
  return result;
}

function assertBuildOutput(siteDir) {
  step("checking generated site output");
  const distDir = path.join(siteDir, "dist");
  if (!fs.existsSync(distDir)) {
    fail("build did not create a dist/ directory");
  }

  const htmlFiles = walkFiles(distDir, (full) => full.endsWith(".html"));
  if (htmlFiles.length === 0) {
    fail("build did not emit any HTML files under dist/");
  }

  const combined = htmlFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  if (!combined.includes(HOME_MARKER)) {
    fail(`generated HTML is missing the home marker (${HOME_MARKER})`);
  }
  if (!combined.includes(NOTE_MARKER)) {
    fail(`generated HTML is missing the note marker (${NOTE_MARKER})`);
  }

  for (const file of htmlFiles) {
    console.log(`  ${path.relative(siteDir, file)}`);
  }
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-e2e-"));
  const siteDir = path.join(tempRoot, "site");
  const vaultDir = path.join(tempRoot, "vault");
  const tarballDir = path.join(tempRoot, "tarballs");
  fs.mkdirSync(tarballDir, { recursive: true });

  step(`temporary workspace: ${tempRoot}`);
  try {
    const packed = packPackages(tarballDir);

    step("copying fixture site and vault (content stays outside the site root)");
    fs.cpSync(path.join(fixtureRoot, "site"), siteDir, { recursive: true });
    fs.cpSync(path.join(fixtureRoot, "vault"), vaultDir, { recursive: true });

    writeExternalConsumerTsconfig(siteDir);
    writeSitePackageJson(siteDir, packed);

    step("npm install (tarballs + normal registry dependencies)");
    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: siteDir,
    });

    assertIsolatedInstall(siteDir, tempRoot);
    assertNoMonorepoEscapeHatches(siteDir);
    assertPublishedArtifacts(siteDir);

    runCli(siteDir, "check");
    runCli(siteDir, "doctor");
    runCli(siteDir, "inspect");
    runCli(siteDir, "build");

    assertBuildOutput(siteDir);

    runTypecheck(siteDir, "tsconfig.json");
    runTypecheck(siteDir, "tsconfig.nodenext.json");

    console.log("\n[external-site] PASS: external site built from published artifacts");
  } finally {
    if (process.env.RIEBECKITE_E2E_KEEP) {
      console.log(`\n[external-site] kept workspace: ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`\n[external-site] FAIL: ${error.message}`);
  process.exitCode = 1;
}
