import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { RiebeckiteProject } from "../application_root.js";
import { type CommandResult, createProcessRunner } from "../process_runner.js";

type Status = "PASS" | "FAIL" | "UNVERIFIED";
type Verdict = "READY" | "REVIEW REQUIRED" | "BLOCKED" | "UNVERIFIED";
type PackageManager = "npm" | "pnpm";

type Check = {
  readonly name: string;
  readonly baseline: Status;
  readonly candidate: Status;
};

export type UpgradeReport = {
  readonly version: 1;
  readonly verdict: Verdict;
  readonly target: string;
  readonly packageManager?: PackageManager;
  readonly packages: readonly string[];
  readonly checks: readonly Check[];
  readonly diagnostics: {
    readonly baseline: Status;
    readonly candidate: Status;
  };
  readonly urls: {
    readonly added: readonly string[];
    readonly removed: readonly string[];
  };
  readonly output: {
    readonly added: readonly string[];
    readonly removed: readonly string[];
  };
  readonly notes: readonly string[];
};

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  readonly engines?: { readonly node?: string };
  readonly scripts?: Record<string, string>;
};

export async function runUpgradeCheck(
  project: RiebeckiteProject,
  options: { readonly to: string; readonly json: boolean },
): Promise<boolean> {
  const report = await collectUpgradeReport(project, options.to);
  console.log(
    options.json ? JSON.stringify(report) : renderUpgradeReport(report),
  );
  return report.verdict === "READY";
}

