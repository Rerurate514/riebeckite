import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type ContentMutationFileChange,
  type ContentMutationIssue,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentMutationRecoveryResult,
  type ContentMutationResult,
  flattenContentMutationOperations,
} from "@riebeckite/core";
import { parseDocument } from "yaml";

type FileState = { readonly content: Uint8Array; readonly fingerprint: string };

type MutationJournal = {
  readonly version: 1;
  readonly id: string;
  state: "prepared" | "applying" | "failed" | "complete" | "recovered";
  readonly changes: readonly JournalChange[];
};

type JournalChange = {
  readonly path: string;
  readonly beforeFingerprint: string | null;
  readonly afterFingerprint: string | null;
  readonly backupPath?: string;
  status: "pending" | "applied";
};

export type FileSystemContentMutationOptions = {
  readonly beforeWrite?: (path: string) => void | Promise<void>;
};

export class FileSystemContentMutation {
  constructor(
    private readonly contentDirectory: string,
    private readonly options: FileSystemContentMutationOptions = {},
  ) {}

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
          continue;
        }
        if (operation.kind !== "frontmatter")
          throw new Error("Unsupported content mutation operation.");
        const target = validateLogicalPath(operation.path);
        touched.add(target);
        const source = files.get(target);
        if (!source) throw new Error("The file does not exist.");
        if (!target.toLowerCase().endsWith(".md"))
          throw new Error("Frontmatter can only be updated in Markdown files.");
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
    if (plan.conflicts.length > 0)
      return {
        planId: plan.id,
        applied: false,
        appliedPaths: [],
        conflicts: plan.conflicts,
      };
    const root = await this.root();
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
          );
          markApplied(journal, change.path);
          await writeJsonAtomically(journalPath, journal);
          appliedPaths.push(change.path);
        }
        for (const change of plan.changes.filter(
          (change) => change.content === null,
        )) {
          await this.options.beforeWrite?.(change.path);
          await fs.rm(await safeFilePath(root, change.path, false));
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
    const release = await this.acquireLock(root);
    try {
      const journal = parseJournal(await fs.readFile(absoluteJournal, "utf8"));
      if (journal.state === "complete" || journal.state === "recovered")
        return {
          journalPath: absoluteJournal,
          recovered: false,
          restoredPaths: [],
          conflicts: [],
        };
      const conflicts: ContentMutationIssue[] = [];
      for (const change of journal.changes.filter(
        (change) => change.status === "applied",
      )) {
        const current = await readState(root, change.path);
        if (current?.fingerprint !== change.afterFingerprint) {
          conflicts.push({
            severity: "error",
            code: "recovery-conflict",
            path: change.path,
            message: "The file changed after the interrupted mutation.",
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
      for (const change of journal.changes.filter(
        (change) => change.status === "applied",
      )) {
        const target = await safeFilePath(
          root,
          change.path,
          change.beforeFingerprint !== null,
        );
        if (change.beforeFingerprint === null)
          await fs.rm(target, { force: true });
        else {
          if (!change.backupPath)
            throw new Error(`Missing backup for ${change.path}.`);
          const backup = path.resolve(
            path.dirname(absoluteJournal),
            change.backupPath,
          );
          if (!isWithin(path.dirname(absoluteJournal), backup))
            throw new Error("Backup path is invalid.");
          const content = await fs.readFile(backup);
          if (fingerprint(content) !== change.beforeFingerprint)
            throw new Error(`Backup is corrupt for ${change.path}.`);
          await writeFileAtomically(target, content);
        }
        restoredPaths.push(change.path);
      }
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
      const current = await readState(root, change.path);
      if ((current?.fingerprint ?? null) !== change.beforeFingerprint)
        conflicts.push({
          severity: "error",
          code: "concurrent-modification",
          path: change.path,
          message: "The file no longer matches the planned fingerprint.",
        });
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
    } catch {
      throw new Error(
        "Another content mutation is already applying or requires recovery.",
      );
    }
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    return async () => {
      await handle.close();
      await fs.rm(lockPath, { force: true });
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
function markApplied(journal: MutationJournal, filePath: string): void {
  const change = journal.changes.find(
    (candidate) => candidate.path === filePath,
  );
  if (!change) throw new Error(`Journal change is missing: ${filePath}`);
  change.status = "applied";
}
async function writeFileAtomically(
  filePath: string,
  content: Uint8Array,
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
    await fs.rename(temporary, filePath);
  } finally {
    await fs.rm(temporary, { force: true });
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
function parseJournal(value: string): MutationJournal {
  const journal = JSON.parse(value) as Partial<MutationJournal>;
  if (
    journal.version !== 1 ||
    typeof journal.id !== "string" ||
    !Array.isArray(journal.changes) ||
    !["prepared", "applying", "failed", "complete", "recovered"].includes(
      journal.state ?? "",
    )
  )
    throw new Error("Journal is missing or corrupt.");
  return journal as MutationJournal;
}
function updateFrontmatter(
  source: FileState,
  set: Readonly<Record<string, unknown>> | undefined,
  remove: readonly string[] | undefined,
): FileState {
  const text = Buffer.from(source.content).toString("utf8");
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/.exec(text);
  if (!match) throw new Error("The Markdown file has no YAML frontmatter.");
  const document = parseDocument(match[2]);
  if (document.errors.length > 0)
    throw new Error(`Invalid YAML frontmatter: ${document.errors[0]?.message}`);
  for (const [key, value] of Object.entries(set ?? {}))
    document.setIn(key.split("."), value);
  for (const key of remove ?? []) document.deleteIn(key.split("."));
  return stateOf(
    `${match[1]}${document.toString().trimEnd()}${match[3]}${text.slice(match[0].length)}`,
  );
}
