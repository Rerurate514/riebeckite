import fs from "node:fs/promises";
import path from "node:path";
import type { CommandResult } from "../process_runner.js";
import { exists } from "./upgrade_io.js";
import type { Manifest, PackageManager, Status } from "./upgrade_types.js";

export function isolatedEnvironment(root: string): NodeJS.ProcessEnv {
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
    HOME: root,
    USERPROFILE: root,
    APPDATA: path.join(root, ".appdata"),
    LOCALAPPDATA: path.join(root, ".localappdata"),
    npm_config_cache: path.join(path.dirname(root), ".npm-cache"),
    npm_config_userconfig: path.join(root, ".npmrc"),
  };
}

export function installArgs(
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

export function status(result: CommandResult): Status {
  return result.code === 0
    ? "PASS"
    : result.code === 127
      ? "UNVERIFIED"
      : "FAIL";
}

export async function detectPackageManager(
  root: string,
): Promise<PackageManager | undefined> {
  const [pnpm, npm] = await Promise.all([
    exists(path.join(root, "pnpm-lock.yaml")),
    exists(path.join(root, "package-lock.json")),
  ]);
  return pnpm && !npm ? "pnpm" : npm && !pnpm ? "npm" : undefined;
}

export async function readManifest(file: string): Promise<Manifest> {
  return JSON.parse(await fs.readFile(file, "utf8")) as Manifest;
}

export function riebeckitePackages(manifest: Manifest): string[] {
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

export async function updateRiebeckiteVersions(
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

export const excludedNames = new Set([
  "node_modules",
  "dist",
  ".riebeckite",
  ".git",
  ".npmrc",
]);

export function isSecretName(name: string): boolean {
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    name.endsWith(".pem") ||
    name.endsWith(".key")
  );
}
