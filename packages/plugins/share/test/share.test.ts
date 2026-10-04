import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  resolveConfig,
} from "@riebeckite/core";
import { initShare } from "../client.js";
import { share } from "../index.ts";
import {
  DEFAULT_SHARE_SERVICES,
  resolveShareOptions,
  validateShareOptions,
} from "../src/options.js";
import { renderShareControls, SHARE_ATTRIBUTE } from "../src/render.js";
import {
  buildShareLinks,
  buildShareUrl,
  normalizeMastodonInstance,
} from "../src/services.js";

const URL = "https://example.com/posts/hello";
const TITLE = "Hello World";

function manifestOf(entry: ContentManifestEntry): ContentManifest {
  return {
    entries: [entry],
    publicEntries: [entry],
    bySlug: new Map([[entry.slug, entry]]),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

test("normalizeMastodonInstance accepts hosts and full URLs", () => {
  assert.equal(normalizeMastodonInstance("mastodon.social"), "mastodon.social");
  assert.equal(
    normalizeMastodonInstance("https://mastodon.social/"),
    "mastodon.social",
  );
  assert.equal(
    normalizeMastodonInstance("https://mastodon.social/@user"),
    "mastodon.social",
  );
  assert.equal(normalizeMastodonInstance("  "), "");
  assert.equal(normalizeMastodonInstance(undefined), "");
});

test("buildShareUrl encodes URL and title per service", () => {
  const target = { url: URL, title: TITLE };
  assert.equal(
    buildShareUrl("x", target),
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(URL)}&text=Hello%20World`,
  );
  assert.equal(
    buildShareUrl("bluesky", target),
    `https://bsky.app/intent/compose?text=${encodeURIComponent(`${TITLE} ${URL}`)}`,
  );
  assert.equal(
    buildShareUrl("facebook", target),
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL)}`,
  );
  assert.equal(
    buildShareUrl("linkedin", target),
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(URL)}`,
  );
  assert.equal(
    buildShareUrl("hatena", target),
    `https://b.hatena.ne.jp/add?mode=confirm&url=${encodeURIComponent(URL)}&title=Hello%20World`,
  );
  assert.equal(buildShareUrl("copy", target), null);
});

test("buildShareUrl builds a Mastodon URL from the instance", () => {
  assert.equal(
    buildShareUrl("mastodon", { url: URL, title: TITLE }, "https://m.s/"),
    `https://m.s/share?text=${encodeURIComponent(`${TITLE} ${URL}`)}`,
  );
  assert.equal(buildShareUrl("mastodon", { url: URL, title: TITLE }, ""), null);
});

test("buildShareLinks skips copy and unusable Mastodon", () => {
  const options = resolveShareOptions({
    services: ["x", "mastodon", "copy"],
  });
  const links = buildShareLinks(options, { url: URL, title: TITLE });
  assert.deepEqual(
    links.map((link) => link.service),
    ["x"],
  );
  assert.equal(links[0]?.url.startsWith("https://twitter.com/"), true);
});

test("resolveShareOptions defaults to the non-Mastodon set", () => {
  const resolved = resolveShareOptions();
  assert.deepEqual(resolved.services, DEFAULT_SHARE_SERVICES);
  assert.equal(resolved.placement, "bottom");
  assert.equal(resolved.mastodonInstance, "");
  assert.equal(resolved.labels.copy, "Copy link");
});

test("resolveShareOptions dedupes known services and merges labels", () => {
  const resolved = resolveShareOptions({
    services: ["x", "x", "bluesky"],
    placement: "top",
    labels: { x: "Twitter" },
    copiedLabel: "コピーしました",
  });
  assert.deepEqual(resolved.services, ["x", "bluesky"]);
  assert.equal(resolved.placement, "top");
  assert.equal(resolved.labels.x, "Twitter");
  assert.equal(resolved.copiedLabel, "コピーしました");
});

test("validateShareOptions requires an instance for Mastodon", () => {
  const issues = validateShareOptions({ services: ["x", "mastodon"] });
  assert.equal(
    issues.some((issue) => issue.path === "mastodonInstance"),
    true,
  );
  assert.deepEqual(
    validateShareOptions({ services: ["x"], placement: "bottom" }),
    [],
  );
});

test("validateShareOptions rejects unknown services and labels", () => {
  const issues = validateShareOptions({
    // Deliberately invalid runtime values.
    services: ["x", "myspace"] as never,
    labels: { friendster: "Friendster" } as never,
  });
  assert.equal(
    issues.some((issue) => issue.path === "services[1]"),
    true,
  );
  assert.equal(
    issues.some((issue) => issue.path === "labels.friendster"),
    true,
  );
});

test("renderShareControls renders links and a hidden copy button", () => {
  const options = resolveShareOptions({ services: ["x", "copy"] });
  const html = renderShareControls(options, { url: URL, title: TITLE });
  assert.equal(html.includes(SHARE_ATTRIBUTE), true);
  assert.equal(html.includes('role="group"'), true);
  assert.equal(html.includes('data-share-service="x"'), true);
  assert.equal(html.includes(`href="https://twitter.com/intent/tweet`), true);
  assert.equal(html.includes(`data-share-url="${URL}"`), true);
  assert.equal(html.includes("data-rr-share-copy"), true);
  assert.equal(html.includes("hidden>"), true);
  assert.equal(html.includes('class="rr-share__status"'), true);
});

test("renderShareControls returns empty when nothing is renderable", () => {
  const options = resolveShareOptions({ services: [] });
  assert.equal(renderShareControls(options, { url: URL, title: TITLE }), "");
});

test("share contributes controls to its configured article slot", () => {
  const entry: ContentManifestEntry = {
    slug: "hello",
    permalink: "/hello",
    publicLocation: { slug: "hello", permalink: "/hello" },
    title: TITLE,
    frontmatter: {},
    html: "<p>Body</p>",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
  };
  const context = {
    manifest: manifestOf(entry),
    config: resolveConfig({
      site: { title: "Test", baseUrl: "https://example.com" },
    }),
  };

  share({ services: ["x"], placement: "top" }).onManifestCreated?.(
    context as never,
  );

  assert.equal(entry.html, "<p>Body</p>");
  assert.match(
    entry.bodySlots?.["article.before-content"] ?? "",
    /data-rr-share/,
  );
});

test("initShare is a no-op without a document", () => {
  assert.equal(typeof document, "undefined");
  assert.doesNotThrow(() => initShare());
});
