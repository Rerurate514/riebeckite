import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveConfig } from "../src/config.js";
import { ContentManager } from "../src/content/content_manager.js";
import type { ContentSource } from "../src/content/content_source.js";
import { definePlugin } from "../src/types/plugin.js";
import {
  definePluginComponent,
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

const assetProbe = definePluginComponent<{ src: string; slug?: string }>({
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
    components: [assetProbe] as readonly PluginMarkdownComponent[],
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
    components: [assetProbe] as readonly PluginMarkdownComponent[],
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
