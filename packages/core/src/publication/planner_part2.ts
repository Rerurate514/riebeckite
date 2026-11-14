import type { PublicationEntry, PublicationSnapshot } from "./entries.js";
import type { HostingProvider } from "./hosting.js";
import type {
  PublicationChanges,
  PublicationPlan,
  PublicationPlanTarget,
  PublicationValidation,
  PublicationValidationIssue,
} from "./planner_part1.js";
import { toIso } from "./workflow.js";

export function createPublicationSnapshot(
  plan: PublicationPlan,
  options: {
    readonly runId: string;
    readonly publishedAt?: Date | string;
    readonly artifactFingerprint?: string;
    readonly provider?: HostingProvider;
  },
): PublicationSnapshot {
  return {
    runId: options.runId,
    publishedAt: toIso(options.publishedAt ?? new Date()),
    publicationFingerprint: plan.publicationFingerprint,
    entries: [...plan.targets.public, ...plan.targets.unlisted].map(
      stripPlanTarget,
    ),
    redirects: [...plan.redirects],
    ...(options.artifactFingerprint === undefined
      ? {}
      : { artifactFingerprint: options.artifactFingerprint }),
    ...(options.provider === undefined ? {} : { provider: options.provider }),
  };
}

export function stripPlanTarget(
  target: PublicationPlanTarget,
): PublicationEntry {
  return {
    slug: target.slug,
    permalink: target.permalink,
    title: target.title,
    visibility: target.visibility,
    ...(target.publishAt === undefined ? {} : { publishAt: target.publishAt }),
    fingerprint: target.fingerprint,
    contentFingerprint: target.contentFingerprint,
  };
}

export function diffPublicationEntries(
  previous: ReadonlyMap<string, PublicationEntry>,
  current: ReadonlyMap<string, PublicationEntry>,
): PublicationChanges {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];
  for (const [slug, entry] of current) {
    const before = previous.get(slug);
    if (before === undefined) added.push(slug);
    else if (before.fingerprint !== entry.fingerprint) changed.push(slug);
    else unchanged.push(slug);
  }
  for (const slug of previous.keys()) {
    if (!current.has(slug)) removed.push(slug);
  }
  const sort = (values: string[]) => values.sort((a, b) => a.localeCompare(b));
  return {
    detected: added.length > 0 || changed.length > 0 || removed.length > 0,
    added: sort(added),
    changed: sort(changed),
    removed: sort(removed),
    unchanged: sort(unchanged),
  };
}

export function nextScheduledPublication(
  entries: readonly PublicationEntry[],
  buildTimeMs: number,
): string | undefined {
  let next: number | undefined;
  for (const entry of entries) {
    if (entry.visibility !== "scheduled" || entry.publishAt === undefined) {
      continue;
    }
    const time = Date.parse(entry.publishAt);
    if (Number.isNaN(time) || time <= buildTimeMs) continue;
    if (next === undefined || time < next) next = time;
  }
  return next === undefined ? undefined : new Date(next).toISOString();
}

export function validatePublicationPlan(input: {
  readonly entries: readonly PublicationEntry[];
  readonly deployable: readonly PublicationEntry[];
  readonly buildTimeMs: number;
  readonly pending: readonly PublicationEntry[];
}): PublicationValidation {
  const issues: PublicationValidationIssue[] = [];
  const permalinks = new Map<string, string[]>();
  for (const entry of input.deployable) {
    if (!entry.permalink.startsWith("/")) {
      issues.push({
        code: "invalid-permalink",
        severity: "error",
        message: `Note "${entry.slug}" has no site-relative permalink.`,
        slug: entry.slug,
      });
      continue;
    }
    const slugs = permalinks.get(entry.permalink) ?? [];
    slugs.push(entry.slug);
    permalinks.set(entry.permalink, slugs);
  }
  for (const [permalink, slugs] of permalinks) {
    if (slugs.length < 2) continue;
    issues.push({
      code: "duplicate-permalink",
      severity: "error",
      message: `Public notes ${slugs.join(", ")} share the permalink "${permalink}".`,
    });
  }
  for (const entry of input.entries) {
    if (entry.visibility !== "scheduled") continue;
    if (entry.publishAt === undefined) {
      issues.push({
        code: "scheduled-without-time",
        severity: "error",
        message: `Scheduled note "${entry.slug}" has no publishAt value.`,
        slug: entry.slug,
      });
      continue;
    }
    const time = Date.parse(entry.publishAt);
    if (Number.isNaN(time)) {
      issues.push({
        code: "invalid-publish-at",
        severity: "error",
        message: `Scheduled note "${entry.slug}" has an invalid publishAt value.`,
        slug: entry.slug,
      });
    } else if (time <= input.buildTimeMs) {
      issues.push({
        code: "scheduled-in-the-past",
        severity: "error",
        message: `Scheduled note "${entry.slug}" is still marked scheduled after its publishAt time; rebuild to re-evaluate it.`,
        slug: entry.slug,
      });
    }
  }
  for (const entry of input.pending) {
    issues.push({
      code: "approval-pending",
      severity: "warning",
      message: `Note "${entry.slug}" awaits approval for its current content.`,
      slug: entry.slug,
    });
  }
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
  };
}
