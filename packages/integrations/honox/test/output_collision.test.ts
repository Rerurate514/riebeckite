import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  cachePath,
  createSite,
  distPath,
  incrementalBuild,
  type SiteSources,
  snapshotTree,
  workParent,
} from "./support/ssg_site.js";

function readText(snapshot: Record<string, string>, key: string): string {
  const value = snapshot[key];
  assert.ok(value !== undefined, `dist is missing ${key}`);
  return Buffer.from(value, "base64").toString("utf8");
}

function readOutputs(snapshot: string): Record<string, unknown> {
  return (JSON.parse(snapshot) as { outputs: Record<string, unknown> }).outputs;
}

test("site public assets take precedence over colliding generated outputs", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-collision-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  const sources: SiteSources = {
    title: "Collision",
    renderTag: "v1",
    noteCount: 2,
    editedNotes: [],
    generatedAsset: { path: "generated/shared.txt", content: "GENERATED" },
    publicFiles: {
      "generated/shared.txt": "PUBLIC",
      "assets/site-only.txt": "SITE",
    },
  };
  await createSite(site, sources);

  const cold = await buildSite(site, "cold");
  assert.equal(cold.fullRegenerationRequired, true);
  assert.equal(cold.shadowedOutputCount, 1);
  let snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "generated/shared.txt"), "PUBLIC");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");
  assert.ok(Object.hasOwn(snapshot, "custom.json"));
  assert.ok(
    !Object.hasOwn(
      readOutputs(await readFile(cachePath(site), "utf8")),
      "generated/shared.txt",
    ),
    "a shadowed output must not enter the SSG output cache",
  );

  await rm(distPath(site), { recursive: true, force: true });
  const noChange = await buildSite(site, "no-change");
  assert.equal(noChange.fullRegenerationRequired, false);
  assert.equal(noChange.shadowedOutputCount, 1);
  assert.equal(
    Number(noChange.reusedOutputCount),
    Number(noChange.unchangedOutputCount) - 1,
  );
  snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "generated/shared.txt"), "PUBLIC");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");

  await rm(path.join(site, "public", "generated", "shared.txt"));
  const restored = await incrementalBuild(site, "public-removed");
  assert.equal(restored.fullRegenerationRequired, true);
  assert.equal(restored.shadowedOutputCount, 0);
  snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "generated/shared.txt"), "GENERATED");
});

test("worker build outputs take precedence over colliding site public assets", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-build-collision-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  const sources: SiteSources = {
    title: "BuildCollision",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    publicFiles: { "index.js": "PUBLIC" },
  };
  await createSite(site, sources);

  const warnings: string[] = [];
  await buildSite(site, "build-output-collision", { warnings });
  assert.ok(
    warnings.some((warning) =>
      warning.includes(
        "Build outputs take precedence over site public assets: index.js",
      ),
    ),
    `expected a build output collision warning, received: ${warnings.join(" | ")}`,
  );
  const snapshot = await snapshotTree(distPath(site));
  assert.notEqual(readText(snapshot, "index.js"), "PUBLIC");
});

test("site public assets and content-derived assets coexist at different paths", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-coexist-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  const sources: SiteSources = {
    title: "Coexist",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    contentAsset: { path: "assets/content-only.png", content: "CONTENT" },
    publicFiles: { "assets/site-only.txt": "SITE" },
  };
  await createSite(site, sources);

  const cold = await buildSite(site, "cold");
  assert.equal(cold.shadowedOutputCount, 0);
  let snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "assets/content-only.png"), "CONTENT");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");
  const outputs = readOutputs(await readFile(cachePath(site), "utf8"));
  assert.ok(Object.hasOwn(outputs, "assets/content-only.png"));
  assert.ok(!Object.hasOwn(outputs, "assets/site-only.txt"));

  await rm(distPath(site), { recursive: true, force: true });
  const noChange = await buildSite(site, "no-change");
  assert.equal(noChange.fullRegenerationRequired, false);
  assert.equal(noChange.shadowedOutputCount, 0);
  assert.equal(noChange.reusedOutputCount, noChange.unchangedOutputCount);
  snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "assets/content-only.png"), "CONTENT");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");
});

test("two plugins claiming the same output path fail the build", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-duplicate-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  const sources: SiteSources = {
    title: "Duplicate",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    generatedAsset: { path: "generated/dup.txt", content: "ONE" },
    duplicateGeneratedOutput: true,
  };
  await createSite(site, sources);

  await assert.rejects(
    () => buildSite(site, "duplicate"),
    /Duplicate generated output path/,
  );
});

test("a generated output may not overwrite a content route", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-route-collision-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  const sources: SiteSources = {
    title: "RouteCollision",
    renderTag: "v1",
    noteCount: 1,
    editedNotes: [],
    generatedAsset: { path: "notes/note-0.html", content: "HACK" },
  };
  await createSite(site, sources);

  await assert.rejects(
    () => buildSite(site, "route-collision"),
    /Generated output path "notes\/note-0\.html" collides with content output/,
  );
  const snapshot = await snapshotTree(distPath(site));
  if (Object.hasOwn(snapshot, "notes/note-0.html")) {
    assert.notEqual(
      Buffer.from(snapshot["notes/note-0.html"], "base64").toString("utf8"),
      "HACK",
    );
  }
});
