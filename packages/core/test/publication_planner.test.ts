import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicationPlan } from "../index.js";
import {
  approveEntries,
  type ContentManifestEntry,
  createBuildOutputMarker,
  createPublicationPlan,
  createPublicationSnapshot,
  emptyPublicationApprovals,
  type PublicationEntry,
  type PublicationRedirect,
  parseBuildOutputMarker,
  parsePublicationApprovals,
  publicationEntriesFromManifest,
  publicationRedirectsFromManifest,
  resolvePublicationWorkflowState,
  resolvePublishingState,
  serializeBuildOutputMarker,
  validatePublicationArtifact,
} from "../index.js";

const NOW = new Date("2026-01-10T00:00:00.000Z");

function note(
  slug: string,
  visibility: "public" | "unlisted" | "draft" | "scheduled",
  options: { publishAt?: string; html?: string; permalink?: string } = {},
): PublicationEntry {
  const manifestEntry = {
    slug,
    permalink: options.permalink ?? `/${slug}`,
    title: slug,
    html: options.html ?? `<p>${slug}</p>`,
    publicLocation: { slug, permalink: options.permalink ?? `/${slug}` },
    publishing: {
      visibility,
      routable: visibility === "public" || visibility === "unlisted",
      discoverable: visibility === "public",
      ...(options.publishAt === undefined
        ? {}
        : { publishAt: new Date(options.publishAt) }),
    },
  } as unknown as ContentManifestEntry;
  const entry = publicationEntriesFromManifest({ entries: [manifestEntry] })[0];
  if (!entry) throw new Error(`Could not build publication entry for ${slug}.`);
  return entry;
}

function plan(
  entries: readonly PublicationEntry[],
  options: {
    buildTime?: Date | string;
    previous?: ReturnType<typeof createPublicationSnapshot>;
    approvals?: ReturnType<typeof emptyPublicationApprovals>;
    workflow?: "direct" | "approved";
    redirects?: readonly PublicationRedirect[];
  } = {},
) {
  return createPublicationPlan({
    buildTime: options.buildTime ?? NOW,
    entries,
    redirects: options.redirects,
    previous: options.previous,
    approvals: options.approvals,
    workflow: options.workflow,
    generatedAt: NOW,
  });
}

function deployed(entries: readonly PublicationEntry[]): PublicationPlan {
  const first = plan(entries);
  const snapshot = createPublicationSnapshot(first, {
    runId: "run-1",
    publishedAt: NOW,
  });
  return plan(entries, { previous: snapshot });
}

test("planner buckets draft, scheduled, unlisted, and public notes", () => {
  const result = plan([
    note("a", "public"),
    note("b", "unlisted"),
    note("c", "draft"),
    note("d", "scheduled", { publishAt: "2026-02-01T00:00:00.000Z" }),
  ]);
  assert.deepEqual(
    result.targets.public.map((entry) => entry.slug),
    ["a"],
  );
  assert.deepEqual(
    result.targets.unlisted.map((entry) => entry.slug),
    ["b"],
  );
  assert.deepEqual(
    result.targets.drafts.map((entry) => entry.slug),
    ["c"],
  );
  assert.deepEqual(
    result.targets.scheduled.map((entry) => entry.slug),
    ["d"],
  );
  assert.equal(result.nextPublicationAt, "2026-02-01T00:00:00.000Z");
  assert.equal(result.workflow, "approved");
});

test("publishAt is inclusive at the boundary in any timezone", () => {
  const frontmatter = {
    publish: true,
    publishAt: "2026-01-10T09:00:00+09:00",
  };
  const before = resolvePublishingState(frontmatter, {
    strategy: "explicit",
    buildTime: new Date("2026-01-09T23:59:59.000Z"),
  });
  const at = resolvePublishingState(frontmatter, {
    strategy: "explicit",
    buildTime: new Date("2026-01-10T00:00:00.000Z"),
  });
  const after = resolvePublishingState(frontmatter, {
    strategy: "explicit",
    buildTime: new Date("2026-01-10T00:00:01.000Z"),
  });
  assert.equal(before.visibility, "scheduled");
  assert.equal(at.visibility, "public");
  assert.equal(after.visibility, "public");
});

