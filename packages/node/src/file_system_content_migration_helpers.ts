import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentMigrationBatch,
  ContentMigrationDiagnostic,
  ContentMigrationRecord,
  ContentMutationFileChange,
  ContentMutationOperation,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import type {
  ContentMigrationPlan,
  ContentMigrationVerification,
} from "./file_system_content_migration_types.js";

// shortcut: only the official permalink plugin declares the frontmatter redirect field; other redirect producers must pass redirectField explicitly.
export function redirectFieldFromConfig(
  config: ResolvedRiebeckiteConfig | undefined,
): string {
  const options = config?.plugins.find((plugin) => plugin.name === "permalink")
    ?.options as
    | { readonly redirects?: { readonly frontmatter?: unknown } }
    | undefined;
  const field = options?.redirects?.frontmatter;
  if (field === undefined) return "redirect_from";
  if (typeof field !== "string" || field.trim() === "")
    throw new Error(
      "The permalink redirects.frontmatter option must be a non-empty string.",
    );
  return field;
}

export function fingerprintFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  const hash = createHash("sha256");
  for (const file of [...files].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(createHash("sha256").update(file.content).digest("hex"));
    hash.update("\n");
  }
  return hash.digest("hex");
}

export function fingerprintMutationPlan(
  operations: readonly ContentMutationOperation[],
  changes: readonly ContentMutationFileChange[],
): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        operations,
        changes: changes.map((change) => ({
          path: change.path,
          beforeFingerprint: change.beforeFingerprint,
          afterFingerprint: change.afterFingerprint,
        })),
      }),
    )
    .digest("hex");
}

