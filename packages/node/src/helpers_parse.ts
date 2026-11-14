import type {
  ContentMigrationBatch,
  ContentMigrationRecord,
} from "@riebeckite/core";
import type {
  ContentMigrationPlan,
  ContentMigrationVerification,
} from "./file_system_content_migration_types.js";
import { canonicalJson, isRecord } from "./helpers_plan.js";

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
