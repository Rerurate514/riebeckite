import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ContentManager,
  type ContentManifest,
  type ContentManifestEntry,
  type ContentMigrationBatch,
  type ContentMigrationDiagnostic,
  type ContentMigrationRegistry,
  type ContentMutationFileChange,
  type ContentMutationOperation,
  type ContentMutationPlan,
  type ContentSource,
  type ContentSourceEntry,
  planContentMigrationBatch,
  publicationEntriesFromManifest,
  publicationFingerprint,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
  type ResolvedRiebeckiteConfig,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import { FileSystemContentMutation } from "./file_system_content_mutation.js";
import { FileSystemContentSource } from "./file_system_content_source.js";

export type FutureContentSource = ContentSource & {
  readonly changes: ReadonlyMap<string, Uint8Array | null>;
};

export type ContentMigrationPlanFile = {
  readonly path: string;
  readonly beforeFingerprint: string | null;
  readonly afterFingerprint: string | null;
};

export type ContentMigrationVerification = {
  readonly beforeFiles: number;
  readonly afterFiles: number;
  readonly beforePublicationFingerprint: string;
  readonly afterPublicationFingerprint: string;
  readonly derivedViews: number;
};

export type ContentMigrationPlan = {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly createdAt: string;
  readonly migrations: readonly {
    readonly id: string;
    readonly version: number;
    readonly fingerprint: string;
  }[];
  readonly baseContentFingerprint: string;
  readonly mutationPlanId: string;
  readonly mutationPlanFingerprint: string;
  readonly planFingerprint: string;
  readonly operations: readonly ContentMutationOperation[];
  readonly changes: readonly ContentMigrationPlanFile[];
  readonly diagnostics: readonly ContentMigrationDiagnostic[];
  readonly conflicts: readonly ContentMigrationDiagnostic[];
  readonly selections: ContentMigrationBatch["selections"];
  readonly skipped: ContentMigrationBatch["skipped"];
  readonly impact: ContentMigrationBatch["impact"];
  readonly verification: ContentMigrationVerification;
};

export type FileSystemContentMigrationOptions = {
  readonly contentDirectory: string;
  readonly registry: ContentMigrationRegistry;
  readonly config?: ResolvedRiebeckiteConfig;
  readonly plugins?: readonly RiebeckitePlugin[];
  readonly buildTime?: Date;
  readonly exclude?: readonly string[];
  readonly redirectField?: string;
};

export class FileSystemContentMigration {
  private readonly mutation: FileSystemContentMutation;
  private readonly source: FileSystemContentSource;

  constructor(private readonly options: FileSystemContentMigrationOptions) {
    this.mutation = new FileSystemContentMutation(options.contentDirectory);
    this.source = new FileSystemContentSource(options.contentDirectory, [
      ...(options.config?.content.exclude ?? []),
      ...(options.exclude ?? []),
    ]);
  }

  async plan(
    options: { readonly ids?: readonly string[] } = {},
  ): Promise<ContentMigrationPlan> {
    const migrations = this.options.registry.resolve(options.ids);
    const entries = (await this.source.scan()).filter((entry) =>
      entry.path.toLowerCase().endsWith(".md"),
    );
    const files = await Promise.all(
      entries.map(async (entry) => ({
        path: entry.path,
        content: await this.source.read(entry),
      })),
    );
    const baseContentFingerprint = fingerprintFiles(files);
    const batch = planContentMigrationBatch({
      migrations,
      files,
      preserveMovedPermalinks: false,
    });
    const beforeOutcome = await this.tryAnalyze(this.source);
    const redirectField = this.options.redirectField ?? "redirect_from";
    let mutationPlan = await this.mutation.plan(batch.operations);
    let afterOutcome = beforeOutcome.analysis
      ? await this.tryAnalyze(
          createFutureContentSource(this.source, mutationPlan.changes),
        )
      : { analysis: undefined, diagnostics: [] };
    const diagnosticList: ContentMigrationDiagnostic[] = [
      ...beforeOutcome.diagnostics,
      ...afterOutcome.diagnostics,
    ];
    if (beforeOutcome.analysis && afterOutcome.analysis) {
      const redirectOperations = this.redirectOperations(
        batch,
        beforeOutcome.analysis.manifest,
        afterOutcome.analysis.manifest,
        redirectField,
      );
      if (redirectOperations.length > 0) {
        mutationPlan = await this.mutation.plan([
          ...batch.operations,
          ...redirectOperations,
        ]);
        afterOutcome = await this.tryAnalyze(
          createFutureContentSource(this.source, mutationPlan.changes),
        );
        diagnosticList.push(...afterOutcome.diagnostics);
      }
    }
    const verification =
      beforeOutcome.analysis && afterOutcome.analysis
        ? this.verify({
            batch,
            before: beforeOutcome.analysis,
            after: afterOutcome.analysis,
            mutationPlan,
          }).diagnostics
        : [];
    const diagnostics = [
      ...batch.diagnostics,
      ...mutationPlan.warnings.map((issue) => mutationIssue(issue, "warning")),
      ...diagnosticList,
      ...verification,
    ];
    const conflicts = [
      ...mutationPlan.conflicts.map((issue) => mutationIssue(issue, "error")),
      ...diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    ];
    const mutationChanges = mutationPlan.changes.map((change) => ({
      path: change.path,
      beforeFingerprint: change.beforeFingerprint,
      afterFingerprint: change.afterFingerprint,
    }));
    const mutationPlanFingerprint = fingerprintMutationPlan(
      mutationPlan.operations,
      mutationPlan.changes,
    );
    const planFingerprint = fingerprintPlan({
      migrations,
      baseContentFingerprint,
      mutationPlanFingerprint,
      operations: mutationPlan.operations,
      diagnostics,
      conflicts,
    });
    return {
      schemaVersion: 1,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      migrations: migrations.map((migration) => ({
        id: migration.id,
        version: migration.version,
        fingerprint: migration.fingerprint,
      })),
      baseContentFingerprint,
      mutationPlanId: mutationPlan.id,
      mutationPlanFingerprint,
      planFingerprint,
      operations: mutationPlan.operations,
      changes: mutationChanges,
      diagnostics,
      conflicts,
      selections: batch.selections,
      skipped: batch.skipped,
      impact: batch.impact,
      verification: {
        beforeFiles: beforeOutcome.analysis?.manifest.entries.length ?? 0,
        afterFiles: afterOutcome.analysis?.manifest.entries.length ?? 0,
        beforePublicationFingerprint:
          beforeOutcome.analysis?.publicationFingerprint ?? "",
        afterPublicationFingerprint:
          afterOutcome.analysis?.publicationFingerprint ?? "",
        derivedViews: afterOutcome.analysis?.derivedViews ?? 0,
      },
    };
  }

