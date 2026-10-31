import type { HostingProvider } from "./hosting.js";
import type { PublicationPlan } from "./planner.js";

export type PublicationArtifactState = {
  /** Whether the configured output directory exists. */
  readonly exists: boolean;
  /** Publication fingerprint recorded by the build output marker. */
  readonly markerPublicationFingerprint?: string;
  /** When the marker says the build completed. */
  readonly markerCompletedAt?: string;
  /** Hash of every file currently in the output directory. */
  readonly artifactFingerprint?: string;
  /** Paths relative to the output directory, when inventory is available. */
  readonly files?: readonly string[];
};

export type PublicationArtifactIssue = {
  readonly code:
    | "artifact-missing"
    | "artifact-not-from-build"
    | "artifact-stale"
    | "artifact-empty"
    | "artifact-missing-provider-file";
  readonly severity: "error" | "warning";
  readonly message: string;
};

/**
 * Checks that the output directory belongs to the build that matches the
 * current plan. A mismatch means an older artifact would be published.
 */
export function validatePublicationArtifact(input: {
  readonly plan: PublicationPlan;
  readonly artifact: PublicationArtifactState;
  readonly provider?: HostingProvider;
}): PublicationArtifactIssue[] {
  const { plan, artifact, provider } = input;
  if (!artifact.exists) {
    return [
      {
        code: "artifact-missing",
        severity: "error",
        message: "The build output directory does not exist.",
      },
    ];
  }

  const issues: PublicationArtifactIssue[] = [];
  if (artifact.markerPublicationFingerprint === undefined) {
    issues.push({
      code: "artifact-not-from-build",
      severity: "error",
      message:
        "The build output marker is missing or was not written by a completed build.",
    });
  } else if (
    artifact.markerPublicationFingerprint !== plan.publicationFingerprint
  ) {
    issues.push({
      code: "artifact-stale",
      severity: "error",
      message:
        "The build output was produced from a different publication plan; rebuild before deploying.",
    });
  }

  if (
    artifact.files !== undefined &&
    artifact.files.filter((path) => !path.endsWith("/")).length === 0
  ) {
    issues.push({
      code: "artifact-empty",
      severity: "error",
      message: "The build output directory contains no files.",
    });
  }

  for (const path of requiredProviderFiles(provider)) {
    if (
      artifact.files !== undefined &&
      !artifact.files.some((file) => file === path)
    ) {
      issues.push({
        code: "artifact-missing-provider-file",
        severity: "warning",
        message: `The ${provider} deploy expects "${path}" in the build output.`,
      });
    }
  }

  return issues;
}

function requiredProviderFiles(
  provider: HostingProvider | undefined,
): readonly string[] {
  if (provider === "github-pages") return [".nojekyll", "404.html"];
  return [];
}
