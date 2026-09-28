import path from "node:path";
import {
  type ContentBuildStateInvalidReason,
  type ContentSource,
  type ContentSourceContent,
  type ContentSourceEntry,
  fingerprintContentEntries,
  loadContentBuildState,
  type ResolvedRiebeckiteConfig,
  readContentBuildStateStatus,
  resolveContentBuildStatePath,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../../application_root.js";
import { resolveProjectContentSource } from "../../content_source.js";
import type { DoctorCheckResult } from "../types.js";

const mismatchSampleLimit = 3;

const invalidReasonMessages: Readonly<
  Record<ContentBuildStateInvalidReason, string>
> = {
  "malformed-json": "State file is not valid JSON.",
  "unsupported-version": "State file version is not supported.",
  "invalid-shape": "State file structure is not recognized.",
};

export async function checkBuildState(
  project: RiebeckiteProject,
  config: ResolvedRiebeckiteConfig | undefined,
): Promise<{ result: DoctorCheckResult; statePath?: string }> {
  if (!config) {
    return {
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "skipped",
        message: "Skipped because configuration is unavailable.",
      },
    };
  }

  const statePath = resolveContentBuildStatePath(config, undefined);
  try {
    const status = await readContentBuildStateStatus(statePath);
    if (status.kind === "valid") {
      const mismatches = await compareWithCurrentContent(
        project,
        config,
        statePath,
      );
      if (!mismatches) {
        return {
          statePath,
          result: {
            id: "build-state",
            label: "Incremental build state",
            status: "ok",
            message: `Valid; ${status.entryCount} entries match current content.`,
          },
        };
      }
      return {
        statePath,
        result: {
          id: "build-state",
          label: "Incremental build state",
          status: "warning",
          message: "State does not match current content.",
          details: mismatches,
        },
      };
    }
    if (status.kind === "missing") {
      return {
        statePath,
        result: {
          id: "build-state",
          label: "Incremental build state",
          status: "skipped",
          message: "No incremental build state yet.",
        },
      };
    }
    return {
      statePath,
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "warning",
        message: "Invalid state will fall back to a full build.",
        details: [invalidReasonMessages[status.reason]],
      },
    };
  } catch (error) {
    return {
      statePath,
      result: {
        id: "build-state",
        label: "Incremental build state",
        status: "error",
        message: "Could not read state.",
        cause: error,
      },
    };
  }
}

async function compareWithCurrentContent(
  project: RiebeckiteProject,
  config: ResolvedRiebeckiteConfig,
  statePath: string,
): Promise<string[] | undefined> {
  const state = await loadContentBuildState(statePath);
  if (!state) return ["State file could not be read for comparison."];

  const source = resolveProjectContentSource(config, project);
  const current = await fingerprintContentEntries(
    await source.scan(),
    (entry) => readEntryContent(source, entry),
  );
  const currentByPath = new Map(
    current.map(({ entry, fingerprint }) => [entry.path, fingerprint]),
  );

  const added: string[] = [];
  const changed: string[] = [];
  for (const [entryPath, fingerprint] of currentByPath) {
    const previous = state.entries[entryPath];
    if (!previous) {
      added.push(entryPath);
      continue;
    }
    if (previous.fingerprint !== fingerprint) changed.push(entryPath);
  }
  const removed = Object.keys(state.entries).filter(
    (entryPath) => !currentByPath.has(entryPath),
  );

  if (added.length === 0 && changed.length === 0 && removed.length === 0) {
    return undefined;
  }

  return [
    `${added.length} new, ${changed.length} changed, ${removed.length} removed since the last build.`,
    ...samples("New", added),
    ...samples("Changed", changed),
    ...samples("Removed", removed),
  ];
}

async function readEntryContent(
  source: ContentSource,
  entry: ContentSourceEntry,
): Promise<ContentSourceContent> {
  const content = await source.read(entry);
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function samples(label: string, paths: readonly string[]): string[] {
  return paths
    .slice(0, mismatchSampleLimit)
    .map((entry) => `${label}: ${entry}`);
}

export function stateDirectoryPath(statePath: string): string {
  return path.dirname(statePath);
}