  async savePlan(
    plan: ContentMigrationPlan,
    outputPath?: string,
  ): Promise<string> {
    const target =
      outputPath ??
      path.join(
        this.options.contentDirectory,
        ".riebeckite",
        "migrations",
        "plans",
        `${plan.id}.json`,
      );
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    return target;
  }

  async loadPlan(planPath: string): Promise<ContentMigrationPlan> {
    const content = await fs.readFile(planPath, "utf8");
    const parsed = JSON.parse(content) as unknown;
    if (!isRecord(parsed) || parsed.schemaVersion !== 1)
      throw new Error("The migration plan has an unsupported schema.");
    return parsed as unknown as ContentMigrationPlan;
  }

  private async tryAnalyze(source: ContentSource): Promise<{
    readonly analysis?: Awaited<
      ReturnType<FileSystemContentMigration["analyze"]>
    >;
    readonly diagnostics: readonly ContentMigrationDiagnostic[];
  }> {
    try {
      return { analysis: await this.analyze(source), diagnostics: [] };
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

  private async analyze(source: ContentSource): Promise<{
    readonly manifest: ContentManifest;
    readonly locations: ReadonlyMap<string, { readonly permalink: string }>;
    readonly publicationFingerprint: string;
    readonly derivedViews: number;
  }> {
    const manager = new ContentManager(source, [], {
      config: this.options.config,
      plugins: this.options.plugins,
      commitBuildState: false,
      publishingBuildTime: this.options.buildTime,
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

  private redirectOperations(
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

  private verify(input: {
    readonly batch: ContentMigrationBatch;
    readonly before: Awaited<ReturnType<FileSystemContentMigration["analyze"]>>;
    readonly after: Awaited<ReturnType<FileSystemContentMigration["analyze"]>>;
    readonly mutationPlan: ContentMutationPlan;
  }): { readonly diagnostics: readonly ContentMigrationDiagnostic[] } {
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
        beforeEntry.publishing.visibility !==
          afterEntry.publishing.visibility &&
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
}

export function createFutureContentSource(
  base: ContentSource,
  changes: readonly ContentMutationFileChange[],
): FutureContentSource {
  const map = new Map<string, Uint8Array | null>();
  for (const change of changes) map.set(change.path, change.content);
  return {
    changes: map,
    async scan(): Promise<ContentSourceEntry[]> {
      const entries = new Map<string, ContentSourceEntry>();
      for (const entry of await base.scan()) entries.set(entry.path, entry);
      for (const [changePath, content] of map) {
        if (content === null) entries.delete(changePath);
        else
          entries.set(changePath, {
            path: changePath,
            metadata: entries.get(changePath)?.metadata,
          });
      }
      return [...entries.values()].sort((left, right) =>
        left.path.localeCompare(right.path),
      );
    },
    async read(entry: ContentSourceEntry): Promise<string | Uint8Array> {
      const content = map.get(entry.path);
      if (content === null)
        throw new Error(`The content path "${entry.path}" was deleted.`);
      if (content !== undefined) return content;
      return await base.read(entry);
    },
  };
}

export function fingerprintContentFiles(
  files: readonly {
    readonly path: string;
    readonly content: string | Uint8Array;
  }[],
): string {
  return fingerprintFiles(files);
}

function fingerprintFiles(
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
    hash.update(
      typeof file.content === "string"
        ? createHash("sha256").update(file.content).digest("hex")
        : createHash("sha256").update(file.content).digest("hex"),
    );
    hash.update("\n");
  }
  return hash.digest("hex");
}

function fingerprintMutationPlan(
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

function fingerprintPlan(input: {
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

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

function findEntry(
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

function changedFrontmatterKeys(
  file: ContentMigrationBatch["files"][number],
): Set<string> {
  const keys = new Set<string>();
  for (const key of new Set([
    ...Object.keys(file.frontmatter),
    ...Object.keys(file.originalFrontmatter),
  ])) {
    if (
      JSON.stringify(file.frontmatter[key]) !==
      JSON.stringify(file.originalFrontmatter[key])
    )
      keys.add(key);
  }
  return keys;
}

function diagnosticKey(diagnostic: {
  readonly code: string;
  readonly filePath?: string;
  readonly target?: string;
}): string {
  return `${diagnostic.code}\0${diagnostic.filePath ?? ""}\0${diagnostic.target ?? ""}`;
}

function mutationIssue(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorPath(error: unknown): string | undefined {
  if (!isRecord(error) || typeof error.path !== "string") return undefined;
  const value = error.path.replace(/\\/gu, "/");
  if (value.startsWith("/") || /^[A-Za-z]:\//u.test(value)) return undefined;
  return value;
}
