import path from "node:path";
import {
  ContentManager,
  type ContentSourceExclusion,
  type Diagnostic,
  FileSystemContentSource,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../../application_root.js";
import { resolveProjectContentSource } from "../../content_source.js";
import type { DoctorCheckResult } from "../types.js";

const diagnosticSampleLimit = 3;

export async function checkContent(
  project: RiebeckiteProject,
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<DoctorCheckResult> {
  if (!config) return skippedContentCheck();

  try {
    const source = resolveProjectContentSource(config, project);
    const content = new ContentManager(source, config.content.exclude, {
      config,
    });
    const scan =
      source instanceof FileSystemContentSource
        ? await source.scanWithExclusions()
        : { entries: await content.scan(), exclusions: [] };
    const entries = scan.entries;
    const invalidPaths = findInvalidPaths(entries);
    const duplicatePaths = findDuplicatePaths(entries);
    if (invalidPaths.length > 0) {
      return {
        id: "content",
        label: "Content",
        status: "error",
        message: "Content source returned invalid logical paths.",
        details: invalidPaths.map((entry) => `Invalid logical path: ${entry}`),
      };
    }

    const inspection = await content.inspect();
    const diagnosticDetails = summarizeDiagnostics(inspection.diagnostics);
    const details = [
      `${inspection.entries.length} content entries scanned.`,
      ...summarizeExclusions(scan.exclusions),
      ...duplicatePaths.map((entry) => `Duplicate logical path: ${entry}`),
      ...diagnosticDetails,
    ];

    return {
      id: "content",
      label: "Content",
      status: combineStatus(duplicatePaths.length > 0, inspection.diagnostics),
      message: `${inspection.entries.length} content entries scanned.`,
      details: details.length > 1 ? details.slice(1) : undefined,
    };
  } catch (error) {
    return {
      id: "content",
      label: "Content",
      status: "error",
      message: "Could not inspect content.",
      cause: error,
    };
  }
}

function skippedContentCheck(): DoctorCheckResult {
  return {
    id: "content",
    label: "Content",
    status: "skipped",
    message: "Skipped because configuration is unavailable.",
  };
}

function findDuplicatePaths(entries: readonly { path: string }[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.path)) duplicates.add(entry.path);
    seen.add(entry.path);
  }
  return [...duplicates].sort();
}

function findInvalidPaths(entries: readonly { path: string }[]): string[] {
  return entries
    .map((entry) => entry.path)
    .filter(
      (entry) =>
        typeof entry !== "string" ||
        !entry ||
        path.posix.isAbsolute(entry) ||
        path.win32.isAbsolute(entry) ||
        entry.includes("\\") ||
        entry
          .split("/")
          .some(
            (segment) => segment === "" || segment === "." || segment === "..",
          ),
    )
    .map(String)
    .sort();
}

function combineStatus(
  hasDuplicatePaths: boolean,
  diagnostics: readonly Diagnostic[],
): DoctorCheckResult["status"] {
  if (
    hasDuplicatePaths ||
    diagnostics.some((item) => item.severity === "error")
  ) {
    return "error";
  }
  if (diagnostics.some((item) => item.severity === "warning")) return "warning";
  return "ok";
}

function summarizeExclusions(
  exclusions: readonly ContentSourceExclusion[],
): string[] {
  if (exclusions.length === 0) return [];
  const sorted = [...exclusions].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  return [
    `Excluded from content: ${sorted.length}`,
    ...sorted
      .slice(0, diagnosticSampleLimit)
      .map((entry) => `${entry.path} (${entry.pattern})`),
  ];
}

function summarizeDiagnostics(diagnostics: readonly Diagnostic[]): string[] {
  const grouped = Map.groupBy(diagnostics, (item) => item.code);
  const counts = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, items]) => `${items.length} ${code}`);
  const samples = diagnostics
    .slice(0, diagnosticSampleLimit)
    .map((diagnostic) => {
      const location = diagnostic.filePath ?? diagnostic.slug;
      return location
        ? `${location}: ${diagnostic.message}`
        : diagnostic.message;
    });
  return [...counts, ...samples];
}
