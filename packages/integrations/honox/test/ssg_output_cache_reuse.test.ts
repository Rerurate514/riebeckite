import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  buildSite,
  createSite,
  incrementalBuild,
  workParent,
} from "./support/ssg_site.js";

const leanBuildOptions = { adapter: false } as const;

async function timings(
  site: string,
  label: string,
): Promise<Record<string, number>> {
  const raw = JSON.parse(
    await readFile(
      path.join(site, ".riebeckite", "metrics", `${label}.json`),
      "utf8",
    ),
  ) as { timingsMs?: Record<string, number> };
  return raw.timingsMs ?? {};
}

test("full regeneration reuses output cache entries for identical content", async (t) => {
  await mkdir(workParent, { recursive: true });
  const root = await mkdtemp(path.join(workParent, "output-cache-reuse-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const site = path.join(root, "site");
  await createSite(site, {
    title: "Reuse",
    renderTag: "v1",
    noteCount: 2,
    editedNotes: [],
  });

  await buildSite(site, "cold", leanBuildOptions);
  assert.ok(
    (await timings(site, "cold")).outputCacheEntryCopy > 0,
    "the cold build must record entry copies",
  );

  await writeFile(path.join(site, "app", "client.ts"), "export {};\n");
  const metrics = await incrementalBuild(site, "full", leanBuildOptions);
  assert.equal(metrics.fullRegenerationRequired, true);
  assert.equal(
    (await timings(site, "full")).outputCacheEntryCopy,
    undefined,
    "identical outputs must be reused instead of copied back into the cache",
  );
});
