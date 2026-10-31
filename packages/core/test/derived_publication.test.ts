import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ContentManager } from "../src/content/content_manager.js";
import {
  type DerivedViewResolution,
  defineDerivedView,
} from "../src/derived/derived_view.js";
import { validatePublicationArtifact } from "../src/publication/artifact.js";
import {
  type PublicationSnapshot,
  publicationEntriesFromManifest,
  publicationOutputsFromManifest,
  publicationRedirectsFromManifest,
} from "../src/publication/entries.js";
import {
  createPublicationPlan,
  createPublicationSnapshot,
  type PublicationPlan,
} from "../src/publication/planner.js";
import type { ContentManifest } from "../src/types/content_manifest.js";
import { definePlugin } from "../src/types/plugin.js";
import {
  contentTestConfig,
  memoryContentSource,
} from "./support/content_fixture.js";

const BUILD_TIME = "2026-01-01T00:00:00.000Z";

const indexView = defineDerivedView<null, { slugs: string[] }>({
  id: "test.publication-index",
  version: "1",
  compute(_input, context) {
    const entries = context.query("public", {
      pool: "routable",
      sort: { field: "slug" },
    });
    return { slugs: entries.map((entry) => entry.slug) };
  },
});

const plugin = definePlugin({
  name: "combined-publication-index",
  derivedViews: [indexView],
  async planGeneratedOutputs({ derived }) {
    const resolved: DerivedViewResolution<{ slugs: string[] }> =
      await derived.resolveWithDependencies(indexView, null);
    return [
      {
        path: "derived/public-index.json",
        content: JSON.stringify(resolved.value),
        derivedViewIds: [indexView.id],
        derivedDependencies: resolved.dependencies,
      },
    ];
  },
});

async function build(
  directory: string,
  files: Record<string, string>,
): Promise<ContentManifest> {
  const manager = new ContentManager(memoryContentSource(files), [], {
    config: contentTestConfig(directory),
    plugins: [plugin],
  });
  return await manager.build({ incremental: true });
}

function plan(
  manifest: ContentManifest,
  previous?: PublicationSnapshot,
): PublicationPlan {
  return createPublicationPlan({
    buildTime: BUILD_TIME,
    entries: publicationEntriesFromManifest(manifest),
    redirects: publicationRedirectsFromManifest(manifest),
    outputs: publicationOutputsFromManifest(manifest),
    previous,
  });
}

function output(manifest: ContentManifest): {
  content: string;
  dependencies: readonly { type: string }[];
} {
  const generated = manifest.generatedOutputs.find(
    (entry) => entry.path === "derived/public-index.json",
  );
  assert.ok(generated);
  return {
    content: String(generated.content),
    dependencies: generated.dependencies ?? [],
  };
}

test("derived outputs drive publication plans and stay inside the public boundary", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-publication-"),
  );
  const cleanDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-derived-publication-clean-"),
  );
  try {
    const files: Record<string, string> = {
      "guide.md": "---\ntitle: Guide\npublish: true\n---\n# Guide\n",
      "hidden.md":
        "---\ntitle: Hidden Draft\npublish: false\n---\n# Hidden Draft\n",
    };

    const first = await build(directory, files);
    assert.deepEqual(JSON.parse(output(first).content), {
      slugs: ["guide"],
    });
    assert.ok(
      output(first).dependencies.some(
        (dependency) => dependency.type === "derived-view",
      ),
    );
    assert.ok(
      output(first).dependencies.some(
        (dependency) => dependency.type === "derived-query",
      ),
    );
    assert.ok(!output(first).content.includes("Hidden"));
    const firstPlan = plan(first);
    assert.equal(firstPlan.deploy, true);
    assert.equal(firstPlan.action, "build-and-deploy");
    const firstSnapshot = createPublicationSnapshot(firstPlan, {
      runId: "run-1",
      publishedAt: BUILD_TIME,
    });
    assert.deepEqual(
      firstSnapshot.entries.map((entry) => entry.slug),
      ["guide"],
    );

    files["extra.md"] = "---\ntitle: Extra\npublish: true\n---\n# Extra\n";
    const second = await build(directory, files);
    assert.deepEqual(JSON.parse(output(second).content), {
      slugs: ["extra", "guide"],
    });
    const secondPlan = plan(second, firstSnapshot);
    assert.equal(secondPlan.changes.detected, true);
    assert.equal(secondPlan.deploy, true);
    assert.ok(secondPlan.reasons.includes("entries-added"));
    assert.notEqual(
      secondPlan.publicationFingerprint,
      firstPlan.publicationFingerprint,
    );
    assert.deepEqual(
      validatePublicationArtifact({
        plan: secondPlan,
        artifact: {
          exists: true,
          markerPublicationFingerprint: firstPlan.publicationFingerprint,
        },
      }).map((issue) => issue.code),
      ["artifact-stale"],
    );

    const secondSnapshot = createPublicationSnapshot(secondPlan, {
      runId: "run-2",
      publishedAt: BUILD_TIME,
    });

    files["hidden.md"] =
      "---\ntitle: Hidden Draft\npublish: false\n---\n# Hidden Draft\nRewritten body.\n";
    const third = await build(directory, files);
    assert.equal(output(third).content, output(second).content);
    assert.ok(!output(third).content.includes("Hidden"));
    const thirdPlan = plan(third, secondSnapshot);
    assert.equal(thirdPlan.changes.detected, false);
    assert.equal(thirdPlan.deploy, false);
    assert.deepEqual(thirdPlan.reasons, ["up-to-date"]);

    await fs.rm(
      path.join(contentTestConfig(directory).cache.directory, "plugin"),
      { recursive: true, force: true },
    );
    const restarted = await build(directory, files);
    assert.equal(output(restarted).content, output(second).content);
    const restartedPlan = plan(restarted, secondSnapshot);
    assert.equal(restartedPlan.deploy, false);
    assert.equal(
      restartedPlan.publicationFingerprint,
      thirdPlan.publicationFingerprint,
    );

    const clean = await build(cleanDirectory, files);
    assert.equal(output(clean).content, output(restarted).content);
    const cleanPlan = plan(clean, secondSnapshot);
    assert.equal(
      cleanPlan.publicationFingerprint,
      restartedPlan.publicationFingerprint,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
    await fs.rm(cleanDirectory, { recursive: true, force: true });
  }
});
