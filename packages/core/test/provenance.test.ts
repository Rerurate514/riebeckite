import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadContentBuildState } from "../src/content/content_build_state_store.js";
import { ContentManager } from "../src/content/content_manager.js";
import {
  contentTestConfig,
  memoryContentSource,
} from "./support/content_fixture.js";

test("build provenance is deterministic and excludes source contents", async (t) => {
  const secret = "private-source-body";
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-provenance-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = contentTestConfig(directory);
  const manager = new ContentManager(
    memoryContentSource({
      "draft.md": `---\ntitle: Draft\nvisibility: draft\n---\n${secret}`,
      "index.md": "---\ntitle: Home\nvisibility: public\n---\n# Home",
    }),
    [],
    { config, plugins: config.plugins },
  );

  await manager.build();
  const provenance = manager.getProvenance();
  const saved = await loadContentBuildState(
    path.join(directory, "build", "content-state.json"),
  );
  await manager.dispose();

  assert.ok(provenance);
  assert.deepEqual(saved?.provenance, provenance);
  assert.deepEqual(
    provenance.sources.map((source) => source.path),
    ["draft.md", "index.md"],
  );
  assert.equal(provenance.sources[0]?.visibility, "draft");
  assert.match(provenance.buildId, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(provenance), new RegExp(secret));
});

test("build provenance can be disabled", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-provenance-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = contentTestConfig(directory);
  const manager = new ContentManager(
    memoryContentSource({ "index.md": "# Home" }),
    [],
    {
      config: { ...config, provenance: { enabled: false } },
      plugins: config.plugins,
      commitBuildState: false,
    },
  );

  await manager.build();
  assert.equal(manager.getProvenance(), undefined);
  await manager.dispose();
});
