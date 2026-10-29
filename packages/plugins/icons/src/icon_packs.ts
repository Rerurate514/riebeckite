import type { Dirent } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_SVG_BYTES = 256 * 1024;

export type IconDiagnostic = {
  readonly code: string;
  readonly severity: "info" | "warning";
  readonly message: string;
  readonly meta?: Readonly<Record<string, unknown>>;
};

export type IconPackFile = {
  readonly name: string;
  readonly filePath: string;
  readonly size: number;
  readonly modified: number;
};

export type IconPacks = ReadonlyMap<string, ReadonlyMap<string, IconPackFile>>;

export function normalizeIconName(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export async function loadIconPacks(
  root: string,
  diagnostics: IconDiagnostic[],
): Promise<IconPacks> {
  const packs = new Map<string, Map<string, IconPackFile>>();
  let entries: Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return packs;
  }

  let zipCount = 0;
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".zip")) {
      zipCount += 1;
      continue;
    }
    if (!entry.isDirectory()) continue;
    const packPath = path.join(root, entry.name);
    const realPack = await safeRealPath(packPath);
    if (!realPack || !isWithin(root, realPack)) continue;
    let files: Dirent[];
    try {
      files = await fs.readdir(realPack, { withFileTypes: true });
    } catch {
      continue;
    }
    const pack = new Map<string, IconPackFile>();
    for (const file of files) {
      if (!file.isFile() || !file.name.toLowerCase().endsWith(".svg")) {
        continue;
      }
      const filePath = path.join(realPack, file.name);
      const realFile = await safeRealPath(filePath);
      if (!realFile || !isWithin(root, realFile)) continue;
      try {
        const stat = await fs.stat(realFile);
        if (stat.size > MAX_SVG_BYTES) continue;
        const iconName = normalizeIconName(
          file.name.slice(0, -".svg".length),
        ).toLowerCase();
        if (!iconName) continue;
        pack.set(iconName, {
          name: file.name,
          filePath: realFile,
          size: stat.size,
          modified: stat.mtimeMs,
        });
      } catch {}
    }
    if (pack.size > 0) {
      const packName = normalizeIconName(entry.name).toLowerCase();
      if (packName) packs.set(packName, pack);
    }
  }

  if (zipCount > 0) {
    diagnostics.push({
      code: "icons-unsupported-zip-pack",
      severity: "info",
      message:
        "Zip-based Iconize icon packs are not read; extract them into folders under the icon packs directory.",
      meta: { packCount: zipCount },
    });
  }
  return packs;
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

async function safeRealPath(value: string): Promise<string | undefined> {
  try {
    return await fs.realpath(value);
  } catch {
    return undefined;
  }
}
