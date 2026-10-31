export const BUILD_OUTPUT_MARKER_VERSION = 1;
export const BUILD_OUTPUT_MARKER_FILE = "build-output.json";

export type BuildOutputMarker = {
  readonly outputDirectory: string;
  /** Publication fingerprint of the content that produced this output. */
  readonly publicationFingerprint?: string;
  readonly completedAt?: string;
};

export function createBuildOutputMarker(input: {
  readonly outputDirectory: string;
  readonly publicationFingerprint?: string;
  readonly completedAt?: Date | string;
}): BuildOutputMarker {
  return {
    outputDirectory: input.outputDirectory,
    ...(input.publicationFingerprint === undefined
      ? {}
      : { publicationFingerprint: input.publicationFingerprint }),
    ...(input.completedAt === undefined
      ? {}
      : {
          completedAt:
            input.completedAt instanceof Date
              ? input.completedAt.toISOString()
              : input.completedAt,
        }),
  };
}

export function serializeBuildOutputMarker(marker: BuildOutputMarker): string {
  return `${JSON.stringify(
    {
      version: BUILD_OUTPUT_MARKER_VERSION,
      ...marker,
    },
    null,
    2,
  )}\n`;
}

export function parseBuildOutputMarker(
  value: unknown,
  expectedOutputDirectory: string,
): BuildOutputMarker | undefined {
  if (!isRecord(value) || value.version !== BUILD_OUTPUT_MARKER_VERSION) {
    return undefined;
  }
  if (typeof value.outputDirectory !== "string") return undefined;
  if (value.outputDirectory !== expectedOutputDirectory) return undefined;
  return {
    outputDirectory: value.outputDirectory,
    ...(typeof value.publicationFingerprint === "string"
      ? { publicationFingerprint: value.publicationFingerprint }
      : {}),
    ...(typeof value.completedAt === "string" &&
    !Number.isNaN(Date.parse(value.completedAt))
      ? { completedAt: value.completedAt }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
