import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ContentManager,
  createPublicContentView,
  resolveConfigModule,
} from "@riebeckite/core";
import configModule from "./riebeckite.config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const config = resolveConfigModule(configModule);

assert.equal(config.plugins.length, 3);

const manager = new ContentManager(path.resolve(here, "../vault"), [], {
  config,
  plugins: config.plugins,
});
const manifest = await manager.getManifest();

const discoverable = manifest.discoverableEntries
  .map((entry) => entry.slug)
  .sort();
assert.deepEqual(discoverable, [
  "index",
  "notes/alpha",
  "notes/beta",
  "notes/gamma",
]);

assert.ok(
  manifest.entries.some((entry) => entry.slug === "notes/draft"),
  "raw entries should still contain the draft; the safe collection is what protects output",
);

const alpha = manifest.bySlug.get("notes/alpha");
assert.ok(alpha, "alpha should resolve");
assert.ok(
  alpha.html.includes('<mark class="rr-highlight">important</mark>'),
  alpha.html,
);

// The related-posts plugin no longer injects HTML during manifest creation.
// It exposes a data helper plus a renderer, and the Site composes them.
const alphaEntry = manifest.bySlug.get("notes/alpha");
const { getRelatedPosts, renderRelatedPosts } = await import(
  "@plugin-dx/related-posts"
);
const view = createPublicContentView(manifest);
const alphaRoutable = view.findRoutableBySlug("notes/alpha");
const relatedEntries =
  alphaEntry && alphaRoutable
    ? await getRelatedPosts({ view, entry: alphaRoutable })
    : [];

const rrHtml = renderRelatedPosts(relatedEntries);
assert.ok(rrHtml.includes(">Beta</a>"), rrHtml);
assert.ok(!rrHtml.includes("Secret"), rrHtml);

assert.deepEqual(manifest.pagePaths, ["/plugin-demo"]);
const page = await manager.resolvePage("/plugin-demo");
assert.ok(page, "plugin page should resolve");
assert.ok(page.body.includes("data-plugin-demo"));

assert.ok(
  manifest.assets.some(
    (asset) => asset.moduleSpecifier === "@plugin-dx/demo/style.css",
  ),
);
assert.ok(
  manifest.clientEntries.some(
    (entry) => entry.moduleSpecifier === "@plugin-dx/demo/client",
  ),
);

const coreUrl = import.meta.resolve("@riebeckite/core");
assert.ok(coreUrl.includes("@riebeckite"), coreUrl);
assert.ok(
  import.meta.resolve("@plugin-dx/demo/style.css").endsWith("style.css"),
);
assert.ok(import.meta.resolve("@plugin-dx/demo/client").endsWith("client.js"));

const client = await import("@plugin-dx/demo/client");
assert.equal(typeof client.initPluginDemo, "function");

console.log("external plugin verification passed");
