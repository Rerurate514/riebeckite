import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import {
  ContentIndexBuilder,
  type ContentLinkRetarget,
  type ContentMutationIssue,
  type ContentMutationOperation,
  type ContentSourceEntry,
  extractFrontmatterAliases,
} from "@riebeckite/core";
import type { FileState } from "./mutation_context.js";
import { safeFilePath } from "./mutation_paths.js";

export async function readState(
  root: string,
  logicalPath: string,
): Promise<FileState | null> {
  try {
    const filePath = await safeFilePath(root, logicalPath, false);
    const stats = await fs.lstat(filePath);
    if (!stats.isFile() || stats.isSymbolicLink())
      throw new Error("Content path is not a regular file.");
    return stateOf(await fs.readFile(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function stateOf(content: string | Uint8Array): FileState {
  const bytes =
    typeof content === "string"
      ? Buffer.from(content)
      : new Uint8Array(content);
  return { content: bytes, fingerprint: fingerprint(bytes) };
}

export function fingerprint(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

export function foldRetargets(
  retargets: readonly ContentLinkRetarget[],
  files: ReadonlyMap<string, FileState>,
): ContentLinkRetarget[] {
  const byFrom = new Map(
    retargets.map((retarget) => [normalizedPath(retarget.from), retarget]),
  );
  const existing = new Set([...files.keys()].map(normalizedPath));
  return retargets
    .filter((retarget) => !existing.has(normalizedPath(retarget.from)))
    .map((retarget) => {
      if (!retarget.to) return retarget;
      let to = retarget.to;
      const seen = new Set([normalizedPath(retarget.from)]);
      for (;;) {
        const key = normalizedPath(to);
        const next = byFrom.get(key);
        if (!next?.to || seen.has(key)) break;
        seen.add(key);
        to = next.to;
      }
      return to === retarget.to ? retarget : { from: retarget.from, to };
    });
}

export function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

export function buildContentIndex(
  files: ReadonlyMap<string, FileState>,
  isContentPath: (path: string) => boolean,
  toSlug?: (path: string) => string | undefined,
): ReturnType<typeof ContentIndexBuilder.buildFromAliases> {
  const decoder = new TextDecoder();
  const entries: ContentSourceEntry[] = [];
  const aliasesByPath = new Map<string, readonly string[]>();
  for (const [filePath, state] of files) {
    entries.push({ path: filePath });
    if (isContentPath(filePath))
      aliasesByPath.set(
        filePath,
        extractFrontmatterAliases(decoder.decode(state.content)),
      );
  }
  return ContentIndexBuilder.buildFromAliases(
    entries,
    aliasesByPath,
    isContentPath,
    toSlug,
  );
}

export function sameContentIndex(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (right.get(key) !== value) return false;
  }
  return true;
}

export function operationPath(
  operation: Exclude<ContentMutationOperation, { kind: "batch" }>,
): string {
  return "path" in operation ? operation.path : operation.to;
}

export function addCaseConflicts(
  files: ReadonlyMap<string, FileState>,
  conflicts: ContentMutationIssue[],
): void {
  const seen = new Map<string, string>();
  for (const filePath of files.keys()) {
    const folded = filePath.toLocaleLowerCase("en-US");
    const previous = seen.get(folded);
    if (previous && previous !== filePath)
      conflicts.push({
        severity: "error",
        code: "case-collision",
        path: filePath,
        message: `Path conflicts with ${previous} on a case-insensitive filesystem.`,
      });
    else seen.set(folded, filePath);
  }
}

export function recoveryConflict(
  filePath: string,
  message: string,
): ContentMutationIssue {
  return {
    severity: "error",
    code: "recovery-conflict",
    path: filePath,
    message,
  };
}
