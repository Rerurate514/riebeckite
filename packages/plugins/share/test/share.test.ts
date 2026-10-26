import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  createPublicContentView,
  resolveConfig,
} from "@riebeckite/core";
import { ArticleProvider, SiteProvider } from "@riebeckite/ui";
import { createElement, Fragment } from "hono/jsx";
import { renderToReadableStream } from "hono/jsx/dom/server";
import { getShareLinks, ShareControls, share } from "../index.ts";
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

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function manifestOf(entry: ContentManifestEntry): ContentManifest {
  return {
    entries: [entry],
    publicEntries: [entry],
    bySlug: new Map([[entry.slug, entry]]),
    contentIndex: new Map(),
  } as unknown as ContentManifest;
}

async function render(
  element: Parameters<typeof renderToReadableStream>[0],
): Promise<string> {
  const stream = await renderToReadableStream(element);
  return new Response(stream).text();
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
  assert.equal(resolved.mastodonInstance, "");
  assert.equal(resolved.labels.copy, "Copy link");
});

test("resolveShareOptions dedupes known services and merges labels", () => {
  const resolved = resolveShareOptions({
    services: ["x", "x", "bluesky"],
    labels: { x: "Twitter" },
    copiedLabel: "コピーしました",
  });
  assert.deepEqual(resolved.services, ["x", "bluesky"]);
  assert.equal(resolved.labels.x, "Twitter");
  assert.equal(resolved.copiedLabel, "コピーしました");
});

test("validateShareOptions requires an instance for Mastodon", () => {
  const issues = validateShareOptions({ services: ["x", "mastodon"] });
  assert.equal(
    issues.some((issue) => issue.path === "mastodonInstance"),
    true,
  );
  assert.deepEqual(validateShareOptions({ services: ["x"] }), []);
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
  assert.equal(html.includes("twitter.com/intent/tweet"), true);
  assert.equal(html.includes(`data-share-url="${URL}"`), true);
  assert.equal(html.includes("data-rr-share-copy"), true);
  assert.equal(html.includes("hidden>"), true);
  assert.equal(html.includes('class="rr-share__status"'), true);
});

test("renderShareControls returns empty when nothing is renderable", () => {
  const options = resolveShareOptions({ services: [] });
  assert.equal(renderShareControls(options, { url: URL, title: TITLE }), "");
});

test("component rendering matches the share CSS and client hooks", async () => {
  const html = await render(
    createElement(ShareControls, {
      links: [{ service: "x", label: "X", url: "https://example.com/share" }],
      copyUrl: URL,
    }),
  );

  assert.match(html, /class="rr-share__list"/);
  assert.match(html, /class="rr-share__link rr-share__link--x"/);
  assert.match(html, /data-rr-share-copy/);
  assert.match(html, /class="rr-share__button rr-share__copy"/);
  assert.match(html, /class="rr-share__status"/);
});

test("ShareControls resolves configured links from Site and Article context", async () => {
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
  const manifest = manifestOf(entry);
  const config = resolveConfig({
    site: { title: "Test", baseUrl: "https://example.com" },
    plugins: [share({ services: ["copy"] })],
  });
  const html = await render(
    createElement(
      SiteProvider,
      {
        config,
        manifest,
        view: createPublicContentView(manifest),
        path: "/hello",
      },
      createElement(
        ArticleProvider,
        { entry, post: entry },
        createElement(ShareControls, {}),
      ),
    ),
  );

  assert.match(html, /data-rr-share-copy/);
  assert.doesNotMatch(html, /data-share-service=/);
});

test("ShareControls is empty without context or explicit links", async () => {
  assert.equal(await render(createElement(ShareControls, {})), "");
});

test("share exposes share links for the Site to render", async () => {
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

  const data = await getShareLinks({
    entry,
    site: resolveConfig({
      site: { title: "Test", baseUrl: "https://example.com" },
    }),
    options: { services: ["x"] },
  });
  assert.equal(entry.html, "<p>Body</p>");
  assert.equal(data.links.length, 1);
  assert.equal(data.links[0]?.service, "x");
});

test("share keeps its assets and client entry", () => {
  const plugin = share({ services: ["x"] });
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

  plugin.onManifestCreated?.(context as never);

  assert.equal(plugin.assets?.length, 1);
  assert.equal(plugin.clientEntries?.length, 1);
});
