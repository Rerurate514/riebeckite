import path from "node:path";
import type { IconDiagnostic } from "./icon_packs.js";
import {
  isDirectory,
  isFile,
  isWithin,
  normalizeVaultPath,
} from "./icons_settings_io.js";
import type { ResolvedIconsOptions } from "./types.js";

export async function resolveVaultRoot(
  options: ResolvedIconsOptions,
  contentDirectory: string | undefined,
): Promise<string | undefined> {
  if (options.vaultRoot) {
    const explicit = path.resolve(options.vaultRoot);
    const root =
      path.basename(explicit) === ".obsidian"
        ? path.dirname(explicit)
        : explicit;
    return (await isDirectory(root)) ? root : undefined;
  }

  const starts = [contentDirectory, process.cwd()].filter(
    (value): value is string => typeof value === "string",
  );
  for (const start of starts) {
    let current = path.resolve(start);
    for (;;) {
      if (await isDirectory(path.join(current, ".obsidian"))) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return undefined;
}

export function resolveVaultPrefix(
  options: ResolvedIconsOptions,
  vaultRoot: string | undefined,
  contentDirectory: string | undefined,
): string {
  if (options.vaultPrefix !== undefined) {
    return normalizeVaultPath(options.vaultPrefix) ?? "";
  }
  if (!vaultRoot || !contentDirectory) return "";
  const relative = path.relative(vaultRoot, path.resolve(contentDirectory));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return "";
  }
  return `${normalizeVaultPath(relative) ?? ""}/`.replace(/^\/+/, "");
}

export async function resolveDataFile(input: {
  explicit?: string;
  pluginId: string;
  root: string;
  vaultRoot?: string;
  diagnostics: IconDiagnostic[];
  source: string;
}): Promise<string | undefined> {
  const root = input.vaultRoot ?? input.root;
  if (input.explicit) {
    const resolved = path.resolve(input.root, input.explicit);
    if (!isWithin(root, resolved)) {
      input.diagnostics.push({
        code: "icons-untrusted-settings-path",
        severity: "warning",
        message: `${input.source} settings path is outside the allowed root; ignoring it.`,
        meta: { source: input.source },
      });
      return undefined;
    }
    return (await isFile(resolved)) ? resolved : undefined;
  }

  const candidate = path.join(
    root,
    ".obsidian",
    "plugins",
    input.pluginId,
    "data.json",
  );
  return (await isFile(candidate)) ? candidate : undefined;
}

export function resolvePackRoot(
  vaultRoot: string,
  value: string,
): string | undefined {
  const resolved = path.resolve(vaultRoot, value);
  return isWithin(vaultRoot, resolved) ? resolved : undefined;
}