export async function collectUpgradeReport(
  project: RiebeckiteProject,
  target: string,
): Promise<UpgradeReport> {
  const manifest = await readManifest(
    path.join(project.projectRoot, "package.json"),
  );
  const packages = riebeckitePackages(manifest);
  const manager = await detectPackageManager(project.projectRoot);
  const notes: string[] = [];
  if (!manager) {
    return report(
      target,
      undefined,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        "A package-lock.json or pnpm-lock.yaml is required to create a reproducible isolated check.",
      ),
      "BLOCKED",
    );
  }
  if (packages.length === 0) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat("No @riebeckite/* dependency is declared in package.json."),
      "BLOCKED",
    );
  }
  if (
    path.relative(project.projectRoot, project.contentRoot).startsWith("..")
  ) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        "The content root is outside the project and cannot be snapshotted safely.",
      ),
      "UNVERIFIED",
    );
  }

  const temporary = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-upgrade-"),
  );
  try {
    await assertSafeProjectTree(project.projectRoot);
    const baselineRoot = path.join(temporary, "baseline");
    const candidateRoot = path.join(temporary, "candidate");
    await copyProject(project.projectRoot, baselineRoot);
    await copyProject(project.projectRoot, candidateRoot);
    await updateRiebeckiteVersions(
      path.join(candidateRoot, "package.json"),
      target,
    );

    const baseline = await verifySite(
      baselineRoot,
      manager,
      manifest,
      packages,
    );
    const candidate = await verifySite(
      candidateRoot,
      manager,
      manifest,
      packages,
      target,
    );
    const checks: Check[] = [
      {
        name: "dependency / peer / engines",
        baseline: baseline.install,
        candidate: candidate.install,
      },
      {
        name: "typecheck",
        baseline: baseline.typecheck,
        candidate: candidate.typecheck,
      },
      {
        name: "Riebeckite check",
        baseline: baseline.check,
        candidate: candidate.check,
      },
      {
        name: "production build",
        baseline: baseline.build,
        candidate: candidate.build,
      },
    ];
    const urls = difference(baseline.urls, candidate.urls);
    const output = difference(baseline.files, candidate.files);
    if (
      baseline.diagnostics === "UNVERIFIED" ||
      candidate.diagnostics === "UNVERIFIED"
    )
      notes.push(
        "Diagnostics could not be collected for at least one environment.",
      );
    if (urls.added.length || urls.removed.length)
      notes.push("Generated URL changes need publication review.");
    if (output.added.length || output.removed.length)
      notes.push("Generated output or asset changes need review.");
    notes.push(...baseline.notes, ...candidate.notes);
    const verdict = determineVerdict(
      checks,
      baseline.diagnostics,
      candidate.diagnostics,
      urls,
      output,
    );
    return report(
      target,
      manager,
      packages,
      checks,
      urls,
      output,
      notes,
      verdict,
      baseline.diagnostics,
      candidate.diagnostics,
    );
  } catch (error) {
    return report(
      target,
      manager,
      packages,
      [],
      emptyDifference(),
      emptyDifference(),
      notes.concat(
        error instanceof Error
          ? error.message
          : "The isolated upgrade check could not start.",
      ),
      "BLOCKED",
    );
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

async function verifySite(
  root: string,
  manager: PackageManager,
  manifest: Manifest,
  packages: readonly string[],
  target?: string,
) {
  const runner = createProcessRunner();
  const environment = isolatedEnvironment(root);
  const install = await runner.run(manager, installArgs(manager, !target), {
    cwd: root,
    environment,
    shell: process.platform === "win32",
  });
  if (install.code !== 0)
    return emptyVerification(
      "FAIL",
      `${target ? "Candidate" : "Baseline"} dependency installation failed. Check the requested version, peer dependencies, and Node engine requirements.`,
    );
  const resolution = await verifyInstalledRiebeckitePackages(
    root,
    packages,
    target,
  );
  if (resolution)
    return emptyVerification(
      "FAIL",
      `${target ? "Candidate" : "Baseline"} ${resolution}`,
    );
  const typecheck = await runTypecheck(runner, root, manager, environment);
  const check = status(
    await runCli(runner, root, manager, ["check"], environment),
  );
  const doctorResult = await runCli(
    runner,
    root,
    manager,
    ["doctor", "--json"],
    environment,
  );
  const diagnostics =
    doctorResult.code === 0
      ? "PASS"
      : doctorResult.code === 127
        ? "UNVERIFIED"
        : "FAIL";
  const build = status(
    await runCli(runner, root, manager, ["build", "--full"], environment),
  );
  const output =
    build === "PASS"
      ? await inventory(path.join(root, "dist"))
      : { files: [], urls: [] };
  return {
    install: "PASS" as Status,
    typecheck,
    check,
    diagnostics: diagnostics as Status,
    build,
    ...output,
    engines: manifest.engines?.node,
    notes: [],
  };
}

function emptyVerification(install: Status, note?: string) {
  return {
    install,
    typecheck: "UNVERIFIED" as Status,
    check: "UNVERIFIED" as Status,
    diagnostics: "UNVERIFIED" as Status,
    build: "UNVERIFIED" as Status,
    files: [],
    urls: [],
    notes: note ? [note] : [],
  };
}

async function runTypecheck(
  runner: ReturnType<typeof createProcessRunner>,
  root: string,
  manager: PackageManager,
  environment: NodeJS.ProcessEnv,
): Promise<Status> {
  try {
    await fs.access(path.join(root, "tsconfig.json"));
  } catch {
    return "UNVERIFIED";
  }
  return status(
    await runner.run(
      manager,
      manager === "pnpm"
        ? ["exec", "tsc", "--noEmit"]
        : ["exec", "--", "tsc", "--noEmit"],
      { cwd: root, environment, shell: process.platform === "win32" },
    ),
  );
}

function runCli(
  runner: ReturnType<typeof createProcessRunner>,
  root: string,
  manager: PackageManager,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
) {
  return runner.run(
    manager,
    manager === "pnpm"
      ? ["exec", "riebeckite", ...arguments_]
      : ["exec", "--", "riebeckite", ...arguments_],
    { cwd: root, environment, shell: process.platform === "win32" },
  );
}

async function verifyInstalledRiebeckitePackages(
  root: string,
  packages: readonly string[],
  target?: string,
): Promise<string | undefined> {
  const versions = await Promise.all(
    packages.map(async (name) => {
      try {
        const installed = await readManifest(
          path.join(root, "node_modules", ...name.split("/"), "package.json"),
        );
        const version = (installed as Manifest & { version?: unknown }).version;
        return typeof version === "string" ? version : undefined;
      } catch {
        return undefined;
      }
    }),
  );
  if (versions.some((version) => !version))
    return "did not install every declared @riebeckite/* package.";
  const resolved = versions as string[];
  if (new Set(resolved).size !== 1)
    return "resolved @riebeckite/* packages to inconsistent versions.";
  const exactTarget = target?.replace(/^v/, "");
  if (exactTarget && /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(exactTarget)) {
    if (resolved[0] !== exactTarget)
      return `resolved ${resolved[0]} instead of requested ${target}.`;
  }
  return undefined;
}

function isolatedEnvironment(root: string): NodeJS.ProcessEnv {
  const pathValue = process.env.PATH ?? process.env.Path;
  return {
    PATH: pathValue,
    Path: pathValue,
    PATHEXT: process.env.PATHEXT,
    SystemRoot: process.env.SystemRoot,
    SYSTEMROOT: process.env.SYSTEMROOT,
    ComSpec: process.env.ComSpec,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    npm_config_cache: path.join(path.dirname(root), ".npm-cache"),
    npm_config_userconfig: path.join(root, ".npmrc"),
  };
}

function installArgs(
  manager: PackageManager,
  useLockfile: boolean,
): readonly string[] {
  return manager === "pnpm"
    ? [
        "install",
        "--ignore-scripts",
        "--ignore-pnpmfile",
        useLockfile ? "--frozen-lockfile" : "--lockfile=false",
        "--strict-peer-dependencies",
        "--engine-strict",
      ]
    : [
        useLockfile ? "ci" : "install",
        "--ignore-scripts",
        ...(useLockfile ? [] : ["--package-lock=false"]),
        "--no-audit",
        "--no-fund",
        "--strict-peer-deps",
        "--engine-strict",
      ];
}

function status(result: CommandResult): Status {
  return result.code === 0
    ? "PASS"
    : result.code === 127
      ? "UNVERIFIED"
      : "FAIL";
}

async function detectPackageManager(
  root: string,
): Promise<PackageManager | undefined> {
  const [pnpm, npm] = await Promise.all([
    exists(path.join(root, "pnpm-lock.yaml")),
    exists(path.join(root, "package-lock.json")),
  ]);
  return pnpm && !npm ? "pnpm" : npm && !pnpm ? "npm" : undefined;
}

async function readManifest(file: string): Promise<Manifest> {
  return JSON.parse(await fs.readFile(file, "utf8")) as Manifest;
}

function riebeckitePackages(manifest: Manifest): string[] {
  return [
    ...new Set(
      [
        manifest.dependencies,
        manifest.devDependencies,
        manifest.peerDependencies,
        manifest.optionalDependencies,
      ].flatMap((dependencies) =>
        Object.keys(dependencies ?? {}).filter((name) =>
          name.startsWith("@riebeckite/"),
        ),
      ),
    ),
  ].sort();
}

async function updateRiebeckiteVersions(
  file: string,
  target: string,
): Promise<void> {
  const manifest = await readManifest(file);
  for (const dependencies of [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
    manifest.optionalDependencies,
  ]) {
    if (!dependencies) continue;
    for (const name of Object.keys(dependencies))
      if (name.startsWith("@riebeckite/")) dependencies[name] = target;
  }
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

const excludedNames = new Set([
  "node_modules",
  "dist",
  ".riebeckite",
  ".git",
  ".npmrc",
]);
function isSecretName(name: string): boolean {
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}

async function assertSafeProjectTree(root: string): Promise<void> {
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (excludedNames.has(entry.name) || isSecretName(entry.name)) continue;
    const current = path.join(root, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Refusing to copy symlinked path: ${entry.name}.`);
    if (entry.isDirectory()) await assertSafeProjectTree(current);
  }
}

async function copyProject(source: string, destination: string): Promise<void> {
  await fs.cp(source, destination, {
    recursive: true,
    filter: (entry) =>
      !excludedNames.has(path.basename(entry)) &&
      !isSecretName(path.basename(entry)),
  });
}

async function inventory(
  root: string,
): Promise<{ files: string[]; urls: string[] }> {
  if (!(await exists(root))) return { files: [], urls: [] };
  const files: string[] = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await inventory(current);
      files.push(
        ...nested.files.map((file) => path.posix.join(entry.name, file)),
      );
    } else if (entry.isFile()) files.push(entry.name);
  }
  const normalized = files.map((file) => file.replaceAll("\\", "/")).sort();
  return {
    files: normalized,
    urls: normalized.filter((file) => file.endsWith(".html")).map(toUrl),
  };
}

function toUrl(file: string): string {
  return file === "index.html"
    ? "/"
    : file.endsWith("/index.html")
      ? `/${file.slice(0, -"index.html".length)}`
      : `/${file.slice(0, -".html".length)}`;
}

function difference(before: readonly string[], after: readonly string[]) {
  const previous = new Set(before);
  const next = new Set(after);
  return {
    added: after.filter((item) => !previous.has(item)),
    removed: before.filter((item) => !next.has(item)),
  };
}

function emptyDifference() {
  return { added: [], removed: [] };
}

function determineVerdict(
  checks: readonly Check[],
  baselineDiagnostics: Status,
  candidateDiagnostics: Status,
  urls: ReturnType<typeof difference>,
  output: ReturnType<typeof difference>,
): Verdict {
  if (checks[0]?.candidate === "FAIL") return "BLOCKED";
  if (checks.some((check) => check.baseline === "FAIL")) return "UNVERIFIED";
  if (
    checks.some((check) => check.candidate === "FAIL") ||
    candidateDiagnostics === "FAIL" ||
    urls.added.length ||
    urls.removed.length ||
    output.added.length ||
    output.removed.length
  )
    return "REVIEW REQUIRED";
  if (
    checks.some(
      (check) =>
        check.baseline === "UNVERIFIED" || check.candidate === "UNVERIFIED",
    ) ||
    baselineDiagnostics === "UNVERIFIED" ||
    candidateDiagnostics === "UNVERIFIED"
  )
    return "UNVERIFIED";
  return "READY";
}

function report(
  target: string,
  packageManager: PackageManager | undefined,
  packages: readonly string[],
  checks: readonly Check[],
  urls: ReturnType<typeof difference>,
  output: ReturnType<typeof difference>,
  notes: readonly string[],
  verdict: Verdict,
  baselineDiagnostics: Status = "UNVERIFIED",
  candidateDiagnostics: Status = "UNVERIFIED",
): UpgradeReport {
  return {
    version: 1,
    verdict,
    target,
    packageManager,
    packages,
    checks,
    diagnostics: {
      baseline: baselineDiagnostics,
      candidate: candidateDiagnostics,
    },
    urls,
    output,
    notes,
  };
}

function renderUpgradeReport(report: UpgradeReport): string {
  const side = (check: Check) =>
    `${check.name.padEnd(24)} ${check.baseline.padEnd(11)} ${check.candidate}`;
  return [
    "Riebeckite Upgrade Lab",
    `Target: ${report.target}`,
    `Package manager: ${report.packageManager ?? "unavailable"}`,
    `Packages: ${report.packages.join(", ") || "none"}`,
    "",
    "Check                    baseline    candidate",
    ...report.checks.map(side),
    `diagnostics              ${report.diagnostics.baseline.padEnd(11)} ${report.diagnostics.candidate}`,
    "",
    `URLs: +${report.urls.added.length} -${report.urls.removed.length}; output: +${report.output.added.length} -${report.output.removed.length}`,
    ...report.notes.map((note) => `- ${note}`),
    "",
    `Verdict: ${report.verdict}`,
  ].join("\n");
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
