import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { assertGoldenJson } from "@riebeckite/test";
import { buildExcaliBrainGraph } from "../index.ts";

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

const FILES = {
  "root.md": "---\npublish: true\ntitle: Root\n---\n\n[[hub]] [[cousin]]",
  "hub.md":
    "---\npublish: true\ntitle: Hub\n---\n\n[[child-a]] [[child-b]] [[peer]]",
  "child-a.md": "---\npublish: true\ntitle: Child A\n---\n\n# Child A",
  "child-b.md": "---\npublish: true\ntitle: Child B\n---\n\n# Child B",
  "child-c.md": "---\npublish: true\ntitle: Child C\n---\n\n[[hub]]",
  "peer.md": "---\npublish: true\ntitle: Peer\n---\n\n[[hub]]",
  "cousin.md": "---\npublish: true\ntitle: Cousin\n---\n\n# Cousin",
};

const HUB_MARKDOWN = "[[child-a]] [[child-b]] [[peer]]";
const HUB_FRONTMATTER = { publish: true, title: "Hub", parent: "[[root]]" };

async function hubManifest() {
  return await new ContentManager(source(FILES), [], {
    config: explicitConfig,
  }).getManifest();
}

test("builds defined, inferred and sibling relations", async () => {
  const graph = buildExcaliBrainGraph({
    slug: "hub",
    frontmatter: HUB_FRONTMATTER,
    markdown: HUB_MARKDOWN,
    manifest: await hubManifest(),
  });

  assert.equal(graph.center.title, "Hub");
  assert.deepEqual(
    graph.nodes.map((node) => node.role),
    ["parent", "child", "child", "parent", "leftFriend", "sibling"],
  );
  assert.deepEqual(
    graph.nodes.map((node) => node.relationType),
    ["defined", "inferred", "inferred", "inferred", "inferred", "inferred"],
  );
  assert.deepEqual(graph.links[0], {
    from: "hub",
    to: "root",
    role: "parent",
    relationType: "defined",
  });

  assertGoldenJson(
    graph,
    new URL("./__golden__/hub-graph.json", import.meta.url),
  );
});

test("creates virtual nodes for unresolved relation targets", async () => {
  const manifest = await new ContentManager(
    source({
      "hub.md": "---\npublish: true\ntitle: Hub\n---\n\n# Hub",
    }),
    [],
    { config: explicitConfig },
  ).getManifest();

  const graph = buildExcaliBrainGraph({
    slug: "hub",
    frontmatter: { title: "Hub", parent: "[[Ghost Note]]" },
    markdown: "",
    manifest,
  });

  assert.deepEqual(graph.nodes, [
    {
      id: "virtual:ghost note",
      slug: null,
      title: "Ghost Note",
      permalink: null,
      virtual: true,
      role: "parent",
      relationType: "defined",
    },
  ]);
  assert.deepEqual(graph.links, [
    {
      from: "hub",
      to: "virtual:ghost note",
      role: "parent",
      relationType: "defined",
    },
  ]);
});

test("returns a bare center for hidden notes unless showHidden is set", async () => {
  const manifest = await hubManifest();

  const hidden = buildExcaliBrainGraph({
    slug: "hub",
    frontmatter: { title: "Hub", hidden: true },
    markdown: HUB_MARKDOWN,
    manifest,
  });
  assert.equal(hidden.center.title, "Hub");
  assert.deepEqual(hidden.nodes, []);
  assert.deepEqual(hidden.links, []);

  const shown = buildExcaliBrainGraph({
    slug: "hub",
    frontmatter: { title: "Hub", hidden: true },
    markdown: HUB_MARKDOWN,
    manifest,
    options: { showHidden: true },
  });
  assert.ok(shown.nodes.length > 0);
});

test("skips inference and siblings when infer is disabled", async () => {
  const graph = buildExcaliBrainGraph({
    slug: "hub",
    frontmatter: HUB_FRONTMATTER,
    markdown: HUB_MARKDOWN,
    manifest: await hubManifest(),
    options: { infer: false },
  });

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    ["root"],
  );
  assert.deepEqual(
    graph.nodes.map((node) => node.relationType),
    ["defined"],
  );
  assert.deepEqual(graph.links, [
    {
      from: "hub",
      to: "root",
      role: "parent",
      relationType: "defined",
    },
  ]);
});

test("omits non-routable neighbors when isRoutable is provided", async () => {
  const files = {
    "hub.md": "---\npublish: true\ntitle: Hub\n---\n\n[[secret]]",
    "secret.md": "---\npublish: false\ntitle: Secret\n---\n\n# Secret",
  };
  const manifest = await new ContentManager(source(files), [], {
    config: explicitConfig,
  }).getManifest();
  const input = {
    slug: "hub",
    frontmatter: { publish: true, title: "Hub" },
    markdown: "[[secret]]",
    manifest,
  };

  const gated = buildExcaliBrainGraph({
    ...input,
    isRoutable: (candidate) =>
      manifest.bySlug.get(candidate)?.publishing.routable ?? false,
  });
  assert.deepEqual(gated.nodes, []);
  assert.deepEqual(gated.links, []);

  const ungated = buildExcaliBrainGraph(input);
  assert.deepEqual(
    ungated.nodes.map((node) => node.slug),
    ["secret"],
  );
});
