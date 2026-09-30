import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden, assertGoldenJson } from "@riebeckite/test";
import {
  type ExcaliBrainGraph,
  type ExcaliBrainLayout,
  type ExcaliBrainNode,
  excaliBrainPlugin,
  layoutExcaliBrain,
  renderExcaliBrainSection,
  renderExcaliBrainSvg,
  resolveExcaliBrainOptions,
  validateExcaliBrainOptions,
} from "../index.ts";
import {
  hasExcaliBrainPlaceholder,
  replaceExcaliBrainPlaceholders,
} from "../src/placeholder.ts";
import { rehypeExcaliBrain } from "../src/rehype.ts";

function node(
  id: string,
  role: ExcaliBrainNode["role"],
  title: string,
): ExcaliBrainNode {
  return {
    id,
    slug: id,
    title,
    permalink: `/${id}`,
    virtual: false,
    role,
    relationType: "defined",
  };
}

const GRAPH: ExcaliBrainGraph = {
  center: node("center", "center", "Center"),
  nodes: [
    node("parent", "parent", "Parent"),
    node("child", "child", "Child"),
    node("left", "leftFriend", "Left Friend"),
    node("right", "rightFriend", "Right Friend"),
    node("previous", "previous", "Previous"),
    node("next", "next", "Next"),
    node("sibling", "sibling", "Sibling"),
  ],
  links: [
    { from: "center", to: "parent", role: "parent", relationType: "defined" },
    { from: "center", to: "child", role: "child", relationType: "defined" },
    { from: "center", to: "left", role: "leftFriend", relationType: "defined" },
    {
      from: "center",
      to: "right",
      role: "rightFriend",
      relationType: "defined",
    },
    {
      from: "center",
      to: "previous",
      role: "previous",
      relationType: "defined",
    },
    { from: "center", to: "next", role: "next", relationType: "defined" },
    { from: "center", to: "sibling", role: "sibling", relationType: "defined" },
  ],
};

test("resolves default and overridden options", () => {
  const defaults = resolveExcaliBrainOptions();

  assert.equal(defaults.render, "build");
  assert.equal(defaults.auto, true);
  assert.equal(defaults.heading, true);
  assert.equal(defaults.headingText, "ExcaliBrain");
  assert.equal(defaults.className, "rb-excalibrain");
  assert.equal(defaults.maxPerRegion, 8);
  assert.equal(defaults.infer, true);
  assert.equal(defaults.siblings, true);
  assert.equal(defaults.showHidden, false);
  assert.equal(defaults.width, 720);
  assert.equal(defaults.height, 480);
  assert.equal(defaults.language, "excalibrain");
  assert.equal(defaults.ontology.fieldRole.get("parent"), "parents");

  const custom = resolveExcaliBrainOptions({
    render: "client",
    width: 100,
    height: 50,
    maxPerRegion: 0,
    ontology: { hidden: ["secret"] },
  });
  assert.equal(custom.render, "client");
  assert.equal(custom.width, 100);
  assert.equal(custom.height, 50);
  assert.equal(custom.maxPerRegion, 0);
  assert.equal(custom.ontology.fieldRole.get("secret"), "hidden");
});

test("validates option values", () => {
  assert.deepEqual(validateExcaliBrainOptions({ render: "svg" } as never), [
    { path: "render", message: 'Expected "build", "client", or "both".' },
  ]);
  assert.deepEqual(validateExcaliBrainOptions({ maxPerRegion: -1 }), [
    { path: "maxPerRegion", message: "Expected a non-negative integer." },
  ]);
  assert.deepEqual(validateExcaliBrainOptions({ width: 0 }), [
    { path: "width", message: "Expected a positive number." },
  ]);
  assert.deepEqual(validateExcaliBrainOptions({ ontology: ["x"] } as never), [
    {
      path: "ontology",
      message: "Expected an object of field-name arrays.",
    },
  ]);
  assert.deepEqual(validateExcaliBrainOptions(undefined), []);
  assert.deepEqual(
    validateExcaliBrainOptions({ render: "both", width: 10, height: 10 }),
    [],
  );
});

