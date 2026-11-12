import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ContentIndexBuilder,
  type ContentLinkRetarget,
  type ContentMutationFileChange,
  type ContentMutationIssue,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentMutationRecoveryResult,
  type ContentMutationResult,
  type ContentMutationRollbackResult,
  type ContentSourceEntry,
  extractFrontmatterAliases,
  flattenContentMutationOperations,
  planContentLinkUpdates,
} from "@riebeckite/core";
import { parseDocument } from "yaml";
import {
  reclaimStaleLock,
  retryOnSharingViolation,
} from "./file_system_content_migration_helpers.js";
import {
  isRecord,
  type JournalChange,
  type MutationJournal,
  markApplied,
  parseJournal,
  parsePlan,
  samePlan,
  serializePlan,
} from "./mutation_journal.js";

type FileState = { readonly content: Uint8Array; readonly fingerprint: string };

export type FileSystemContentMutationOptions = {
  readonly beforeWrite?: (path: string) => void | Promise<void>;
  readonly beforeRecoveryRestore?: (path: string) => void | Promise<void>;
  readonly afterRecoveryCapture?: (path: string) => void | Promise<void>;
  readonly isContentPath?: (path: string) => boolean;
  readonly toSlug?: (path: string) => string | undefined;
};

export class FileSystemContentMutation {
  private readonly isContentPath: (path: string) => boolean;

  constructor(
    private readonly contentDirectory: string,
    private readonly options: FileSystemContentMutationOptions = {},
  ) {
    this.isContentPath = (path) =>
      this.options.isContentPath?.(path) ?? path.toLowerCase().endsWith(".md");
  }

