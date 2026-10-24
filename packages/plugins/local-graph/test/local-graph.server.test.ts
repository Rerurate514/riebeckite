import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { buildLocalGraph, LocalGraph, localGraph } from "../index.ts";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

const explicitConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function resolveTitle(slug: string, title: unknown): string {
  return typeof title === "string" ? title : slug;
}

const FILES = {
  "alpha.md": "---\npublish: true\ntitle: Alpha\n---\n\n[[beta]] and [[delta]]",
  "beta.md": "---\npublish: true\ntitle: Beta\n---\n\n[[alpha]]",
  "gamma.md": "---\npublish: true\ntitle: Gamma\n---\n\n[[alpha]]",
  "delta.md": "---\npublish: true\ntitle: Delta\n---\n\n# Delta",
  "private.md": "---\npublish: false\ntitle: Private\n---\n\n[[alpha]]",
};

test("builds a local graph with current, outgoing, backlink and both nodes", async () => {
  const manifest = await new ContentManager(source(FILES), [], {
    config: explicitConfig,
  }).getManifest();

  const graph = buildLocalGraph({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });

  assert.deepEqual(graph, {
    currentSlug: "alpha",
    nodes: [
      {
        slug: "alpha",
        permalink: "/alpha",
        title: "Alpha",
        relation: "current",
        outgoing: ["beta", "delta"],
        backlinks: ["beta", "gamma"],
      },
      {
        slug: "beta",
        permalink: "/beta",
        title: "Beta",
        relation: "both",
        outgoing: ["alpha"],
        backlinks: ["alpha"],
      },
      {
        slug: "delta",
        permalink: "/delta",
        title: "Delta",
        relation: "outgoing",
        outgoing: [],
        backlinks: ["alpha"],
      },
      {
        slug: "gamma",
        permalink: "/gamma",
        title: "Gamma",
        relation: "backlink",
        outgoing: ["alpha"],
        backlinks: [],
      },
    ],
  });
});

test("builds local graphs for connected pages only", async () => {
  const manifest = await new ContentManager(source(FILES), [], {
    config: explicitConfig,
    plugins: [localGraph()],
  }).getManifest();

  // Graph data should be available for published pages with connections
  const alphaGraph = buildLocalGraph({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });
  assert.ok(alphaGraph);
  assert.equal(alphaGraph.currentSlug, "alpha");

  // Graph data should not be available for unpublished pages
  const privateGraph = buildLocalGraph({
    manifest,
    config: explicitConfig,
    slug: "private",
    resolveTitle,
  });
  assert.equal(privateGraph, null);
});

test("keeps graph data available for the Site to render", async () => {
  const manifest = await new ContentManager(source(FILES), [], {
    config: explicitConfig,
    plugins: [localGraph()],
  }).getManifest();

  const graph = buildLocalGraph({
    manifest,
    config: explicitConfig,
    slug: "alpha",
    resolveTitle,
  });
  assert.ok(graph);

  const manualHtml = renderToString(await LocalGraph({ graph }));
  assert.equal(
    (manualHtml.match(/<section[^>]*class="rr-local-graph"/g) ?? []).length,
    1,
  );
  assert.ok(manualHtml.includes('href="/beta"'));
});

test("returns null for missing or unpublished notes", async () => {
  const manifest = await new ContentManager(source(FILES), [], {
    config: explicitConfig,
  }).getManifest();

  assert.equal(
    buildLocalGraph({
      manifest,
      config: explicitConfig,
      slug: "missing",
      resolveTitle,
    }),
    null,
  );
  assert.equal(
    buildLocalGraph({
      manifest,
      config: explicitConfig,
      slug: "private",
      resolveTitle,
    }),
    null,
  );
});

test("caps visible neighbours at ten per direction", async () => {
  const files: Record<string, string> = {
    "hub.md": `---\npublish: true\ntitle: Hub\n---\n\n${Array.from(
      { length: 12 },
      (_, index) => `[[n${index}]]`,
    ).join(" ")}`,
  };
  for (let index = 0; index < 12; index += 1) {
    files[`n${index}.md`] =
      `---\npublish: true\ntitle: N${index}\n---\n\n# N${index}`;
  }

  const manifest = await new ContentManager(source(files), [], {
    config: explicitConfig,
  }).getManifest();

  const graph = buildLocalGraph({
    manifest,
    config: explicitConfig,
    slug: "hub",
    resolveTitle,
  });

  assert.ok(graph);
  assert.equal(graph.nodes.length, 11);
  assert.equal(graph.nodes.at(-1)?.slug, "n9");
  assert.deepEqual(graph.nodes[0]?.outgoing.length, 10);
});

test("matches a structured local graph", async () => {
  const manifest = await new ContentManager(source(FILES), [], {
    config: explicitConfig,
  }).getManifest();

  assertGoldenJson(
    buildLocalGraph({
      manifest,
      config: explicitConfig,
      slug: "beta",
      resolveTitle,
    }),
    new URL("./__golden__/local-graph.json", import.meta.url),
  );
});
