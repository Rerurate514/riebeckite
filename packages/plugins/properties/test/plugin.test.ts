import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import { createPublicContentView } from "@riebeckite/core";
import { ArticleProvider, SiteProvider } from "@riebeckite/ui";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import Properties from "../components/properties.js";
import {
  properties,
  propertiesPlugin,
  renderPropertiesPanel,
} from "../index.ts";
import { getProperties } from "../src/component-data.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function entry(
  slug: string,
  frontmatter: Record<string, unknown> = {},
  html = "",
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    html,
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
}

function manifestOf(entries: ContentManifestEntry[]): ContentManifest {
  return {
    entries,
    publicEntries: entries,
    bySlug: new Map(entries.map((item) => [item.slug, item])),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

async function runHook(
  plugin: ReturnType<typeof properties>,
  entries: ContentManifestEntry[],
): Promise<Diagnostic[]> {
  const manifest = manifestOf(entries);
  const diagnostics: Diagnostic[] = [];
  await plugin.onManifestCreated?.({ manifest, diagnostics } as never);
  return diagnostics;
}

test("properties() is re-exported as propertiesPlugin and registers its stylesheet", () => {
  assert.equal(propertiesPlugin, properties);
  assert.deepEqual(properties().assets, [
    {
      pluginName: "properties",
      kind: "style",
      moduleSpecifier: "@riebeckite/plugin-properties/style.css",
    },
  ]);
});

test("renders the properties panel data for the Site", async () => {
  const entries = [entry("a", { title: "A" }, "<p>A</p>")];
  const manifest = manifestOf(entries);
  const view = createPublicContentView(manifest);
  const entry_ = manifest.entries[0];
  const data = await getProperties({ view, frontmatter: entry_.frontmatter });

  assert.equal(
    renderToString(await Properties({ data })).includes("data-properties"),
    true,
  );
  assert.match(
    renderToString(await Properties({ data })),
    /data-property-count="1"/,
  );
  await runHook(properties(), entries);
});

test("renders nothing when options produce no items", async () => {
  const entries = [entry("a", { publish: true }, "<p>A</p>")];
  const diagnostics = await runHook(properties(), entries);
  assert.deepEqual(diagnostics, []);
  const data = await getProperties({
    view: createPublicContentView(manifestOf(entries)),
    frontmatter: entries[0].frontmatter,
  });
  assert.equal(renderToString(await Properties({ data })), "");
});

test("the manifest hook is idempotent and skips empty panels", async () => {
  const already = entry("done", { title: "A" }, "<p>A</p>");
  const nothing = entry("nothing", { publish: true }, "<p>B</p>");
  const empty = entry("empty", { publish: true }, "");

  await runHook(properties(), [already, nothing, empty]);

  assert.equal(already.html, "<p>A</p>");
  const emptyData = await getProperties({
    view: createPublicContentView(manifestOf([empty])),
    frontmatter: empty.frontmatter,
  });
  assert.equal(renderToString(await Properties({ data: emptyData })), "");
  assert.equal(nothing.html, "<p>B</p>");
  assert.equal(empty.html, "");
});

test("wikilink values resolve through the manifest content index", async () => {
  const source = entry("note", { title: "Note" }, "<p>n</p>");
  const linking = entry(
    "a",
    { title: "A", related: "[[note#Section]]" },
    "<p>A</p>",
  );
  const manifest = manifestOf([source, linking]);
  manifest.contentIndex.set("note", "note");

  const diagnostics: Diagnostic[] = [];
  await properties().onManifestCreated?.({ manifest, diagnostics } as never);

  const data = await getProperties({
    view: createPublicContentView(manifest),
    frontmatter: linking.frontmatter,
  });
  const html = renderToString(await Properties({ data }));
  assert.match(html, /href="\/note#Section"/);
  assert.doesNotMatch(html, /\[\[note/);
  assert.deepEqual(diagnostics, []);
});

test("declares output dependencies for resolved property wikilinks", () => {
  const source = entry("note", { title: "Note" });
  const linking = entry("a", { related: "[[note#Section]]" });
  const manifest = manifestOf([source, linking]);
  manifest.contentIndex.set("note", "note");

  const dependencies = properties().resolveContentOutputDependencies?.({
    entry: linking,
    manifest,
  });

  assert.deepEqual(dependencies, [{ type: "content", slug: "note" }]);
});

test("retains a global dependency for unresolved property wikilinks", () => {
  const linking = entry("a", { related: "[[later]]" });
  const manifest = manifestOf([linking]);

  const dependencies = properties().resolveContentOutputDependencies?.({
    entry: linking,
    manifest,
  });

  assert.deepEqual(dependencies, [{ type: "global" }]);
});

test("does not add a global dependency without property wikilinks", () => {
  const item = entry("a", { title: "A", status: "published" });
  const manifest = manifestOf([item]);

  const dependencies = properties().resolveContentOutputDependencies?.({
    entry: item,
    manifest,
  });

  assert.deepEqual(dependencies, []);
});

test("unrenderable values produce a tagged diagnostic", async () => {
  const entries = [entry("bad", { weird: Symbol("x") }, "<p>b</p>")];
  const diagnostics = await runHook(properties(), entries);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, "properties-unrenderable-value");
  assert.equal(diagnostics[0]?.severity, "warning");
  assert.equal(diagnostics[0]?.pluginName, "properties");
  assert.equal(diagnostics[0]?.slug, "bad");
  assert.match(diagnostics[0]?.message ?? "", /`weird`/);
});

test("getProperties returns structured values without HTML", async () => {
  const note = entry("note", { title: "Note" });
  const source = entry("a", {
    tags: ["Tag", "JP/Web"],
    status: "published",
    created: "2024-01-02",
    related: "[[note|the note]]",
    meta: { lang: "ja" },
    draft: false,
  });
  const manifest = manifestOf([note, source]);
  manifest.contentIndex.set("note", "note");
  const data = await getProperties({
    view: createPublicContentView(manifest),
    frontmatter: source.frontmatter,
    options: {
      fields: {
        status: { type: "badge", variants: { published: "success" } },
      },
    },
  });

  assert.deepEqual(data.items.find((item) => item.key === "tags")?.value, {
    kind: "tags",
    variant: "chips",
    tags: [
      { tag: "Tag", text: "#Tag", href: "/tags/tag" },
      { tag: "JP/Web", text: "#JP/Web", href: "/tags/jp/web" },
    ],
  });
  assert.deepEqual(data.items.find((item) => item.key === "status")?.value, {
    kind: "badge",
    text: "published",
    variant: "success",
  });
  assert.deepEqual(data.items.find((item) => item.key === "created")?.value, {
    kind: "date",
    value: "2024-01-02",
    formatted: "2024-01-02",
  });
  assert.deepEqual(data.items.find((item) => item.key === "related")?.value, {
    kind: "link",
    text: "the note",
    href: "/note",
    external: false,
  });
  assert.deepEqual(data.items.find((item) => item.key === "meta")?.value, {
    kind: "group",
    entries: [{ key: "lang", value: { kind: "text", text: "ja" } }],
  });
  assert.deepEqual(data.items.find((item) => item.key === "draft")?.value, {
    kind: "boolean",
    value: false,
  });
  assert.doesNotMatch(JSON.stringify(data), /<[a-z/]/i);
  assert.doesNotMatch(JSON.stringify(data), /"\[/);
});

test("the component and renderPropertiesPanel share value semantics", async () => {
  const source = entry("a", {
    tags: ["Tag"],
    related: "[[note]]",
    created: "2024-01-02",
    status: "draft",
  });
  const manifest = manifestOf([entry("note", {}), source]);
  manifest.contentIndex.set("note", "note");
  const options = {
    fields: {
      status: { type: "badge" as const, variants: { draft: "warning" } },
    },
  };
  const view = createPublicContentView(manifest);
  const data = await getProperties({
    view,
    frontmatter: source.frontmatter,
    options,
  });
  const component = renderToString(await Properties({ data }));
  const panel = renderPropertiesPanel(source.frontmatter, options, {
    resolveLink: (target) => (target === "note" ? "/note" : null),
  });

  assert.equal(component, panel);
});

test("className adds to the configured root class and CSS hooks stay stable", async () => {
  const source = entry("a", { tags: ["Tag"], status: "draft" });
  const data = await getProperties({
    view: createPublicContentView(manifestOf([source])),
    frontmatter: source.frontmatter,
  });
  const html = renderToString(
    await Properties({
      data,
      className: "site-panel",
    }),
  );

  assert.match(html, /^<section class="rb-properties site-panel"/);
  assert.match(html, /data-property-key="tags"/);
  assert.match(html, /class="rb-properties__tag"/);
  assert.match(html, /class="rb-properties__list"/);
});

test("component options override PluginConfig while unspecified fields remain", async () => {
  const source = entry("a", { tags: ["Tag"], status: "draft" });
  const manifest = manifestOf([source]);
  const view = createPublicContentView(manifest);
  const site = {
    config: {
      plugins: [
        {
          name: "properties",
          options: {
            title: "Config",
            fields: { tags: { type: "tags", tagBase: "/topics/" } },
          },
        },
      ],
    },
    manifest,
    view,
    path: "/a",
  };
  const tree = createElement(
    SiteProvider,
    site as never,
    createElement(
      ArticleProvider,
      { post: { frontmatter: source.frontmatter } } as never,
      createElement(Properties, {
        options: { title: "Local" },
      }),
    ),
  );
  const html = renderToString(tree);

  assert.match(html, />Local<\/h2>/);
  assert.doesNotMatch(html, />Config<\/h2>/);
  assert.match(html, /data-tag="Tag" href="\/topics\/tag"/);
});

test("draft targets stay unlinked while unlisted targets are routable", async () => {
  const draft = entry("secret", { title: "Secret" });
  draft.publishing = {
    visibility: "draft",
    routable: false,
    discoverable: false,
  };
  const unlisted = entry("quiet", { title: "Quiet" });
  unlisted.publishing = {
    visibility: "unlisted",
    routable: true,
    discoverable: false,
  };
  const source = entry("a", {
    draftLink: "[[secret]]",
    unlistedLink: "[[quiet]]",
  });
  const manifest = manifestOf([draft, unlisted, source]);
  manifest.contentIndex.set("secret", "secret");
  manifest.contentIndex.set("quiet", "quiet");
  const view = createPublicContentView(manifest);
  const data = await getProperties({
    view,
    frontmatter: source.frontmatter,
  });
  const html = renderToString(await Properties({ data }));

  assert.match(html, /\[\[secret\]\]/);
  assert.doesNotMatch(html, /href="\/secret"/);
  assert.match(html, /href="\/quiet">quiet<\/a>/);
});

test("tagBase and tag variants can be configured through PluginConfig", async () => {
  const source = entry("a", { tags: ["Tag"] });
  const manifest = manifestOf([source]);
  const view = createPublicContentView(manifest);
  const site = {
    config: {
      plugins: [
        {
          name: "properties",
          options: {
            fields: {
              tags: {
                type: "tags",
                tagBase: "/topics/",
                variant: "links",
              },
            },
          },
        },
      ],
    },
    manifest,
    view,
    path: "/a",
  };
  const tree = createElement(
    SiteProvider,
    site as never,
    createElement(
      ArticleProvider,
      { post: { frontmatter: source.frontmatter } } as never,
      createElement(Properties, {}),
    ),
  );
  const html = renderToString(tree);

  assert.match(html, /data-variant="links"/);
  assert.match(html, /href="\/topics\/tag"/);
});

test("plugin validation reports field configuration paths", () => {
  const issues = properties({
    fields: {
      status: { type: "unknown" } as never,
    },
  }).validateOptions?.({
    fields: {
      status: { type: "unknown" } as never,
    },
  });

  assert.deepEqual(
    issues?.map((issue) => issue.path),
    ["fields.status.type"],
  );
});