export function fingerprintPlan(input: {
  readonly migrations: readonly {
    readonly id: string;
    readonly version: number;
    readonly fingerprint: string;
  }[];
  readonly baseContentFingerprint: string;
  readonly mutationPlanFingerprint: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
}): string {
  return createHash("sha256")
    .update(
      canonicalJson({
        migrations: input.migrations.map((migration) => ({
          id: migration.id,
          version: migration.version,
          fingerprint: migration.fingerprint,
        })),
        baseContentFingerprint: input.baseContentFingerprint,
        mutationPlanFingerprint: input.mutationPlanFingerprint,
        operations: input.operations,
        diagnostics: input.diagnostics.map((diagnostic) => ({
          severity: diagnostic.severity,
          code: diagnostic.code,
          path: diagnostic.path,
        })),
        conflicts: input.conflicts.map((conflict) => ({
          code: conflict.code,
          path: conflict.path,
        })),
      }),
    )
    .digest("hex");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

export function findEntry(
  manifest: ContentManifest,
  contentPath: string,
): ContentManifestEntry | undefined {
  const base = contentPath.replace(/\.md$/i, "");
  return (
    manifest.bySlug.get(base) ??
    manifest.bySlug.get(`${base}/index`) ??
    manifest.bySlug.get(base.replace(/\/index$/i, ""))
  );
}

export function changedFrontmatterKeys(
  file: ContentMigrationBatch["files"][number],
): Set<string> {
  const keys = new Set<string>();
  for (const key of new Set([
    ...Object.keys(file.frontmatter),
    ...Object.keys(file.originalFrontmatter),
  ])) {
    if (
      canonicalJson(file.frontmatter[key]) !==
      canonicalJson(file.originalFrontmatter[key])
    )
      keys.add(key);
  }
  return keys;
}

export function diagnosticKey(diagnostic: {
  readonly code: string;
  readonly filePath?: string;
  readonly target?: string;
}): string {
  return `${diagnostic.code}\0${diagnostic.filePath ?? ""}\0${diagnostic.target ?? ""}`;
}

export function mutationIssue(
  issue: {
    readonly severity: "warning" | "error";
    readonly code: string;
    readonly message: string;
    readonly path?: string;
  },
  severity: "warning" | "error",
): ContentMigrationDiagnostic {
  return {
    severity,
    code: issue.code,
    message: issue.message,
    path: issue.path,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseContentMigrationPlan(
  value: unknown,
): ContentMigrationPlan | undefined {
  if (!isRecord(value)) return undefined;
  const {
    id,
    createdAt,
    migrations,
    changes,
    baseContentFingerprint,
    mutationPlanId,
    mutationPlanFingerprint,
    planFingerprint,
    operations,
    diagnostics,
    conflicts,
    selections,
    skipped,
    impact,
    verification,
  } = value;
  if (typeof id !== "string") return undefined;
  if (typeof createdAt !== "string") return undefined;
  if (typeof baseContentFingerprint !== "string") return undefined;
  if (typeof mutationPlanId !== "string") return undefined;
  if (typeof mutationPlanFingerprint !== "string") return undefined;
  if (typeof planFingerprint !== "string") return undefined;
  if (!Array.isArray(migrations)) return undefined;
  if (!Array.isArray(changes)) return undefined;
  if (!Array.isArray(operations)) return undefined;
  if (!Array.isArray(diagnostics)) return undefined;
  if (!Array.isArray(conflicts)) return undefined;
  if (!Array.isArray(selections)) return undefined;
  if (!Array.isArray(skipped)) return undefined;
  if (!isMigrationImpact(impact)) return undefined;
  if (!isMigrationVerification(verification)) return undefined;
  const parsedMigrations = migrations.filter(isPlanMigration);
  if (parsedMigrations.length !== migrations.length) return undefined;
  const parsedChanges = changes.filter(isPlanFile);
  if (parsedChanges.length !== changes.length) return undefined;
  return {
    schemaVersion: 1,
    id,
    createdAt,
    migrations: parsedMigrations,
    baseContentFingerprint,
    mutationPlanId,
    mutationPlanFingerprint,
    planFingerprint,
    operations: operations as ContentMigrationPlan["operations"],
    changes: parsedChanges,
    diagnostics: diagnostics as ContentMigrationPlan["diagnostics"],
    conflicts: conflicts as ContentMigrationPlan["conflicts"],
    selections: selections as ContentMigrationPlan["selections"],
    skipped: skipped as ContentMigrationPlan["skipped"],
    impact,
    verification,
  };
}

function isPlanMigration(
  value: unknown,
): value is ContentMigrationPlan["migrations"][number] {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.version === "number" &&
    typeof value.fingerprint === "string"
  );
}

function isPlanFile(
  value: unknown,
): value is ContentMigrationPlan["changes"][number] {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    (value.beforeFingerprint === null ||
      typeof value.beforeFingerprint === "string") &&
    (value.afterFingerprint === null ||
      typeof value.afterFingerprint === "string")
  );
}

function isMigrationImpact(
  value: unknown,
): value is ContentMigrationBatch["impact"] {
  return (
    isRecord(value) &&
    typeof value.files === "number" &&
    typeof value.moved === "number" &&
    typeof value.frontmatter === "number" &&
    typeof value.created === "number" &&
    typeof value.deleted === "number"
  );
}

function isMigrationVerification(
  value: unknown,
): value is ContentMigrationVerification {
  return (
    isRecord(value) &&
    typeof value.beforeFiles === "number" &&
    typeof value.afterFiles === "number" &&
    typeof value.beforePublicationFingerprint === "string" &&
    typeof value.afterPublicationFingerprint === "string" &&
    typeof value.derivedViews === "number"
  );
}

export function sameMigrationPlan(
  left: ContentMigrationPlan,
  right: ContentMigrationPlan,
): boolean {
  if (
    left.baseContentFingerprint !== right.baseContentFingerprint ||
    left.mutationPlanFingerprint !== right.mutationPlanFingerprint ||
    left.planFingerprint !== right.planFingerprint ||
    canonicalJson(left.operations) !== canonicalJson(right.operations) ||
    canonicalJson(left.changes) !== canonicalJson(right.changes) ||
    left.migrations.length !== right.migrations.length
  )
    return false;
  return left.migrations.every(
    (migration, index) =>
      migration.id === right.migrations[index]?.id &&
      migration.version === right.migrations[index]?.version &&
      migration.fingerprint === right.migrations[index]?.fingerprint,
  );
}

export function isAppliedRecord(
  record: ContentMigrationRecord | undefined,
  fingerprint: string,
): boolean {
  return (
    record?.status === "applied" && record.definitionFingerprint === fingerprint
  );
}

export type JournalSnapshot = {
  readonly state: string;
  readonly changes: readonly {
    readonly path: string;
    readonly afterFingerprint: string | null;
  }[];
};

export async function readJournalSnapshot(
  journalPath: string,
): Promise<JournalSnapshot | undefined> {
  try {
    const value = JSON.parse(await fs.readFile(journalPath, "utf8")) as unknown;
    if (
      !isRecord(value) ||
      typeof value.state !== "string" ||
      !Array.isArray(value.changes)
    )
      return undefined;
    const changes: { path: string; afterFingerprint: string | null }[] = [];
    for (const change of value.changes) {
      if (
        !isRecord(change) ||
        typeof change.path !== "string" ||
        !(
          change.afterFingerprint === null ||
          typeof change.afterFingerprint === "string"
        )
      )
        return undefined;
      changes.push({
        path: change.path,
        afterFingerprint: change.afterFingerprint as string | null,
      });
    }
    return { state: value.state, changes };
  } catch {
    return undefined;
  }
}

export async function journalMatchesApplied(
  contentDirectory: string,
  journal: JournalSnapshot,
): Promise<boolean> {
  for (const change of journal.changes) {
    const target = path.resolve(contentDirectory, change.path);
    if (!isWithin(contentDirectory, target)) return false;
    let actual: string | null = null;
    try {
      actual = createHash("sha256")
        .update(await fs.readFile(target))
        .digest("hex");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return false;
    }
    if (actual !== change.afterFingerprint) return false;
  }
  return true;
}

export function isWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function staleLockContent(
  lockPath: string,
): Promise<string | null> {
  let content: string;
  try {
    content = await fs.readFile(lockPath, "utf8");
  } catch {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return (await lockFileIsOld(lockPath)) ? content : null;
  }
  const pid = isRecord(value) ? value.pid : undefined;
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0)
    return (await lockFileIsOld(lockPath)) ? content : null;
  try {
    process.kill(pid, 0);
    return null;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH" ? content : null;
  }
}

