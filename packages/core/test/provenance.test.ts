import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { loadContentBuildState } from "../src/content/content_build_state_store.js";
import { ContentManager } from "../src/content/content_manager.js";
import {
  appendProvenanceHistory,
  type BuildProvenance,
  compareBuildProvenance,
  MAX_PROVENANCE_HISTORY,
} from "../src/provenance/provenance.js";
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

test("build provenance records only executed plugin hooks", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-provenance-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = contentTestConfig(directory);
  const manager = new ContentManager(
    memoryContentSource({ "index.md": "# Home" }),
    [],
    {
      config,
      plugins: [
        {
          name: "observed",
          onContentLoaded() {},
        },
        { name: "idle" },
      ],
      commitBuildState: false,
    },
  );

  await manager.build();
  const hooks = manager
    .getProvenance()
    ?.transforms.filter((transform) => transform.type === "plugin-hook");
  await manager.dispose();

  assert.deepEqual(
    hooks?.map(({ producer, hook, status, evidence, effect, sequence }) => ({
      producer,
      hook,
      status,
      evidence,
      effect,
      sequence,
    })),
    [
      {
        producer: "plugin:observed",
        hook: "onContentLoaded",
        status: "executed",
        evidence: "measured",
        effect: "opaque",
        sequence: 1,
      },
    ],
  );
});

test("build provenance retains prior completed builds", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-provenance-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const config = contentTestConfig(directory);
  const build = async (body: string) => {
    const manager = new ContentManager(
      memoryContentSource({ "index.md": body }),
      [],
      { config, plugins: config.plugins },
    );
    await manager.build();
    await manager.dispose();
  };

  await build("# First");
  await build("# Second");
  const state = await loadContentBuildState(
    path.join(directory, "build", "content-state.json"),
  );

  assert.equal(state?.provenanceHistory?.length, 2);
  assert.notEqual(
    state?.provenanceHistory?.[0]?.buildId,
    state?.provenanceHistory?.[1]?.buildId,
  );
});

test("provenance history is bounded and build comparison is deterministic", () => {
  const build = (buildId: string, sourceId: string): BuildProvenance => ({
    version: 1,
    buildId,
    sources: [
      {
        id: sourceId,
        contentId: sourceId,
        path: `${sourceId}.md`,
        fingerprint: `sha256:${"a".repeat(64)}`,
        type: "markdown",
        visibility: "public",
        evidence: "deterministic",
      },
    ],
    transforms: [],
    outputs: [],
  });
  const previous = Array.from({ length: MAX_PROVENANCE_HISTORY }, (_, index) =>
    build(String(index).padStart(64, "0"), `source-${index}`),
  );
  const next = build("f".repeat(64), "source-next");
  const history = appendProvenanceHistory(previous, next);

  assert.equal(history.length, MAX_PROVENANCE_HISTORY);
  assert.equal(history[0]?.buildId, previous[1]?.buildId);
  assert.equal(history.at(-1)?.buildId, next.buildId);
  const first = previous[0];
  assert.ok(first);
  assert.deepEqual(compareBuildProvenance(first, next).sources, {
    added: ["source-next"],
    removed: ["source-0"],
    changed: [],
  });
});
