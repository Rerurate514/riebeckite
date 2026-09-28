import path from "node:path";
import {
  ContentManager,
  type Diagnostic,
  type ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveHonoxApplicationRoot } from "@riebeckite/honox";
import type { RiebeckiteProject } from "../../application_root";
import type { DoctorCheckResult } from "../types";

const diagnosticSampleLimit = 3;

export async function checkContent(
  project: RiebeckiteProject,
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<DoctorCheckResult> {
  if (!config) return skippedContentCheck();

  try {
    const hostRoot = await resolveHonoxApplicationRoot(project.configRoot);
    const contentDirectory = path.resolve(hostRoot, config.content.directory);
    const content = new ContentManager(
      contentDirectory,
      config.content.exclude,
      {
        config,
      },
    );
    const entries = await content.scan();
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
