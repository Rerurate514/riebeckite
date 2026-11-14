import { lstat, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  BUILD_OUTPUT_MARKER_FILE,
  createBuildOutputMarker,
  isDeferredGeneratedOutput,
  serializeBuildOutputMarker,
} from "@riebeckite/core";
import type { OutputCacheState } from "./ssg/output_cache.js";
import type { GeneratedOutputAsset, SsgModule } from "./ssg/types.js";

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await lstat(path)).isDirectory();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

export function findBuildOutputSiteCollisions(
  buildOutputPaths: Iterable<string>,
  siteOwnedOutputPaths: ReadonlySet<string>,
): readonly string[] {
  const collisions = new Set<string>();
  for (const path of buildOutputPaths) {
    if (siteOwnedOutputPaths.has(path)) collisions.add(path);
  }
  return [...collisions].sort();
}

export function assertRequiredOutputsWereGenerated(comparison: {
  readonly missingInDist: readonly string[];
}): void {
  if (comparison.missingInDist.length === 0) return;
  throw new Error(
    `SSG did not generate required output: ${comparison.missingInDist.join(", ")}`,
  );
}

export function outputCacheEntryFor(
  previous: OutputCacheState | undefined,
  path: string,
  checksum: string,
): OutputCacheState["outputs"][string] {
  const cached = previous?.outputs[path];
  return cached?.checksum === checksum
    ? cached
    : { cachePath: "", checksum: "" };
}

export async function emitGeneratedOutputs(
  module: SsgModule,
  emit: (asset: GeneratedOutputAsset) => Promise<void>,
  affectedPaths?: ReadonlySet<string>,
  shadowedPaths?: ReadonlySet<string>,
  onShadowed?: (path: string) => void,
): Promise<number> {
  const content = module.content;
  if (!content) return 0;
  if (affectedPaths?.size === 0) return 0;

  const manifest = await content.getManifest();
  let count = 0;
  for (const output of manifest.generatedOutputs ?? []) {
    if (affectedPaths && !affectedPaths.has(output.path)) continue;
    if (shadowedPaths?.has(output.path)) {
      onShadowed?.(output.path);
      continue;
    }
    const source = isDeferredGeneratedOutput(output)
      ? await output.generate()
      : output.content;
    await emit({
      type: "asset",
      fileName: output.path,
      source,
    });
    count += 1;
  }
  return count;
}
export function removeVirtualEntryChunk(
  bundle: Record<
    string,
    { type: string; fileName: string; moduleIds?: string[] }
  >,
  virtualEntryId: string,
): void {
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk" && chunk.moduleIds?.includes(virtualEntryId)) {
      delete bundle[chunk.fileName];
    }
  }
}

export async function writePublicationMarker(input: {
  readonly root: string;
  readonly outputDirectory: string;
  readonly publicationFingerprint?: string;
  readonly artifactFingerprint?: string;
  readonly warn: (message: string) => void;
}): Promise<void> {
  const path = join(input.root, ".riebeckite", BUILD_OUTPUT_MARKER_FILE);
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      serializeBuildOutputMarker(
        createBuildOutputMarker({
          outputDirectory: input.outputDirectory,
          ...(input.publicationFingerprint === undefined
            ? {}
            : { publicationFingerprint: input.publicationFingerprint }),
          ...(input.artifactFingerprint === undefined
            ? {}
            : { artifactFingerprint: input.artifactFingerprint }),
          completedAt: new Date(),
        }),
      ),
      "utf8",
    );
  } catch (error) {
    input.warn(
      `Could not write the publication marker; publish will rebuild before deploying. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