test("an unchanged deployment is not deployed twice", () => {
  const entries = [note("a", "public"), note("b", "unlisted")];
  const result = deployed(entries);
  assert.equal(result.changes.detected, false);
  assert.equal(result.action, "none");
  assert.equal(result.build, false);
  assert.equal(result.deploy, false);
  assert.equal(result.workflow, "published");
});

test("a scheduled note with no content edit is deployed when its time arrives", () => {
  const scheduled = note("later", "scheduled", {
    publishAt: "2026-01-11T00:00:00.000Z",
  });
  const before = plan([scheduled], { buildTime: "2026-01-10T00:00:00.000Z" });
  const snapshot = createPublicationSnapshot(before, {
    runId: "run-1",
    publishedAt: "2026-01-10T00:00:00.000Z",
  });
  assert.equal(before.action, "none");
  assert.equal(before.nextPublicationAt, "2026-01-11T00:00:00.000Z");

  const published = note("later", "public", {
    publishAt: "2026-01-11T00:00:00.000Z",
  });
  const after = plan([published], {
    buildTime: "2026-01-11T00:00:00.000Z",
    previous: snapshot,
  });
  assert.equal(after.changes.added.length, 1);
  assert.equal(after.action, "build-and-deploy");
  assert.equal(after.workflow, "approved");
});

test("retracting a note removes it from public output and redeploys", () => {
  const entries = [note("keep", "public"), note("remove", "public")];
  const before = plan(entries);
  const snapshot = createPublicationSnapshot(before, {
    runId: "run-1",
    publishedAt: NOW,
  });
  const retracted = plan([note("keep", "public"), note("remove", "draft")], {
    previous: snapshot,
  });
  assert.deepEqual(retracted.retracted, ["remove"]);
  assert.deepEqual(retracted.changes.removed, ["remove"]);
  assert.equal(retracted.action, "build-and-deploy");
  assert.equal(retracted.workflow, "retracted");
  assert.equal(retracted.targets.drafts.length, 1);
});

test("republishing a note adds it back", () => {
  const before = plan([note("gone", "draft")]);
  const snapshot = createPublicationSnapshot(before, {
    runId: "run-1",
    publishedAt: NOW,
  });
  const after = plan([note("gone", "public")], { previous: snapshot });
  assert.deepEqual(after.changes.added, ["gone"]);
  assert.equal(after.deploy, true);
});

test("redirect changes alone trigger a deployment", () => {
  const entries = [note("a", "public")];
  const snapshot = createPublicationSnapshot(plan(entries), {
    runId: "run-1",
    publishedAt: NOW,
  });
  const after = plan(entries, {
    previous: snapshot,
    redirects: [{ from: "/old", to: "/a", status: 301 }],
  });
  assert.equal(after.changes.detected, true);
  assert.deepEqual(after.reasons, ["redirects-changed"]);
});

test("duplicate public permalinks block deployment", () => {
  const result = plan([
    note("a", "public", { permalink: "/same" }),
    note("b", "public", { permalink: "/same" }),
  ]);
  assert.equal(result.validation.ok, false);
  assert.equal(result.action, "blocked");
  assert.ok(
    result.validation.issues.some(
      (issue) => issue.code === "duplicate-permalink",
    ),
  );
});

test("approval mode blocks publication until the current content is approved", () => {
  const entries = [note("a", "public")];
  const pending = plan(entries, { workflow: "approved" });
  assert.equal(pending.workflow, "review");
  assert.equal(pending.action, "blocked");
  assert.deepEqual(pending.approvals.pending, ["a"]);

  const approvals = approveEntries(emptyPublicationApprovals(), entries, {
    approvedAt: NOW,
    approvedBy: "editor",
  });
  const approved = plan(entries, { workflow: "approved", approvals });
  assert.equal(approved.workflow, "approved");
  assert.equal(approved.action, "build-and-deploy");

  const edited = [note("a", "public", { html: "<p>edited</p>" })];
  const reviewAgain = plan(edited, { workflow: "approved", approvals });
  assert.equal(reviewAgain.workflow, "review");
  assert.deepEqual(reviewAgain.approvals.pending, ["a"]);
});

