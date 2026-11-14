import fs from "node:fs/promises";
import path from "node:path";
import { excludedNames, isSecretName } from "./upgrade_install.js";
import { exists } from "./upgrade_io.js";

export async function assertSafeProjectTree(root: string): Promise<void> {
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (excludedNames.has(entry.name) || isSecretName(entry.name)) continue;
    const current = path.join(root, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Refusing to copy symlinked path: ${entry.name}.`);
    if (entry.isDirectory()) await assertSafeProjectTree(current);
  }
}

export async function copyProject(
  source: string,
  destination: string,
): Promise<void> {
  await fs.cp(source, destination, {
    recursive: true,
    filter: (entry) =>
      !excludedNames.has(path.basename(entry)) &&
      !isSecretName(path.basename(entry)),
  });
}

export async function inventory(
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

export function toUrl(file: string): string {
  return file === "index.html"
    ? "/"
    : file.endsWith("/index.html")
      ? `/${file.slice(0, -"index.html".length)}`
      : `/${file.slice(0, -".html".length)}`;
}

export function difference(
  before: readonly string[],
  after: readonly string[],
) {
  const previous = new Set(before);
  const next = new Set(after);
  return {
    added: after.filter((item) => !previous.has(item)),
    removed: before.filter((item) => !next.has(item)),
  };
}

export function emptyDifference() {
  return { added: [], removed: [] };
}