async function lockFileIsOld(lockPath: string): Promise<boolean> {
  try {
    return Date.now() - (await fs.stat(lockPath)).mtimeMs > 5_000;
  } catch {
    return false;
  }
}

export async function reclaimStaleLock(lockPath: string): Promise<boolean> {
  const guardPath = `${lockPath}.reclaim`;
  let guard: Awaited<ReturnType<typeof fs.open>>;
  try {
    guard = await fs.open(guardPath, "wx");
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "EEXIST" &&
      (await lockFileIsOld(guardPath))
    ) {
      await fs.rm(guardPath, { force: true });
      return await reclaimStaleLock(lockPath);
    }
    return false;
  }
  try {
    const stale = await staleLockContent(lockPath);
    if (stale === null) return false;
    const current = await fs.readFile(lockPath, "utf8").catch(() => null);
    if (current === null) return true;
    if (current !== stale) return false;
    await retryOnSharingViolation(() => fs.rm(lockPath));
    return true;
  } finally {
    await guard.close();
    await fs.rm(guardPath, { force: true }).catch(() => undefined);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function sanitizeErrorMessage(
  error: unknown,
  contentDirectory: string,
): string {
  return errorMessage(error)
    .split(contentDirectory)
    .join("<content>")
    .replace(/[A-Za-z]:[\\/][^\s'"]+/gu, "<path>");
}

export function errorPath(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.path !== "string") return undefined;
  const value = error.path.replace(/\\/gu, "/");
  if (value.startsWith("/") || /^[A-Za-z]:\//u.test(value)) return undefined;
  return value;
}

export async function retryOnSharingViolation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (
        attempt >= 5 ||
        (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES")
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}
