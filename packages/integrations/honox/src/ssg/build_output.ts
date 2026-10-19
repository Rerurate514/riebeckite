import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  isMissingDirectoryError,
  isNotFoundError,
  resolveWithinDirectory,
} from "./file_system.js";

export type ClientBuildArtifacts = {
  stagingDirectory: string;
  paths: readonly string[];
  manifestFingerprint: string;
};

export const CLOUDFLARE_WORKER_ASSET_LIMIT = 25 * 1024 * 1024;

export async function findOversizedAssets(
  directory: string,
  relativeDirectory = "",
): Promise<{ path: string; size: number }[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return [];
      throw error;
    },
  );
  const nestedAssets = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      const relativePath = join(relativeDirectory, entry.name).replaceAll(
        "\\",
        "/",
      );
      if (entry.isDirectory()) {
        return findOversizedAssets(path, relativePath);
      }
      if (!entry.isFile()) return [];

      const size = (await stat(path)).size;
      return size > CLOUDFLARE_WORKER_ASSET_LIMIT
        ? [{ path: relativePath, size }]
        : [];
    }),
  );
  return nestedAssets.flat();
}

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export async function emptyBuildOutputDirectory(outDir: string): Promise<void> {
  const entries = await readdir(outDir, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isMissingDirectoryError(error)) return [];
      throw error;
    },
  );
  for (const entry of entries) {
    await rm(join(outDir, entry.name), { recursive: true, force: true });
  }
}

export async function preserveClientBuildArtifacts(
  outDir: string,
): Promise<ClientBuildArtifacts | undefined> {
  const manifestPath = ".vite/manifest.json";
  let manifestSource: string;
  try {
    manifestSource = await readFile(join(outDir, manifestPath), "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }

  const paths = [manifestPath, ...collectClientAssetPaths(manifestSource)];
  const stagingDirectory = join(
    dirname(outDir),
    ".riebeckite",
    `client-build-${randomUUID()}`,
  );
  for (const relativePath of paths) {
    const source = resolveBuildArtifactPath(outDir, relativePath);
    const destination = resolveBuildArtifactPath(
      stagingDirectory,
      relativePath,
    );
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }
  return {
    stagingDirectory,
    paths,
    manifestFingerprint: createHash("sha256")
      .update(manifestSource)
      .digest("hex"),
  };
}

export async function restoreClientBuildArtifacts(
  outDir: string,
  artifacts: ClientBuildArtifacts | undefined,
): Promise<void> {
  if (!artifacts) return;
  for (const relativePath of artifacts.paths) {
    const source = resolveBuildArtifactPath(
      artifacts.stagingDirectory,
      relativePath,
    );
    const destination = resolveBuildArtifactPath(outDir, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  }
}

export async function discardClientBuildArtifacts(
  artifacts: ClientBuildArtifacts | undefined,
): Promise<void> {
  if (!artifacts) return;
  await rm(artifacts.stagingDirectory, { recursive: true, force: true });
}

function collectClientAssetPaths(manifestSource: string): string[] {
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestSource);
  } catch (error) {
    throw new Error(
      `Vite client manifest could not be parsed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    throw new Error("Vite client manifest must be an object.");
  }

  const paths = new Set<string>();
  for (const entry of Object.values(manifest)) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const assets = entry as Record<string, unknown>;
    addClientAssetPath(paths, assets.file);
    addClientAssetPaths(paths, assets.css);
    addClientAssetPaths(paths, assets.assets);
  }
  return [...paths].sort();
}

function addClientAssetPath(paths: Set<string>, value: unknown): void {
  if (typeof value === "string") paths.add(value);
}

function addClientAssetPaths(paths: Set<string>, value: unknown): void {
  if (!Array.isArray(value)) return;
  for (const path of value) addClientAssetPath(paths, path);
}

function resolveBuildArtifactPath(
  directory: string,
  relativePath: string,
): string {
  return resolveWithinDirectory(
    directory,
    relativePath,
    "Vite client manifest asset path",
  );
}