test("a scheduled approval stays valid when the publish time arrives", () => {
  const scheduled = note("a", "scheduled", {
    publishAt: "2026-01-11T00:00:00.000Z",
  });
  const approvals = approveEntries(emptyPublicationApprovals(), [scheduled], {
    approvedAt: NOW,
  });
  const published = note("a", "public", {
    publishAt: "2026-01-11T00:00:00.000Z",
  });
  const result = plan([published], {
    buildTime: "2026-01-11T00:00:00.000Z",
    workflow: "approved",
    approvals,
  });
  assert.equal(result.action, "build-and-deploy");
  assert.deepEqual(result.approvals.pending, []);
});

test("approval records round-trip and reject malformed values", () => {
  const entries = [note("a", "public")];
  const approvals = approveEntries(emptyPublicationApprovals(), entries, {
    approvedAt: NOW,
  });
  assert.deepEqual(
    parsePublicationApprovals(JSON.parse(JSON.stringify(approvals))),
    approvals,
  );
  assert.deepEqual(parsePublicationApprovals({ version: 1, approvals: {} }), {
    version: 1,
    approvals: {},
  });
  assert.equal(
    parsePublicationApprovals({ version: 2, approvals: {} }),
    undefined,
  );
});

test("workflow states reflect approval and retraction boundaries", () => {
  const entry = note("a", "public");
  assert.equal(
    resolvePublicationWorkflowState({
      routableEntries: [],
      pendingApprovals: [],
      changesDetected: false,
      retracted: [],
    }),
    "draft",
  );
  assert.equal(
    resolvePublicationWorkflowState({
      routableEntries: [entry],
      pendingApprovals: [entry],
      changesDetected: true,
      retracted: [],
    }),
    "review",
  );
  assert.equal(
    resolvePublicationWorkflowState({
      routableEntries: [entry],
      pendingApprovals: [],
      changesDetected: true,
      retracted: ["gone"],
      retractedOnly: true,
    }),
    "retracted",
  );
});

test("artifact validation rejects a missing or stale marker", () => {
  const result = plan([note("a", "public")]);
  const missing = validatePublicationArtifact({
    plan: result,
    artifact: { exists: true },
  });
  assert.equal(missing[0]?.code, "artifact-not-from-build");

  const stale = validatePublicationArtifact({
    plan: result,
    artifact: {
      exists: true,
      markerPublicationFingerprint: "other",
      files: ["index.html"],
    },
  });
  assert.equal(stale[0]?.code, "artifact-stale");

  const ok = validatePublicationArtifact({
    plan: result,
    artifact: {
      exists: true,
      markerPublicationFingerprint: result.publicationFingerprint,
      files: ["index.html"],
    },
  });
  assert.deepEqual(ok, []);
});

test("github-pages artifacts warn about missing deploy files", () => {
  const result = plan([note("a", "public")]);
  const issues = validatePublicationArtifact({
    plan: result,
    provider: "github-pages",
    artifact: {
      exists: true,
      markerPublicationFingerprint: result.publicationFingerprint,
      files: ["index.html"],
    },
  });
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["artifact-missing-provider-file", "artifact-missing-provider-file"],
  );
});

test("manifest conversion only exposes public redirects with a live target", () => {
  const redirects = publicationRedirectsFromManifest({
    publicRedirects: new Map([
      ["/old", { path: "/old", status: 301, slug: "a" }],
      ["/missing", { path: "/missing", status: 302, slug: "gone" }],
    ]),
    bySlug: new Map([["a", { permalink: "/a" }]]),
  } as never);
  assert.deepEqual(redirects, [{ from: "/old", to: "/a", status: 301 }]);
});

test("the build output marker round-trips with its publication fingerprint", () => {
  const marker = createBuildOutputMarker({
    outputDirectory: "/site/dist",
    publicationFingerprint: "abc",
    completedAt: "2026-01-10T00:00:00.000Z",
  });
  assert.deepEqual(
    parseBuildOutputMarker(
      JSON.parse(serializeBuildOutputMarker(marker)),
      "/site/dist",
    ),
    marker,
  );
  assert.equal(
    parseBuildOutputMarker(
      JSON.parse(serializeBuildOutputMarker(marker)),
      "/other",
    ),
    undefined,
  );
});
