import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  type ContentMigrationDiagnostic,
  planContentMigrationBatch,
} from "@riebeckite/core";
import {
  fingerprintFiles,
  fingerprintMutationPlan,
  fingerprintPlan,
  isRecord,
  mutationIssue,
  parseContentMigrationPlan,
  redirectFieldFromConfig,
} from "./file_system_content_migration_helpers.js";
import type { ContentMigrationPlan } from "./file_system_content_migration_types.js";
import type { MigrationContext } from "./migration_context.js";
import { createFutureContentSource } from "./migration_future.js";

export async function plan(
  m: MigrationContext,
  options: { readonly ids?: readonly string[] } = {},
): Promise<ContentMigrationPlan> {
  const migrations = m.options.registry.resolve(options.ids);
  const entries = (await m.source.scan()).filter((entry) =>
    entry.path.toLowerCase().endsWith(".md"),
  );
  const files = await Promise.all(
    entries.map(async (entry) => ({
      path: entry.path,
      content: await m.source.read(entry),
    })),
  );
  const baseContentFingerprint = fingerprintFiles(files);
  const redirectField =
    m.options.redirectField ?? redirectFieldFromConfig(m.options.config);
  const batch = planContentMigrationBatch({
    migrations,
    files,
    preserveMovedPermalinks: false,
    redirectField,
  });
  const beforeOutcome = await m.tryAnalyze(m.source);
  let mutationPlan = await m.mutation.plan(batch.operations);
  let afterOutcome = beforeOutcome.analysis
    ? await m.tryAnalyze(
        createFutureContentSource(m.source, mutationPlan.changes),
      )
    : { analysis: undefined, diagnostics: [] };
  const diagnosticList: ContentMigrationDiagnostic[] = [
    ...beforeOutcome.diagnostics,
    ...afterOutcome.diagnostics,
  ];
  if (beforeOutcome.analysis && afterOutcome.analysis) {
    const redirectOperations = m.redirectOperations(
      batch,
      beforeOutcome.analysis.manifest,
      afterOutcome.analysis.manifest,
      redirectField,
    );
    if (redirectOperations.length > 0) {
      mutationPlan = await m.mutation.plan([
        ...batch.operations,
        ...redirectOperations,
      ]);
      afterOutcome = await m.tryAnalyze(
        createFutureContentSource(m.source, mutationPlan.changes),
      );
      diagnosticList.push(...afterOutcome.diagnostics);
    }
  }
  const verification =
    beforeOutcome.analysis && afterOutcome.analysis
      ? m.verify({
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

export async function savePlan(
  m: MigrationContext,
  plan: ContentMigrationPlan,
  outputPath?: string,
): Promise<string> {
  const target =
    outputPath ??
    path.join(
      m.options.contentDirectory,
      ".riebeckite",
      "migrations",
      "plans",
      `${plan.id}.json`,
    );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return target;
}

export async function loadPlan(
  _m: MigrationContext,
  planPath: string,
): Promise<ContentMigrationPlan> {
  const content = await fs.readFile(planPath, "utf8");
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed) || parsed.schemaVersion !== 1)
    throw new Error("The migration plan has an unsupported schema.");
  const plan = parseContentMigrationPlan(parsed);
  if (plan === undefined)
    throw new Error("The migration plan is missing or corrupt.");
  return plan;
}
