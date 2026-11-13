import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { definePlugin } from "../src/types/plugin.js";
import {
  defineHastTransform,
  defineMarkdownComponent,
  type PluginMarkdownComponent,
} from "../src/types/plugin_component.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

const assetProbe = defineMarkdownComponent<{ src: string; slug?: string }>({
  name: "AssetProbe",
  parseProps: (props) => ({ src: String(props.src ?? "") }),
  resolveProps: (props, context) => {
    const asset = context.resolveAssetUrl(props.src);
    if (!asset) throw new Error(`Unresolved asset: ${props.src}`);
    return { src: asset.url, slug: context.sourceSlug ?? "" };
  },
  render: (props) =>
    `<span data-resolved-src="${props.src}" data-resolved-slug="${props.slug ?? ""}">ok</span>`,
});

const fixture = `---
publish: true
title: Demo
---

\`\`\`riebeckite-component AssetProbe
src: ./image.png
\`\`\`
`;

test("plugin component resolveProps receives the source slug and asset resolver", async () => {
  const plugin = definePlugin({
    name: "asset-probe",
    markdownComponents: [assetProbe] as readonly PluginMarkdownComponent[],
  });
  const manager = new ContentManager(
    memorySource({ "posts/demo.md": fixture }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [plugin],
      }),
    },
  );

  const manifest = await manager.getManifest();
  const html = manifest.bySlug.get("posts/demo")?.html ?? "";

  assert.match(html, /data-resolved-src="\/posts\/image\.png"/);
  assert.match(html, /data-resolved-slug="posts\/demo"/);
  assert.match(html, /data-riebeckite-component-props="/);
  assert.match(html, /&#x22;src&#x22;:&#x22;\/posts\/image\.png&#x22;/);
});

test("plugin component resolveProps failures surface as pipeline errors", async () => {
  const plugin = definePlugin({
    name: "asset-probe",
    markdownComponents: [assetProbe] as readonly PluginMarkdownComponent[],
  });
  const manager = new ContentManager(
    memorySource({
      "posts/demo.md": fixture.replace("./image.png", "./image.txt"),
    }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [plugin],
      }),
    },
  );

  await assert.rejects(
    manager.getManifest(),
    /Unresolved asset: \.\/image\.txt/,
  );
});

test("HAST transforms wrap sanitized nodes and receive serialized children", async () => {
  const section = defineHastTransform({
    name: "SectionWrap",
    match: (node) => node.tagName === "h2",
    render: ({ children }) =>
      `<section data-hast-component="SectionWrap">${children}</section>`,
  });
  const plugin = definePlugin({
    name: "hast-probe",
    hastTransforms: [section],
  });
  const manager = new ContentManager(
    memorySource({
      "posts/demo.md": `---
publish: true
title: Demo
---

## Hello

<h2 onclick="alert(1)">Unsafe<script>alert(1)</script></h2>
`,
    }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [plugin],
      }),
    },
  );

  const html =
    (await manager.getManifest()).bySlug.get("posts/demo")?.html ?? "";

  assert.match(
    html,
    /<section data-hast-component="SectionWrap">Hello<\/section>/,
  );
  assert.match(
    html,
    /<section data-hast-component="SectionWrap">Unsafe<\/section>/,
  );
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /onclick/);
});

const deferredProbe = defineMarkdownComponent<{ src: string; slug?: string }>({
  name: "DeferredProbe",
  deferUntilManifest: true,
  parseProps: (props) => ({ src: String(props.src ?? "") }),
  resolveProps: (props, context) => {
    context.diagnostics?.push({
      code: "deferred-probe",
      severity: "info",
      pluginName: "deferred-probe",
      slug: context.sourceSlug ?? "",
      message: "resolved after manifest",
    });
    const asset = context.resolveAssetUrl(props.src);
    if (!asset) throw new Error(`Unresolved asset: ${props.src}`);
    return { src: asset.url, slug: context.sourceSlug ?? "" };
  },
  render: (props) =>
    `<span data-deferred-src="${props.src}" data-deferred-slug="${props.slug ?? ""}">ok</span>`,
  renderError: (error) => `<span data-deferred-error>${String(error)}</span>`,
});

test("deferred Markdown components resolve after the manifest is available", async () => {
  const plugin = definePlugin({
    name: "deferred-probe",
    markdownComponents: [deferredProbe] as readonly PluginMarkdownComponent[],
  });
  const manager = new ContentManager(
    memorySource({
      "posts/demo.md": fixture.replace("AssetProbe", "DeferredProbe"),
    }),
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [plugin],
      }),
    },
  );

  const manifest = await manager.getManifest();
  const html = manifest.bySlug.get("posts/demo")?.html ?? "";

  assert.match(html, /data-deferred-src="\/posts\/image\.png"/);
  assert.match(html, /data-deferred-slug="posts\/demo"/);
  assert.doesNotMatch(html, /data-riebeckite-component-deferred/);
  assert.ok(
    manifest.diagnostics.some(
      (diagnostic) => diagnostic.code === "deferred-probe",
    ),
  );
});
