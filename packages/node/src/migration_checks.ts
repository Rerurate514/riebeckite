import {
  ContentManager,
  type ContentManifest,
  type ContentMigrationBatch,
  type ContentMigrationDiagnostic,
  type ContentMigrationState,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentSource,
  publicationEntriesFromManifest,
  publicationFingerprint,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
} from "@riebeckite/core";
import {
  changedFrontmatterKeys,
  diagnosticKey,
  errorMessage,
  errorPath,
  findEntry,
} from "./file_system_content_migration_helpers.js";
import type {
  ContentMigrationAnalysis,
  ContentMigrationPlan,
} from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";

export function preflight(
  _m: MigrationContext,
  plan: ContentMigrationPlan,
  state: ContentMigrationState,
): ContentMigrationDiagnostic[] {
  const conflicts: ContentMigrationDiagnostic[] = [];
  for (const migration of plan.migrations) {
    const records = state.migrations.filter(
      (record) => record.id === migration.id,
    );
    const sameVersion = records.find(
      (record) => record.version === migration.version,
    );
    if (
      sameVersion?.status === "applied" &&
      sameVersion.definitionFingerprint !== migration.fingerprint
    )
      conflicts.push({
        severity: "error",
        code: "migration-definition-changed",
        message: `Migration "${migration.id}" changed without a version bump.`,
        path: undefined,
      });
    const higher = records.find(
      (record) =>
        record.version > migration.version && record.status === "applied",
    );
    if (higher)
      conflicts.push({
        severity: "error",
        code: "migration-version-regressed",
        message: `Migration "${migration.id}" version ${migration.version} is older than the applied version ${higher.version}.`,
      });
    if (
      records.some(
        (record) =>
          record.version === migration.version && record.status === "applying",
      )
    )
      conflicts.push({
        severity: "error",
        code: "migration-in-progress",
        message: `Migration "${migration.id}" is still applying; recover it first.`,
      });
    if (
      records.some(
        (record) =>
          record.version === migration.version &&
          record.status === "recovery-required",
      )
    )
      conflicts.push({
        severity: "error",
        code: "recovery-required",
        message: `Migration "${migration.id}" requires recovery before it can be applied again.`,
      });
  }
  return conflicts;
}

export function verify(
  _m: MigrationContext,
  input: {
    readonly batch: ContentMigrationBatch;
    readonly before: ContentMigrationAnalysis;
    readonly after: ContentMigrationAnalysis;
    readonly mutationPlan: ContentMutationPlan;
  },
): { readonly diagnostics: readonly ContentMigrationDiagnostic[] } {
  const diagnostics: ContentMigrationDiagnostic[] = [];
  const beforeDiagnostics = new Set(
    input.before.manifest.diagnostics.map(diagnosticKey),
  );
  for (const diagnostic of input.after.manifest.diagnostics) {
    if (diagnostic.severity !== "error") continue;
    if (beforeDiagnostics.has(diagnosticKey(diagnostic))) continue;
    diagnostics.push({
      severity: "error",
      code: diagnostic.code,
      message: diagnostic.message,
      path: diagnostic.filePath,
    });
  }

  const permalinks = new Map<string, string>();
  for (const entry of input.after.manifest.entries) {
    const existing = permalinks.get(entry.permalink);
    if (existing !== undefined) {
      diagnostics.push({
        severity: "error",
        code: "permalink-collision",
        message: `Content "${existing}" and "${entry.slug}" share the permalink "${entry.permalink}".`,
      });
    } else permalinks.set(entry.permalink, entry.slug);
  }

  for (const file of input.batch.files) {
    const beforeEntry = findEntry(input.before.manifest, file.originalPath);
    const afterEntry = findEntry(input.after.manifest, file.path);
    if (!afterEntry) {
      diagnostics.push({
        severity: "error",
        code: "manifest-entry-missing",
        message: "The migrated content is missing from the future manifest.",
        path: file.path,
      });
      continue;
    }
    if (!beforeEntry) continue;
    const changed = changedFrontmatterKeys(file);
    if (
      beforeEntry.contentId !== afterEntry.contentId &&
      file.frontmatter.id === file.originalFrontmatter.id
    )
      diagnostics.push({
        severity: "error",
        code: "content-id-changed",
        message:
          "The migration changed the content ID without an explicit id rule.",
        path: file.path,
      });
    if (
      beforeEntry.publishing.visibility !== afterEntry.publishing.visibility &&
      !changed.has("visibility") &&
      !changed.has("published") &&
      !changed.has("publish") &&
      !changed.has("private") &&
      !changed.has("draft") &&
      !changed.has("publishAt")
    )
      diagnostics.push({
        severity: "error",
        code: "visibility-changed",
        message:
          "The migration changed the publishing visibility without an explicit rule.",
        path: file.path,
      });
    if (
      beforeEntry.permalink !== afterEntry.permalink &&
      (beforeEntry.publishing.visibility === "public" ||
        beforeEntry.publishing.visibility === "unlisted") &&
      !input.after.manifest.redirects.has(beforeEntry.permalink)
    )
      diagnostics.push({
        severity: "error",
        code: "permalink-redirect-missing",
        message: `The previous permalink "${beforeEntry.permalink}" has no redirect.`,
        path: file.path,
      });
  }
  return { diagnostics };
}

