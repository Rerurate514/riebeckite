import {
  canonicalJson,
  isDeployableEntry,
  type PublicationEntry,
  type PublicationOutput,
  type PublicationRedirect,
  type PublicationSnapshot,
  publicationFingerprint,
} from "./entries.js";
import type { HostingProvider } from "./hosting.js";
import {
  emptyPublicationApprovals,
  type PublicationApprovalState,
  type PublicationApprovals,
  type PublicationWorkflowMode,
  type PublicationWorkflowState,
  pendingApprovalEntries,
  resolveApprovalState,
  resolvePublicationWorkflowState,
  toIso,
} from "./workflow.js";

export type PublicationPlanTarget = PublicationEntry & {
  readonly approvalState: PublicationApprovalState;
  readonly published: boolean;
};

export type PublicationChanges = {
  readonly detected: boolean;
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
  readonly unchanged: readonly string[];
};

export type PublicationValidationIssue = {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly slug?: string;
};

export type PublicationValidation = {
  readonly ok: boolean;
  readonly issues: readonly PublicationValidationIssue[];
};

export type PublicationAction = "none" | "build-and-deploy" | "blocked";

export type PublicationPlan = {
  readonly version: 1;
  readonly generatedAt: string;
  readonly buildTime: string;
  readonly dryRun: boolean;
  readonly provider?: HostingProvider;
  readonly targets: {
    readonly public: readonly PublicationPlanTarget[];
    readonly unlisted: readonly PublicationPlanTarget[];
    readonly scheduled: readonly PublicationPlanTarget[];
    readonly drafts: readonly PublicationPlanTarget[];
  };
  readonly publicationFingerprint: string;
  readonly redirects: readonly PublicationRedirect[];
  readonly changes: PublicationChanges;
  readonly retracted: readonly string[];
  readonly nextPublicationAt?: string;
  readonly approvals: {
    readonly required: boolean;
    readonly pending: readonly string[];
    readonly approved: readonly string[];
  };
  readonly workflow: PublicationWorkflowState;
  readonly validation: PublicationValidation;
  readonly action: PublicationAction;
  readonly build: boolean;
  readonly deploy: boolean;
  readonly reasons: readonly string[];
};

export type PublicationPlannerInput = {
  readonly buildTime: Date | string;
  readonly entries: readonly PublicationEntry[];
  readonly redirects?: readonly PublicationRedirect[];
  readonly outputs?: readonly PublicationOutput[];
  readonly previous?: PublicationSnapshot;
  readonly approvals?: PublicationApprovals;
  readonly workflow?: PublicationWorkflowMode;
  readonly provider?: HostingProvider;
  readonly generatedAt?: Date | string;
  readonly dryRun?: boolean;
};

export function createPublicationPlan(
  input: PublicationPlannerInput,
): PublicationPlan {
  const buildTime = toIso(input.buildTime);
  const buildTimeMs = Date.parse(buildTime);
  const entries = [...input.entries].sort((left, right) =>
    left.slug.localeCompare(right.slug),
  );
  const redirects = input.redirects ?? [];
  const approvals = input.approvals ?? emptyPublicationApprovals();
  const workflowMode = input.workflow ?? "direct";
  const previous = input.previous;
  const deployable = entries.filter(isDeployableEntry);
  const fingerprint = publicationFingerprint(
    entries,
    redirects,
    input.outputs ?? [],
  );

  const previousBySlug = new Map(
    (previous?.entries ?? []).map((entry) => [entry.slug, entry]),
  );
  const currentBySlug = new Map(deployable.map((entry) => [entry.slug, entry]));
  const entryChanges = diffPublicationEntries(previousBySlug, currentBySlug);
  const fingerprintChanged =
    previous !== undefined &&
    previous.publicationFingerprint !== fingerprint &&
    !entryChanges.detected;
  const redirectsChanged =
    previous !== undefined &&
    canonicalJson(redirects) !== canonicalJson(previous.redirects);
  const changes: PublicationChanges = fingerprintChanged
    ? { ...entryChanges, detected: true }
    : entryChanges;
  const pending = pendingApprovalEntries(entries, approvals, workflowMode);
  const pendingSlugs = new Set(pending.map((entry) => entry.slug));
  const targets = entries.map(
    (entry): PublicationPlanTarget => ({
      ...entry,
      approvalState: resolveApprovalState(entry, approvals, workflowMode),
      published:
        previousBySlug.get(entry.slug)?.fingerprint === entry.fingerprint,
    }),
  );
  const nextPublicationAt = nextScheduledPublication(entries, buildTimeMs);
  const validation = validatePublicationPlan({
    entries,
    deployable,
    buildTimeMs,
    pending,
  });
  const retracted = changes.removed;
  const retractedOnly =
    changes.removed.length > 0 &&
    changes.added.length === 0 &&
    changes.changed.length === 0;
  const workflow = resolvePublicationWorkflowState({
    routableEntries: deployable,
    pendingApprovals: pending,
    changesDetected: changes.detected,
    retracted,
    retractedOnly,
  });

  const blocking = validation.issues.filter(
    (issue) => issue.severity === "error",
  );
  const reasons: string[] = [];
  let action: PublicationAction = "none";
  let build = false;
  let deploy = false;
  if (blocking.length > 0) {
    action = "blocked";
    reasons.push("validation-failed");
  } else if (pending.length > 0) {
    action = "blocked";
    reasons.push("approval-pending");
  } else if (changes.detected) {
    action = "build-and-deploy";
    build = true;
    deploy = true;
    if (changes.added.length > 0) reasons.push("entries-added");
    if (changes.changed.length > 0) reasons.push("entries-changed");
    if (changes.removed.length > 0) reasons.push("entries-removed");
    if (fingerprintChanged) {
      reasons.push(redirectsChanged ? "redirects-changed" : "outputs-changed");
    }
  } else if (nextPublicationAt !== undefined) {
    reasons.push("awaiting-scheduled-publication");
  } else {
    reasons.push("up-to-date");
  }

  return {
    version: 1,
    generatedAt: toIso(input.generatedAt ?? new Date()),
    buildTime,
    dryRun: input.dryRun ?? true,
    ...(input.provider === undefined ? {} : { provider: input.provider }),
    targets: {
      public: targets.filter((entry) => entry.visibility === "public"),
      unlisted: targets.filter((entry) => entry.visibility === "unlisted"),
      scheduled: targets.filter((entry) => entry.visibility === "scheduled"),
      drafts: targets.filter((entry) => entry.visibility === "draft"),
    },
    publicationFingerprint: fingerprint,
    redirects: [...redirects],
    changes,
    retracted,
    ...(nextPublicationAt === undefined ? {} : { nextPublicationAt }),
    approvals: {
      required: workflowMode === "approved",
      pending: [...pendingSlugs].sort(),
      approved: [
        ...new Set(
          entries
            .filter(
              (entry) =>
                entry.visibility !== "draft" && !pendingSlugs.has(entry.slug),
            )
            .map((entry) => entry.slug),
        ),
      ].sort(),
    },
    workflow,
    validation,
    action,
    build,
    deploy,
    reasons,
  };
}

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

function stripPlanTarget(target: PublicationPlanTarget): PublicationEntry {
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

function diffPublicationEntries(
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

function nextScheduledPublication(
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

function validatePublicationPlan(input: {
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
