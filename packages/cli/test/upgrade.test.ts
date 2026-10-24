import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  collectUpgradeReport,
  runUpgradeCheck,
} from "../src/commands/upgrade.js";
import { createProcessRunner } from "../src/process_runner.js";

test("upgrade blocks a project without one supported lockfile", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-upgrade-"));
  try {
    const packageJson = '{"dependencies":{"@riebeckite/core":"^0.0.32"}}\n';
    await fs.writeFile(path.join(root, "package.json"), packageJson);

    const report = await collectUpgradeReport(
      { projectRoot: root, contentRoot: root } as never,
      "latest",
    );

    assert.equal(report.verdict, "BLOCKED");
    assert.equal(report.packageManager, undefined);
    assert.deepEqual(report.packages, ["@riebeckite/core"]);
    assert.equal(
      await fs.readFile(path.join(root, "package.json"), "utf8"),
      packageJson,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("upgrade leaves external content sources unverified", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-upgrade-"));
  const content = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-content-"),
  );
  try {
    await fs.writeFile(
      path.join(root, "package.json"),
      '{"dependencies":{"@riebeckite/core":"^0.0.32"}}\n',
    );
    await fs.writeFile(
      path.join(root, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\n",
    );

    const report = await collectUpgradeReport(
      { projectRoot: root, contentRoot: content } as never,
      "latest",
    );

    assert.equal(report.verdict, "UNVERIFIED");
    assert.match(report.notes[0] ?? "", /outside the project/);
  } finally {
    await Promise.all([
      fs.rm(root, { recursive: true, force: true }),
      fs.rm(content, { recursive: true, force: true }),
    ]);
  }
});

test("upgrade verifies local tarball candidates without changing the source project", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-upgrade-e2e-"),
  );
  try {
    const packages = path.join(root, "packages");
    const typescript = await packTypeScript(packages);
    const baseline = await packCli(packages, "1.0.0", "normal");
    const candidate = await packCli(packages, "1.0.1", "normal");
    const typecheckFailure = await packCli(packages, "1.0.2", "typecheck-fail");
    const buildFailure = await packCli(packages, "1.0.3", "build-fail");
    const changedOutput = await packCli(packages, "1.0.4", "changed-output");
    const peerConflict = await packCli(packages, "1.0.5", "normal", {
      peerDependencies: { "fixture-peer": "^2.0.0" },
    });
    const baselineFailure = await packCli(packages, "1.0.6", "build-fail");
    const peer = await packPackage(packages, "fixture-peer", "1.0.0", "");
    const temporaryBefore = await temporaryUpgradeDirectories();

    const normal = await createSite(root, baseline, typescript, peer);
    const before = await tree(normal.root);
    process.env.RIEBECKITE_UPGRADE_TEST_SECRET = "must-not-reach-build";
    let ready: Awaited<ReturnType<typeof collectUpgradeReport>>;
    try {
      ready = await collectUpgradeReport(
        normal.project,
        fileReference(candidate),
      );
    } finally {
      delete process.env.RIEBECKITE_UPGRADE_TEST_SECRET;
    }
    assert.equal(ready.verdict, "READY", JSON.stringify(ready));
    assert.deepEqual(ready.urls, { added: [], removed: [] });
    assert.deepEqual(await tree(normal.root), before);

    const missing = await collectUpgradeReport(
      normal.project,
      fileReference(path.join(packages, "missing.tgz")),
    );
    assert.equal(missing.verdict, "BLOCKED");
    assert.match(
      missing.notes.join("\n"),
      /Candidate dependency installation failed/,
    );

    const peerSite = await createSite(root, baseline, undefined, peer);
    const peerReport = await collectUpgradeReport(
      peerSite.project,
      fileReference(peerConflict),
    );
    assert.equal(peerReport.verdict, "BLOCKED");

    const typecheckSite = await createSite(root, baseline, typescript, peer);
    const typecheckReport = await collectUpgradeReport(
      typecheckSite.project,
      fileReference(typecheckFailure),
    );
    assert.equal(typecheckReport.verdict, "REVIEW REQUIRED");
    assert.equal(typecheckReport.checks[1]?.candidate, "FAIL");

    const buildSite = await createSite(root, baseline, undefined, peer);
    const buildReport = await collectUpgradeReport(
      buildSite.project,
      fileReference(buildFailure),
    );
    assert.equal(buildReport.verdict, "REVIEW REQUIRED");
    assert.equal(buildReport.checks[3]?.candidate, "FAIL");

    const baselineFailureSite = await createSite(
      root,
      baselineFailure,
      undefined,
      peer,
    );
    const baselineReport = await collectUpgradeReport(
      baselineFailureSite.project,
      fileReference(candidate),
    );
    assert.equal(baselineReport.verdict, "UNVERIFIED");
    assert.equal(baselineReport.checks[3]?.baseline, "FAIL");

    const outputSite = await createSite(root, baseline, undefined, peer);
    const outputReport = await collectUpgradeReport(
      outputSite.project,
      fileReference(changedOutput),
    );
    assert.equal(outputReport.verdict, "REVIEW REQUIRED");
    assert.deepEqual(outputReport.urls, { added: ["/new"], removed: [] });
    assert.deepEqual(outputReport.output, {
      added: ["new.html"],
      removed: [],
    });

    const jsonSite = await createSite(root, baseline, undefined, peer);
    const output = await captureOutput(() =>
      runUpgradeCheck(jsonSite.project, {
        to: fileReference(candidate),
        json: true,
      }),
    );
    const json = JSON.parse(output.value);
    assert.equal(output.result, false);
    assert.equal(json.verdict, "UNVERIFIED");
    assert.equal(json.target, fileReference(candidate));
    assert.equal(json.checks[1].candidate, "UNVERIFIED");
    assert.equal(await temporaryUpgradeDirectories(), temporaryBefore);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function createSite(
  parent: string,
  cli: string,
  typescript: string | undefined,
  peer: string,
) {
  const root = await fs.mkdtemp(path.join(parent, "site-"));
  await fs.mkdir(path.join(root, "content"));
  await fs.mkdir(path.join(root, "node_modules"));
  await fs.mkdir(path.join(root, "dist"));
  await fs.mkdir(path.join(root, ".riebeckite"));
  await Promise.all([
    fs.writeFile(path.join(root, "content", "note.md"), "private content\n"),
    fs.writeFile(path.join(root, "node_modules", "keep.txt"), "keep\n"),
    fs.writeFile(path.join(root, "dist", "keep.txt"), "keep\n"),
    fs.writeFile(path.join(root, ".riebeckite", "keep.txt"), "keep\n"),
    ...(typescript
      ? [
          fs.writeFile(
            path.join(root, "index.ts"),
            'import { compatible } from "@riebeckite/cli";\ncompatible;\n',
          ),
          fs.writeFile(path.join(root, "tsconfig.json"), "{}\n"),
        ]
      : []),
    fs.writeFile(path.join(root, "package-lock.json"), "{}\n"),
    fs.writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify(
        {
          private: true,
          dependencies: {
            "@riebeckite/cli": fileReference(cli),
            "fixture-peer": fileReference(peer),
          },
          devDependencies: typescript
            ? { typescript: fileReference(typescript) }
            : undefined,
        },
        null,
        2,
      )}\n`,
    ),
  ]);
  const lock = await createProcessRunner().run(
    "npm",
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: root, shell: process.platform === "win32" },
  );
  assert.equal(lock.code, 0, `${lock.stdout}\n${lock.stderr}`);
  return {
    root,
    project: {
      projectRoot: root,
      contentRoot: path.join(root, "content"),
    } as never,
  };
}

async function packCli(
  parent: string,
  version: string,
  mode: "normal" | "typecheck-fail" | "build-fail" | "changed-output",
  extra: { peerDependencies?: Record<string, string> } = {},
): Promise<string> {
  const declarations =
    mode === "typecheck-fail"
      ? "export {};\n"
      : "export declare const compatible: true;\n";
  const executable = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const mode = ${JSON.stringify(mode)};
const command = process.argv[2];
if (process.env.RIEBECKITE_UPGRADE_TEST_SECRET) process.exit(1);
if (command === "doctor" || command === "check") process.exit(0);
if (command === "build") {
  if (mode === "build-fail") process.exit(1);
  fs.mkdirSync(path.join(process.cwd(), "dist"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "dist", "index.html"), "<p>same</p>");
  if (mode === "changed-output") fs.writeFileSync(path.join(process.cwd(), "dist", "new.html"), "<p>new</p>");
  process.exit(0);
}
process.exit(1);
`;
  return packPackage(parent, "@riebeckite/cli", version, executable, {
    ...extra,
    files: { "bin.mjs": executable, "index.d.ts": declarations },
  });
}

async function packTypeScript(parent: string): Promise<string> {
  const source = path.join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "node_modules",
    "typescript",
  );
  const destination = path.join(parent, "typescript");
  await fs.cp(source, destination, { recursive: true });
  return packDirectory(destination, parent);
}

async function packPackage(
  parent: string,
  name: string,
  version: string,
  executable: string,
  options: {
    peerDependencies?: Record<string, string>;
    files?: Record<string, string>;
  } = {},
): Promise<string> {
  const directory = await fs.mkdtemp(path.join(parent, "package-"));
  const files = options.files ?? { "bin.mjs": executable };
  await Promise.all([
    ...Object.entries(files).map(([file, content]) =>
      fs.writeFile(path.join(directory, file), content),
    ),
    fs.writeFile(
      path.join(directory, "package.json"),
      `${JSON.stringify({
        name,
        version,
        type: "module",
        bin: executable ? { riebeckite: "bin.mjs" } : undefined,
        peerDependencies: options.peerDependencies,
      })}\n`,
    ),
  ]);
  return packDirectory(directory, parent);
}

async function packDirectory(
  directory: string,
  destination: string,
): Promise<string> {
  const result = await createProcessRunner().run(
    "npm",
    ["pack", "--pack-destination", destination],
    { cwd: directory, shell: process.platform === "win32" },
  );
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  const archive = result.stdout.trim().split(/\r?\n/).at(-1);
  assert.ok(archive);
  return path.join(destination, archive);
}

function fileReference(file: string): string {
  return pathToFileURL(file).href;
}

async function tree(root: string): Promise<Record<string, string>> {
  const entries: Record<string, string> = {};
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const [nested, value] of Object.entries(await tree(current)))
        entries[path.join(entry.name, nested)] = value;
    } else if (entry.isFile())
      entries[entry.name] = await fs.readFile(current, "utf8");
  }
  return entries;
}

async function temporaryUpgradeDirectories(): Promise<number> {
  return (await fs.readdir(os.tmpdir())).filter((entry) =>
    entry.startsWith("riebeckite-upgrade-"),
  ).length;
}

async function captureOutput<T>(action: () => Promise<T>): Promise<{
  result: T;
  value: string;
}> {
  const log = console.log;
  let value = "";
  console.log = (message: unknown) => {
    value = String(message);
  };
  try {
    return { result: await action(), value };
  } finally {
    console.log = log;
  }
}
