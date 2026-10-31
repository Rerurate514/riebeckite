import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PublicationArtifactState } from "@riebeckite/core";
import { fingerprintOutputDirectory } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../application_root.js";
import { readBuildOutputMarker } from "../build_output.js";

export async function readPublicationArtifact(
  project: RiebeckiteProject,
): Promise<PublicationArtifactState> {
  const directory =
    project.config.outputDirectory ?? path.join(project.appRoot, "dist");
  let exists = false;
  try {
    exists = (await fs.stat(directory)).isDirectory();
  } catch {
    exists = false;
  }
  if (!exists) return { exists: false };

  const marker = await readBuildOutputMarker(project);
  const inventory = await fingerprintOutputDirectory(directory);
  const files = Object.keys(inventory).sort((left, right) =>
    left.localeCompare(right),
  );
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash
      .update(file)
      .update("\0")
      .update(inventory[file] ?? "")
      .update("\0");
  }
  return {
    exists: true,
    ...(marker?.publicationFingerprint === undefined
      ? {}
      : { markerPublicationFingerprint: marker.publicationFingerprint }),
    ...(marker?.completedAt === undefined
      ? {}
      : { markerCompletedAt: marker.completedAt }),
    artifactFingerprint: hash.digest("hex"),
    files,
  };
}

export function resolvePublicationOutputDirectory(
  project: RiebeckiteProject,
): string {
  return project.config.outputDirectory ?? path.join(project.appRoot, "dist");
}