export async function tryAnalyze(
  m: MigrationContext,
  source: ContentSource,
): Promise<{
  readonly analysis?: ContentMigrationAnalysis;
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
}> {
  try {
    return { analysis: await m.analyze(source), diagnostics: [] };
  } catch (error) {
    const path = errorPath(error);
    return {
      diagnostics: [
        {
          severity: "error",
          code: "manifest-build-failed",
          message: `The content manifest could not be built: ${errorMessage(error)}`,
          ...(path === undefined ? {} : { path }),
        },
      ],
    };
  }
}

export async function analyze(
  m: MigrationContext,
  source: ContentSource,
): Promise<{
  readonly manifest: ContentManifest;
  readonly locations: ReadonlyMap<string, { readonly permalink: string }>;
  readonly publicationFingerprint: string;
  readonly derivedViews: number;
}> {
  const manager = new ContentManager(source, [], {
    config: m.options.config,
    plugins: m.options.plugins ? [...m.options.plugins] : undefined,
    commitBuildState: false,
    publishingBuildTime: m.options.buildTime,
  });
  try {
    const manifest = await manager.getManifest();
    const locations = await manager.getContentLocations();
    const snapshot = manager.getCompletedBuildSnapshot();
    return {
      manifest,
      locations,
      publicationFingerprint: publicationFingerprint(
        publicationEntriesFromManifest(manifest),
        publicationRedirectsFromManifest(manifest),
        publicationOutputsFromManifest(manifest),
      ),
      derivedViews: snapshot?.derivedViews.length ?? 0,
    };
  } finally {
    await manager.dispose();
  }
}

export function redirectOperations(
  _m: MigrationContext,
  batch: ContentMigrationBatch,
  beforeManifest: ContentManifest,
  afterManifest: ContentManifest,
  field: string,
): ContentMutationOperation[] {
  const operations: ContentMutationOperation[] = [];
  for (const file of batch.files) {
    if (file.originalPath === file.path) continue;
    const beforeEntry = findEntry(beforeManifest, file.originalPath);
    const afterEntry = findEntry(afterManifest, file.path);
    if (
      !beforeEntry ||
      !afterEntry ||
      beforeEntry.permalink === afterEntry.permalink
    )
      continue;
    const current = file.frontmatter[field];
    const redirects =
      typeof current === "string"
        ? [current]
        : Array.isArray(current)
          ? current.filter(
              (entry): entry is string => typeof entry === "string",
            )
          : [];
    if (redirects.includes(beforeEntry.permalink)) continue;
    operations.push({
      kind: "frontmatter",
      path: file.path,
      set: { [field]: [...redirects, beforeEntry.permalink] },
      remove: [],
    });
  }
  return operations;
}
