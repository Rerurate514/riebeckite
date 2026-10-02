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
    generatedAsset: { path: "assets/shared.png", content: "GENERATED" },
    publicFiles: {
      "assets/shared.png": "PUBLIC",
      "assets/site-only.txt": "SITE",
    },
  };
  await createSite(site, sources);

  const cold = await buildSite(site, "cold");
  assert.equal(cold.fullRegenerationRequired, true);
  assert.equal(cold.shadowedOutputCount, 1);
  let snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "assets/shared.png"), "PUBLIC");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");
  assert.ok(Object.hasOwn(snapshot, "custom.json"));
  assert.ok(
    !Object.hasOwn(
      readOutputs(await readFile(cachePath(site), "utf8")),
      "assets/shared.png",
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
  assert.equal(readText(snapshot, "assets/shared.png"), "PUBLIC");
  assert.equal(readText(snapshot, "assets/site-only.txt"), "SITE");

  await rm(path.join(site, "public", "assets", "shared.png"));
  const restored = await incrementalBuild(site, "public-removed");
  assert.equal(restored.fullRegenerationRequired, true);
  assert.equal(restored.shadowedOutputCount, 0);
  snapshot = await snapshotTree(distPath(site));
  assert.equal(readText(snapshot, "assets/shared.png"), "GENERATED");
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
    generatedAsset: { path: "assets/content-only.png", content: "CONTENT" },
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
    generatedAsset: { path: "assets/dup.png", content: "ONE" },
    duplicateGeneratedOutput: true,
  };
  await createSite(site, sources);

  await assert.rejects(
    () => buildSite(site, "duplicate"),
    /Duplicate generated output path/,
  );
});