  async plan(
    operations: readonly ContentMutationOperation[],
  ): Promise<ContentMutationPlan> {
    const root = await this.root();
    const conflicts: ContentMutationIssue[] = [];
    const warnings: ContentMutationIssue[] = [];
    const files = new Map<string, FileState>();
    await this.loadFiles(root, "", files);
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
          if (!files.delete(target))
            throw new Error("The file does not exist.");
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
        if (!this.isContentPath(target))
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
      this.isContentPath,
      this.options.toSlug,
    );
    const afterBuild = buildContentIndex(
      files,
      this.isContentPath,
      this.options.toSlug,
    );
    const beforeIndex = beforeBuild.index;
    const afterIndex = afterBuild.index;
    if (retargets.length > 0 || !sameContentIndex(beforeIndex, afterIndex)) {
      const markdownFiles = new Map<string, string>();
      for (const [filePath, state] of files) {
        if (!this.isContentPath(filePath)) continue;
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
        isContentPath: this.isContentPath,
        toSlug: this.options.toSlug,
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
          initial.get(filePath)?.fingerprint !==
          files.get(filePath)?.fingerprint,
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

  async apply(plan: ContentMutationPlan): Promise<ContentMutationResult> {
    const root = await this.root();
    const preconditionConflicts = await this.verifyPreconditions(
      root,
      plan.changes,
    );
    if (preconditionConflicts.length > 0)
      return {
        planId: plan.id,
        applied: false,
        appliedPaths: [],
        conflicts: preconditionConflicts,
      };
    const revalidated = await this.revalidatePlan(plan);
    if (revalidated.length > 0)
      return {
        planId: plan.id,
        applied: false,
        appliedPaths: [],
        conflicts: revalidated,
      };
    if (plan.conflicts.length > 0)
      return {
        planId: plan.id,
        applied: false,
        appliedPaths: [],
        conflicts: plan.conflicts,
      };
    const release = await this.acquireLock(root);
    try {
      const conflicts = await this.verifyPreconditions(root, plan.changes);
      if (conflicts.length > 0)
        return { planId: plan.id, applied: false, appliedPaths: [], conflicts };
      const journalDirectory = path.join(
        root,
        ".riebeckite",
        "mutations",
        plan.id,
      );
      await fs.mkdir(path.join(journalDirectory, "backups"), {
        recursive: true,
      });
      const journalPath = path.join(journalDirectory, "journal.json");
      const journal: MutationJournal = {
        version: 1,
        id: plan.id,
        state: "prepared",
        changes: await Promise.all(
          plan.changes.map((change) =>
            this.backup(root, journalDirectory, change),
          ),
        ),
      };
      await writeJsonAtomically(journalPath, journal);
      journal.state = "applying";
      await writeJsonAtomically(journalPath, journal);
      const appliedPaths: string[] = [];
      try {
        for (const change of plan.changes.filter(
          (change) => change.content !== null,
        )) {
          await this.options.beforeWrite?.(change.path);
          if (change.content === null)
            throw new Error("Mutation content is missing.");
          await writeFileAtomically(
            await safeFilePath(root, change.path, true),
            change.content,
            change.beforeFingerprint,
          );
          markApplied(journal, change.path);
          await writeJsonAtomically(journalPath, journal);
          appliedPaths.push(change.path);
        }
        for (const change of plan.changes.filter(
          (change) => change.content === null,
        )) {
          await this.options.beforeWrite?.(change.path);
          const target = await safeFilePath(root, change.path, false);
          if ((await fingerprintAt(target)) !== change.beforeFingerprint)
            throw new Error(`Content changed during apply: ${change.path}`);
          await retryOnSharingViolation(() => fs.rm(target));
          markApplied(journal, change.path);
          await writeJsonAtomically(journalPath, journal);
          appliedPaths.push(change.path);
        }
      } catch (error) {
        journal.state = "failed";
        await writeJsonAtomically(journalPath, journal);
        throw error;
      }
      journal.state = "complete";
      await writeJsonAtomically(journalPath, journal);
      return {
        planId: plan.id,
        applied: true,
        journalPath,
        appliedPaths,
        conflicts: [],
      };
    } finally {
      await release();
    }
  }

  async recover(journalPath: string): Promise<ContentMutationRecoveryResult> {
    const root = await this.root();
    const absoluteJournal = path.resolve(journalPath);
    const mutationRoot = path.join(root, ".riebeckite", "mutations");
    if (!isWithin(mutationRoot, absoluteJournal))
      throw new Error("Journal path is outside the mutation directory.");
    const journalDirectory = path.dirname(absoluteJournal);
    const release = await this.acquireLock(root);
    try {
      const journal = parseJournal(await fs.readFile(absoluteJournal, "utf8"));
      if (
        path.basename(absoluteJournal) !== "journal.json" ||
        path.basename(journalDirectory) !== journal.id ||
        path.basename(journalDirectory) === "plans"
      )
        throw new Error("Journal path does not belong to its mutation.");
      if (journal.state === "complete" || journal.state === "recovered")
        return {
          journalPath: absoluteJournal,
          recovered: false,
          restoredPaths: [],
          conflicts: [],
        };
      const conflicts: ContentMutationIssue[] = [];
      const rollback: JournalChange[] = [];
      for (const change of journal.changes) {
        let current: string | null;
        try {
          current = (await readState(root, change.path))?.fingerprint ?? null;
        } catch (error) {
          conflicts.push({
            severity: "error",
            code: "recovery-conflict",
            path: change.path,
            message: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        if (current === change.beforeFingerprint) continue;
        if (current !== change.afterFingerprint) {
          conflicts.push({
            severity: "error",
            code: "recovery-conflict",
            path: change.path,
            message: "The file changed after the interrupted mutation.",
          });
          continue;
        }
        rollback.push(change);
      }
      if (conflicts.length > 0)
        return {
          journalPath: absoluteJournal,
          recovered: false,
          restoredPaths: [],
          conflicts,
        };
      const backups = new Map<string, Uint8Array>();
      for (const change of rollback) {
        if (change.beforeFingerprint === null) continue;
        if (!change.backupPath) {
          conflicts.push({
            severity: "error",
            code: "recovery-backup-invalid",
            path: change.path,
            message: "The journal does not reference a backup.",
          });
          continue;
        }
        const backup = path.resolve(journalDirectory, change.backupPath);
        if (!isWithin(journalDirectory, backup)) {
          conflicts.push({
            severity: "error",
            code: "recovery-backup-invalid",
            path: change.path,
            message: "The backup path is outside the mutation journal.",
          });
          continue;
        }
        try {
          const content = await fs.readFile(backup);
          if (fingerprint(content) !== change.beforeFingerprint)
            throw new Error("The backup fingerprint does not match.");
          backups.set(change.path, content);
        } catch (error) {
          conflicts.push({
            severity: "error",
            code: "recovery-backup-invalid",
            path: change.path,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (conflicts.length > 0)
        return {
          journalPath: absoluteJournal,
          recovered: false,
          restoredPaths: [],
          conflicts,
        };
      const restoredPaths: string[] = [];
      for (const change of rollback) {
        const conflict = await this.restoreChange(
          root,
          journalDirectory,
          change,
          backups.get(change.path),
        );
        if (conflict) {
          conflicts.push(conflict);
          break;
        }
        restoredPaths.push(change.path);
      }
      if (conflicts.length > 0)
        return {
          journalPath: absoluteJournal,
          recovered: false,
          restoredPaths,
          conflicts,
        };
      journal.state = "recovered";
      await writeJsonAtomically(absoluteJournal, journal);
      return {
        journalPath: absoluteJournal,
        recovered: true,
        restoredPaths,
        conflicts: [],
      };
    } finally {
      await release();
    }
  }

  async rollback(journalPath: string): Promise<ContentMutationRollbackResult> {
    const root = await this.root();
    const absoluteJournal = path.resolve(journalPath);
    const mutationRoot = path.join(root, ".riebeckite", "mutations");
    const journalDirectory = path.dirname(absoluteJournal);
    const release = await this.acquireLock(root);
    try {
      if (!isWithin(mutationRoot, absoluteJournal))
        throw new Error("Journal path is outside the mutation directory.");
      const journal = parseJournal(await fs.readFile(absoluteJournal, "utf8"));
      if (
        path.basename(absoluteJournal) !== "journal.json" ||
        path.basename(journalDirectory) !== journal.id ||
        path.basename(journalDirectory) === "plans"
      )
        throw new Error("Journal path does not belong to its mutation.");
      if (journal.state === "rolled-back")
        return {
          journalPath: absoluteJournal,
          rolledBack: false,
          skipped: true,
          restoredPaths: [],
          conflicts: [],
        };
      if (journal.state !== "complete")
        return {
          journalPath: absoluteJournal,
          rolledBack: false,
          skipped: false,
          restoredPaths: [],
          conflicts: [
            {
              severity: "error",
              code: "rollback-journal-incomplete",
              message: "Only a completed mutation can be rolled back.",
            },
          ],
        };
      const conflicts: ContentMutationIssue[] = [];
      const backups = new Map<string, Uint8Array>();
      for (const change of journal.changes) {
        let current: string | null = null;
        try {
          current = (await readState(root, change.path))?.fingerprint ?? null;
        } catch (error) {
          conflicts.push({
            severity: "error",
            code: "rollback-conflict",
            path: change.path,
            message: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
        if (current !== change.afterFingerprint) {
          conflicts.push({
            severity: "error",
            code: "rollback-conflict",
            path: change.path,
            message: "The file changed after the mutation was applied.",
          });
          continue;
        }
        if (change.beforeFingerprint === null) continue;
        if (!change.backupPath) {
          conflicts.push({
            severity: "error",
            code: "rollback-backup-invalid",
            path: change.path,
            message: "The journal does not reference a backup.",
          });
          continue;
        }
        const backup = path.resolve(journalDirectory, change.backupPath);
        if (!isWithin(journalDirectory, backup)) {
          conflicts.push({
            severity: "error",
            code: "rollback-backup-invalid",
            path: change.path,
            message: "The backup path is outside the mutation journal.",
          });
          continue;
        }
        try {
          const content = await fs.readFile(backup);
          if (fingerprint(content) !== change.beforeFingerprint)
            throw new Error("The backup fingerprint does not match.");
          backups.set(change.path, content);
        } catch (error) {
          conflicts.push({
            severity: "error",
            code: "rollback-backup-invalid",
            path: change.path,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      if (conflicts.length > 0)
        return {
          journalPath: absoluteJournal,
          rolledBack: false,
          skipped: false,
          restoredPaths: [],
          conflicts,
        };
      const restoredPaths: string[] = [];
      for (const change of journal.changes) {
        const conflict = await this.restoreChange(
          root,
          journalDirectory,
          change,
          backups.get(change.path),
        );
        if (conflict) {
          conflicts.push(conflict);
          break;
        }
        restoredPaths.push(change.path);
      }
      if (conflicts.length > 0)
        return {
          journalPath: absoluteJournal,
          rolledBack: false,
          skipped: false,
          restoredPaths,
          conflicts,
        };
      journal.state = "rolled-back";
      await writeJsonAtomically(absoluteJournal, journal);
      return {
        journalPath: absoluteJournal,
        rolledBack: true,
        skipped: false,
        restoredPaths,
        conflicts: [],
      };
    } finally {
      await release();
    }
  }

  private async restoreChange(
    root: string,
    journalDirectory: string,
    change: JournalChange,
    backup: Uint8Array | undefined,
  ): Promise<ContentMutationIssue | null> {
    if (change.afterFingerprint === null) {
      if (change.beforeFingerprint === null || !backup)
        return recoveryConflict(
          change.path,
          "The deletion cannot be rolled back safely.",
        );
      const target = await safeFilePath(root, change.path, true);
      try {
        await writeFileExclusive(target, backup);
        return null;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          return recoveryConflict(
            change.path,
            "A file appeared during recovery; it was not overwritten.",
          );
        throw error;
      }
    }
    await this.options.beforeRecoveryRestore?.(change.path);
    const target = await safeFilePath(root, change.path, false);
    const captureDirectory = path.join(journalDirectory, "quarantine");
    await fs.mkdir(captureDirectory, { recursive: true });
    const captured = path.join(captureDirectory, `${randomUUID()}.capture`);
    try {
      await fs.rename(target, captured);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return recoveryConflict(
          change.path,
          "The file disappeared before it could be verified.",
        );
      throw error;
    }
    const content = await fs.readFile(captured);
    if (fingerprint(content) !== change.afterFingerprint) {
      await restoreCapturedFile(target, captured);
      return recoveryConflict(
        change.path,
        "The file changed after verification; its content was preserved and not overwritten.",
      );
    }
    await this.options.afterRecoveryCapture?.(change.path);
    if (change.beforeFingerprint === null) {
      try {
        await fs.lstat(target);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
      return recoveryConflict(
        change.path,
        "A file appeared during recovery; it was not deleted.",
      );
    }
    try {
      await writeFileExclusive(target, backup as Uint8Array);
      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        return recoveryConflict(
          change.path,
          "A file appeared during recovery; it was not overwritten.",
        );
      throw error;
    }
  }

  async savePlan(
    plan: ContentMutationPlan,
    planPath?: string,
  ): Promise<string> {
    const root = await this.root();
    const target = await this.planPath(root, plan.id, planPath);
    await writeJsonAtomically(target, serializePlan(plan));
    return target;
  }

  async loadPlan(planPath: string): Promise<ContentMutationPlan> {
    const root = await this.root();
    const absolute = await this.planPath(root, undefined, planPath);
    return parsePlan(await fs.readFile(absolute, "utf8"));
  }

  private async revalidatePlan(
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
    const refreshed = await this.plan(plan.operations);
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

  private async planPath(
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

  private async root(): Promise<string> {
    const root = await fs.realpath(this.contentDirectory);
    if (!(await fs.stat(root)).isDirectory())
      throw new Error("Content directory is not a directory.");
    return root;
  }

  private async loadFiles(
    root: string,
    relative: string,
    files: Map<string, FileState>,
  ): Promise<void> {
    for (const entry of await fs.readdir(path.join(root, relative), {
      withFileTypes: true,
    })) {
      if (entry.name === ".riebeckite" && relative === "") continue;
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await this.loadFiles(root, child, files);
      if (entry.isFile())
        files.set(child, stateOf(await fs.readFile(path.join(root, child))));
    }
  }

  private async verifyPreconditions(
    root: string,
    changes: readonly ContentMutationFileChange[],
  ): Promise<ContentMutationIssue[]> {
    const conflicts: ContentMutationIssue[] = [];
    for (const change of changes) {
      try {
        const current = await readState(root, change.path);
        if ((current?.fingerprint ?? null) !== change.beforeFingerprint)
          conflicts.push({
            severity: "error",
            code: "concurrent-modification",
            path: change.path,
            message: "The file no longer matches the planned fingerprint.",
          });
      } catch (error) {
        conflicts.push({
          severity: "error",
          code: "unsafe-path",
          path: change.path,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return conflicts;
  }

  private async backup(
    root: string,
    journalDirectory: string,
    change: ContentMutationFileChange,
  ): Promise<JournalChange> {
    if (change.beforeFingerprint === null)
      return {
        path: change.path,
        beforeFingerprint: null,
        afterFingerprint: change.afterFingerprint,
        status: "pending",
      };
    const state = await readState(root, change.path);
    if (!state || state.fingerprint !== change.beforeFingerprint)
      throw new Error(`Could not back up ${change.path}.`);
    const backupPath = `backups/${Buffer.from(change.path).toString("base64url")}`;
    await writeFileAtomically(
      path.join(journalDirectory, backupPath),
      state.content,
    );
    return {
      path: change.path,
      beforeFingerprint: change.beforeFingerprint,
      afterFingerprint: change.afterFingerprint,
      backupPath,
      status: "pending",
    };
  }

  private async acquireLock(root: string): Promise<() => Promise<void>> {
    const lockPath = path.join(root, ".riebeckite", "mutations", "lock");
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    let handle: fs.FileHandle;
    try {
      handle = await fs.open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        if (await reclaimStaleLock(lockPath))
          return await this.acquireLock(root);
      }
      throw new Error(
        "Another content mutation is already applying or requires recovery.",
      );
    }
    const token = randomUUID();
    await handle.writeFile(
      JSON.stringify({
        pid: process.pid,
        token,
        startedAt: new Date().toISOString(),
      }),
    );
    return async () => {
      await handle.close();
      try {
        const current = JSON.parse(await fs.readFile(lockPath, "utf8"));
        if (isRecord(current) && current.token === token)
          await fs.rm(lockPath, { force: true });
      } catch {}
    };
  }
}

function validateLogicalPath(value: string): string {
  const normalized = value.replaceAll("\\", "/").normalize("NFC");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    path.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    normalized
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          hasForbiddenPathCharacter(part) ||
          /[. ]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part),
      )
  )
    throw new Error("Invalid content path.");
  return normalized;
}

function hasForbiddenPathCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code <= 31 || '<>:"|?*'.includes(character);
  });
}

async function safeFilePath(
  root: string,
  logicalPath: string,
  createParents: boolean,
): Promise<string> {
  const normalized = validateLogicalPath(logicalPath);
  const filePath = path.resolve(root, ...normalized.split("/"));
  if (!isWithin(root, filePath))
    throw new Error("Content path escapes the workspace.");
  const parent = path.dirname(filePath);
  if (createParents) await fs.mkdir(parent, { recursive: true });
  let current = root;
  for (const part of path
    .relative(root, parent)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, part);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory())
      throw new Error(
        "Content path traverses a symbolic link or non-directory.",
      );
  }
  try {
    if ((await fs.lstat(filePath)).isSymbolicLink())
      throw new Error("Content path is a symbolic link.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return filePath;
}

async function assertSafeExistingParents(
  root: string,
  logicalPath: string,
): Promise<void> {
  const normalized = validateLogicalPath(logicalPath);
  let current = root;
  for (const part of normalized.split("/").slice(0, -1)) {
    current = path.join(current, part);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory())
        throw new Error(
          "Content path traverses a symbolic link or non-directory.",
        );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
}

async function readState(
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

function stateOf(content: string | Uint8Array): FileState {
  const bytes =
    typeof content === "string"
      ? Buffer.from(content)
      : new Uint8Array(content);
  return { content: bytes, fingerprint: fingerprint(bytes) };
}
function fingerprint(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}
function foldRetargets(
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

function normalizedPath(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function buildContentIndex(
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
function sameContentIndex(
  left: ReadonlyMap<string, string>,
  right: ReadonlyMap<string, string>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (right.get(key) !== value) return false;
  }
  return true;
}
function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
function operationPath(
  operation: Exclude<ContentMutationOperation, { kind: "batch" }>,
): string {
  return "path" in operation ? operation.path : operation.to;
}
function addCaseConflicts(
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
function recoveryConflict(
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
async function writeFileExclusive(
  filePath: string,
  content: Uint8Array,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const handle = await fs.open(filePath, "wx");
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
}
async function restoreCapturedFile(
  target: string,
  captured: string,
): Promise<void> {
  try {
    await writeFileExclusive(target, await fs.readFile(captured));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}
async function writeFileAtomically(
  filePath: string,
  content: Uint8Array,
  expectedFingerprint?: string | null,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  try {
    const handle = await fs.open(temporary, "wx");
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }
    if (
      expectedFingerprint !== undefined &&
      (await fingerprintAt(filePath)) !== expectedFingerprint
    )
      throw new Error(`Content changed during apply: ${filePath}`);
    await retryOnSharingViolation(() => fs.rename(temporary, filePath));
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
async function fingerprintAt(filePath: string): Promise<string | null> {
  try {
    const stats = await fs.lstat(filePath);
    if (!stats.isFile() || stats.isSymbolicLink())
      throw new Error("Content path is not a regular file.");
    return fingerprint(await fs.readFile(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function writeJsonAtomically(
  filePath: string,
  value: unknown,
): Promise<void> {
  await writeFileAtomically(
    filePath,
    Buffer.from(`${JSON.stringify(value, null, 2)}\n`),
  );
}
function updateFrontmatter(
  source: FileState,
  set: Readonly<Record<string, unknown>> | undefined,
  remove: readonly string[] | undefined,
): FileState {
  let text: string;
  try {
    text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(source.content);
  } catch {
    throw new Error("The Markdown file is not valid UTF-8.");
  }
  const bom = text.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom ? text.slice(1) : text;
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(body);
  if (!match) throw new Error("The Markdown file has no YAML frontmatter.");
  const document = parseDocument(match[2]);
  if (document.errors.length > 0)
    throw new Error(`Invalid YAML frontmatter: ${document.errors[0]?.message}`);
  for (const [key, value] of Object.entries(set ?? {}))
    document.setIn(key.split("."), value);
  for (const key of remove ?? []) document.deleteIn(key.split("."));
  return stateOf(
    `${bom}${match[1]}${document.toString().trimEnd()}${match[3]}${body.slice(match[0].length)}`,
  );
}
