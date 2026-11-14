import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type ContentLinkRetarget,
  type ContentMutationFileChange,
  type ContentMutationIssue,
  type ContentMutationOperation,
  type ContentMutationPlan,
  flattenContentMutationOperations,
  planContentLinkUpdates,
} from "@riebeckite/core";
import type { FileState, MutationContext } from "./mutation_context.js";
import {
  addCaseConflicts,
  buildContentIndex,
  foldRetargets,
  operationPath,
  sameContentIndex,
  stateOf,
} from "./mutation_files.js";
import { samePlan } from "./mutation_journal.js";
import {
  assertSafeExistingParents,
  isWithin,
  validateLogicalPath,
} from "./mutation_paths.js";
import { updateFrontmatter } from "./mutation_writes.js";

export async function plan(
  m: MutationContext,
  operations: readonly ContentMutationOperation[],
): Promise<ContentMutationPlan> {
  const root = await m.root();
  const conflicts: ContentMutationIssue[] = [];
  const warnings: ContentMutationIssue[] = [];
  const files = new Map<string, FileState>();
  await m.loadFiles(root, "", files);
  const initial = new Map(files);
  const touched = new Set<string>();
  const retargets: ContentLinkRetarget[] = [];

  for (const operation of flattenContentMutationOperations(operations)) {
    try {
      if (operation.kind === "create" || operation.kind === "asset-create") {
        const target = validateLogicalPath(operation.path);
        touched.add(target);
        if (files.has(target))
          throw new Error("A file already exists at this path.");
        files.set(target, stateOf(operation.content));
        continue;
      }
      if (operation.kind === "update" || operation.kind === "asset-update") {
        const target = validateLogicalPath(operation.path);
        touched.add(target);
        if (!files.has(target)) throw new Error("The file does not exist.");
        files.set(target, stateOf(operation.content));
        continue;
      }
      if (operation.kind === "delete" || operation.kind === "asset-delete") {
        const target = validateLogicalPath(operation.path);
        touched.add(target);
        if (!files.delete(target)) throw new Error("The file does not exist.");
        retargets.push({ from: target });
        continue;
      }
      if (
        operation.kind === "move" ||
        operation.kind === "rename" ||
        operation.kind === "asset-move"
      ) {
        const from = validateLogicalPath(operation.from);
        const to = validateLogicalPath(operation.to);
        touched.add(from);
        touched.add(to);
        const source = files.get(from);
        if (!source) throw new Error("The source file does not exist.");
        if (files.has(to))
          throw new Error("The destination file already exists.");
        files.delete(from);
        files.set(to, source);
        retargets.push({ from, to });
        continue;
      }
      if (operation.kind !== "frontmatter")
        throw new Error("Unsupported content mutation operation.");
      const target = validateLogicalPath(operation.path);
      touched.add(target);
      const source = files.get(target);
      if (!source) throw new Error("The file does not exist.");
      if (!m.isContentPath(target))
        throw new Error("Frontmatter can only be updated in content files.");
      files.set(
        target,
        updateFrontmatter(source, operation.set, operation.remove),
      );
      warnings.push({
        severity: "warning",
        code: "frontmatter-formatting",
        path: target,
        message:
          "The frontmatter document was serialized; comments and key order are retained where YAML permits.",
      });
    } catch (error) {
      conflicts.push({
        severity: "error",
        code: "invalid-operation",
        path: operationPath(operation),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const filePath of touched) {
    try {
      await assertSafeExistingParents(root, filePath);
    } catch (error) {
      conflicts.push({
        severity: "error",
        code: "unsafe-path",
        path: filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  addCaseConflicts(files, conflicts);
  const beforeBuild = buildContentIndex(
    initial,
    m.isContentPath,
    m.options.toSlug,
  );
  const afterBuild = buildContentIndex(
    files,
    m.isContentPath,
    m.options.toSlug,
  );
  const beforeIndex = beforeBuild.index;
  const afterIndex = afterBuild.index;
  if (retargets.length > 0 || !sameContentIndex(beforeIndex, afterIndex)) {
    const markdownFiles = new Map<string, string>();
    for (const [filePath, state] of files) {
      if (!m.isContentPath(filePath)) continue;
      try {
        markdownFiles.set(
          filePath,
          new TextDecoder("utf-8", {
            fatal: true,
            ignoreBOM: true,
          }).decode(state.content),
        );
      } catch {
        conflicts.push({
          severity: "error",
          code: "invalid-markdown-encoding",
          path: filePath,
          message: "The Markdown file is not valid UTF-8.",
        });
      }
    }
    const linkPlan = planContentLinkUpdates({
      files: markdownFiles,
      retargets: foldRetargets(retargets, files),
      beforeIndex,
      afterIndex,
      beforeAmbiguities: beforeBuild.ambiguities,
      afterAmbiguities: afterBuild.ambiguities,
      isContentPath: m.isContentPath,
      toSlug: m.options.toSlug,
    });
    for (const [filePath, content] of linkPlan.updates) {
      const existing = files.get(filePath);
      if (!existing) continue;
      files.set(filePath, stateOf(content));
    }
    warnings.push(...linkPlan.warnings);
    conflicts.push(...linkPlan.conflicts);
  }
  const paths = new Set([...initial.keys(), ...files.keys()]);
  const changes: ContentMutationFileChange[] = [...paths]
    .filter(
      (filePath) =>
        initial.get(filePath)?.fingerprint !== files.get(filePath)?.fingerprint,
    )
    .map((filePath) => ({
      path: filePath,
      beforeFingerprint: initial.get(filePath)?.fingerprint ?? null,
      afterFingerprint: files.get(filePath)?.fingerprint ?? null,
      content: files.get(filePath)?.content ?? null,
    }))
    .toSorted((left, right) => left.path.localeCompare(right.path));
  return {
    schemaVersion: 1,
    id: randomUUID(),
    operations,
    changes,
    preconditions: changes.map((change) => ({
      path: change.path,
      fingerprint: change.beforeFingerprint,
    })),
    warnings,
    conflicts,
  };
}

export async function planPath(
  _m: MutationContext,
  root: string,
  id: string | undefined,
  requested: string | undefined,
): Promise<string> {
  const plansRoot = path.join(root, ".riebeckite", "mutations", "plans");
  const target = requested
    ? path.resolve(plansRoot, requested)
    : path.join(plansRoot, `${id ?? ""}.json`);
  if (!isWithin(plansRoot, target))
    throw new Error("Plan path is outside the mutation plan directory.");
  if (requested) {
    const extension = path.extname(target).toLowerCase();
    if (extension !== ".json")
      throw new Error("Mutation plan must be a JSON file.");
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  return target;
}

export async function revalidatePlan(
  m: MutationContext,
  plan: ContentMutationPlan,
): Promise<ContentMutationIssue[]> {
  if (plan.schemaVersion !== 1)
    return [
      {
        severity: "error",
        code: "unsupported-plan",
        message: "The mutation plan has an unsupported schema version.",
      },
    ];
  const refreshed = await m.plan(plan.operations);
  if (!samePlan(plan, refreshed))
    return [
      {
        severity: "error",
        code: "stale-plan",
        message:
          "The saved plan no longer matches a fresh validation of its operations.",
      },
    ];
  return [];
}
