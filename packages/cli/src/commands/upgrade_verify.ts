import fs from "node:fs/promises";
import path from "node:path";
import { createProcessRunner } from "../process_runner.js";
import {
  installArgs,
  isolatedEnvironment,
  readManifest,
  status,
} from "./upgrade_install.js";
import { inventory } from "./upgrade_safety.js";
import type { Manifest, PackageManager, Status } from "./upgrade_types.js";

export async function verifySite(
  root: string,
  manager: PackageManager,
  manifest: Manifest,
  packages: readonly string[],
  target?: string,
  signal?: AbortSignal,
) {
  const runner = createProcessRunner();
  const environment = isolatedEnvironment(root);
  const install = await runner.run(manager, installArgs(manager, !target), {
    cwd: root,
    environment,
    shell: process.platform === "win32",
    signal,
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
  const typecheck = await runTypecheck(
    runner,
    root,
    manager,
    environment,
    signal,
  );
  const check = status(
    await runCli(runner, root, manager, ["check"], environment, signal),
  );
  const doctorResult = await runCli(
    runner,
    root,
    manager,
    ["doctor", "--json"],
    environment,
    signal,
  );
  const diagnostics =
    doctorResult.code === 0
      ? "PASS"
      : doctorResult.code === 127
        ? "UNVERIFIED"
        : "FAIL";
  const build = status(
    await runCli(
      runner,
      root,
      manager,
      ["build", "--full"],
      environment,
      signal,
    ),
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

export function emptyVerification(install: Status, note?: string) {
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

export async function runTypecheck(
  runner: ReturnType<typeof createProcessRunner>,
  root: string,
  manager: PackageManager,
  environment: NodeJS.ProcessEnv,
  signal?: AbortSignal,
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
      { cwd: root, environment, shell: process.platform === "win32", signal },
    ),
  );
}

export function runCli(
  runner: ReturnType<typeof createProcessRunner>,
  root: string,
  manager: PackageManager,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
  signal?: AbortSignal,
) {
  return runner.run(
    manager,
    manager === "pnpm"
      ? ["exec", "riebeckite", ...arguments_]
      : ["exec", "--", "riebeckite", ...arguments_],
    { cwd: root, environment, shell: process.platform === "win32", signal },
  );
}

export async function verifyInstalledRiebeckitePackages(
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
