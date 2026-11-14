import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function checkClientManifest(assetsDirectory) {
  const manifestPath = path.join(assetsDirectory, ".vite", "manifest.json");
  const errors = [];
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    errors.push(
      `Vite client manifest is unavailable: ${path.relative(assetsDirectory, manifestPath)}`,
    );
    return {
      path: manifestPath,
      exists: false,
      cssEntryCount: 0,
      entries: {},
      errors,
    };
  }
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    errors.push("Vite client manifest must be an object.");
    return {
      path: manifestPath,
      exists: true,
      cssEntryCount: 0,
      entries: {},
      errors,
    };
  }
  const entries = manifest;
  const diagnostics = Object.fromEntries(
    ["app/style.css", "app/client.ts"].flatMap((key) => {
      const entry = entries[key];
      if (typeof entry !== "object" || entry === null) return [];
      return [[key, entry.src ?? key]];
    }),
  );
  const cssEntryCount = Object.values(entries).filter((entry) =>
    hasCssAsset(entry),
  ).length;
  if (cssEntryCount === 0)
    errors.push("Vite client manifest has no CSS asset entries.");
  for (const key of ["app/style.css", "app/client.ts"]) {
    if (!Object.hasOwn(entries, key))
      errors.push(`Vite client manifest is missing ${key}.`);
  }
  for (const [key, entry] of Object.entries(entries)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      errors.push(`Vite client manifest entry ${key} is invalid.`);
      continue;
    }
    for (const asset of collectManifestAssets(entry)) {
      errors.push(...(await verifyManifestAsset(assetsDirectory, key, asset)));
    }
  }
  return {
    path: manifestPath,
    exists: true,
    cssEntryCount,
    entries: diagnostics,
    errors,
  };
}

export function hasCssAsset(entry) {
  return collectManifestAssets(entry).some((asset) => asset.endsWith(".css"));
}

export function collectManifestAssets(entry) {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry))
    return [];
  const paths = [
    entry.file,
    ...(Array.isArray(entry.css) ? entry.css : []),
    ...(Array.isArray(entry.assets) ? entry.assets : []),
  ];
  return paths.filter((asset) => typeof asset === "string");
}

export async function verifyManifestAsset(assetsDirectory, key, asset) {
  const assetPath = path.resolve(assetsDirectory, asset);
  const relativePath = path.relative(assetsDirectory, assetPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return [`Vite client manifest entry ${key} has an invalid asset: ${asset}`];
  }
  try {
    const info = await stat(assetPath);
    if (!info.isFile())
      return [
        `Vite client manifest entry ${key} references a non-file asset: ${asset}`,
      ];
    if (asset.endsWith(".css") && info.size === 0)
      return [
        `Vite client manifest entry ${key} references an empty CSS asset: ${asset}`,
      ];
    return [];
  } catch {
    return [
      `Vite client manifest entry ${key} references a missing asset: ${asset}`,
    ];
  }
}