test("lays out every region deterministically", () => {
  const layout = layoutExcaliBrain(GRAPH);

  assert.equal(layout.nodes.length, 8);
  assert.equal(layout.links.length, 7);
  assert.deepEqual(
    [...new Set(layout.nodes.map((positioned) => positioned.region))].sort(),
    [
      "center",
      "children",
      "left-friends",
      "next",
      "parents",
      "previous",
      "right-friends",
      "siblings",
    ],
  );

  assertGoldenJson(
    layout,
    new URL("./__golden__/layout.json", import.meta.url),
  );

  const collapsed = layoutExcaliBrain(GRAPH, { maxPerRegion: 0 });
  assert.equal(collapsed.nodes.length, 1);
  assert.equal(collapsed.nodes[0]?.region, "center");
});

test("renders an SVG with escaped titles and links", () => {
  const graph: ExcaliBrainGraph = {
    center: {
      id: "a&b",
      slug: "a&b",
      title: 'A & B <"x">',
      permalink: null,
      virtual: false,
      role: "center",
      relationType: "defined",
    },
    nodes: [],
    links: [],
  };
  const layout: ExcaliBrainLayout = {
    width: 200,
    height: 100,
    nodes: [
      {
        id: "a&b",
        role: "center",
        region: "center",
        relationType: "defined",
        title: 'A & B <"x">',
        slug: "a&b",
        permalink: null,
        virtual: false,
        x: 10,
        y: 10,
        width: 120,
        height: 40,
      },
    ],
    links: [],
  };

  const svg = renderExcaliBrainSvg(graph, layout);

  assert.ok(
    svg.includes('aria-label="A &amp; B &lt;&quot;x&quot;&gt; ExcaliBrain"'),
  );
  assert.ok(svg.includes('data-node-slug="a&amp;b"'));
  assert.ok(svg.includes("&lt;"));
});

test("renders build, client and both section modes", () => {
  const layout = layoutExcaliBrain(GRAPH);

  const build = renderExcaliBrainSection({ graph: GRAPH, layout });
  assert.ok(build.includes('data-excalibrain-render="build"'));
  assert.ok(build.includes("__svg"));
  assert.ok(!build.includes("data-excalibrain-payload"));

  const client = renderExcaliBrainSection({
    graph: GRAPH,
    layout,
    render: "client",
  });
  assert.ok(client.includes('data-excalibrain-render="client"'));
  assert.ok(client.includes("data-excalibrain-payload="));
  assert.ok(!client.includes("__svg"));

  const both = renderExcaliBrainSection({
    graph: GRAPH,
    layout,
    render: "both",
  });
  assert.ok(both.includes("__svg"));
  assert.ok(both.includes("data-excalibrain-payload="));

  const noHeading = renderExcaliBrainSection({
    graph: GRAPH,
    layout,
    options: { heading: false },
  });
  assert.ok(!noHeading.includes("__heading"));
});

test("renders a section golden", () => {
  assertGolden(
    renderExcaliBrainSection({
      graph: GRAPH,
      layout: layoutExcaliBrain(GRAPH),
    }),
    new URL("./__golden__/section.html", import.meta.url),
  );
});

test("rehype replaces code blocks with a placeholder", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-excalibrain"] },
            children: [],
          },
        ],
      },
      { type: "element", tagName: "p", properties: {}, children: [] },
    ],
  };

  rehypeExcaliBrain()(tree as never);

  assert.equal(tree.children[0]?.type, "raw");
  assert.equal(
    (tree.children[0] as { value: string }).value,
    '<div data-rb-excalibrain=""></div>',
  );
  assert.equal(tree.children[1]?.type, "element");
});

test("replaces placeholder divs with the rendered section", () => {
  const html = '<p>Before</p><div data-rb-excalibrain=""></div><p>After</p>';

  assert.equal(hasExcaliBrainPlaceholder(html), true);
  assert.equal(
    replaceExcaliBrainPlaceholders(html, "<section>X</section>"),
    "<p>Before</p><section>X</section><p>After</p>",
  );
});

test("excaliBrainPlugin registers assets and a client entry", () => {
  const plugin = excaliBrainPlugin();

  assert.equal(plugin.name, "excalibrain");
  assert.equal(plugin.order, -10);
  assert.deepEqual(plugin.assets, [
    {
      pluginName: "excalibrain",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-excalibrain/style.css",
    },
  ]);
  assert.deepEqual(plugin.clientEntries, [
    {
      pluginName: "excalibrain",
      moduleSpecifier: "@riebeckite/plugin-excalibrain/client",
      exportName: "initExcaliBrain",
    },
  ]);
});
