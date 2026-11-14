import { createHash } from "node:crypto";
import type {
  ContentManifest,
  ContentManifestEntry,
  ContentMigrationBatch,
  ContentMigrationDiagnostic,
  ContentMutationFileChange,
  ContentMutationOperation,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";

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
