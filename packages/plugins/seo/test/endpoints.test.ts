import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ContentManifest,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { resolveConfig } from "@riebeckite/core";
import { seo } from "../index.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: {
    title: "Test",
    baseUrl: "https://example.com",
    locale: "en_US",
  },
  content: { filters: { publishStrategy: "explicit" } },
});

const manifest = { entries: [] } as unknown as ContentManifest;

test("seo() registers no endpoints by default", () => {
  assert.deepEqual(seo().endpoints, []);
});

test("seo() registers only the requested feed and site-file endpoints", () => {
  const plugin = seo({
    sitemap: true,
    robots: true,
    feed: { rss: true, atom: true, json: true },
  });

  assert.deepEqual(
    plugin.endpoints?.map((endpoint) => endpoint.path),
    ["/sitemap.xml", "/robots.txt", "/feed.xml", "/atom.xml", "/feed.json"],
  );

  const partial = seo({ robots: true });
  assert.deepEqual(
    partial.endpoints?.map((endpoint) => endpoint.path),
    ["/robots.txt"],
  );
});

test("the robots and sitemap endpoints return generated files", async () => {
  const plugin = seo({ sitemap: true, robots: true });

  const robots = await plugin.endpoints
    ?.find((endpoint) => endpoint.path === "/robots.txt")
    ?.handler({ config, manifest });
  assert.equal(robots?.headers?.["content-type"], "text/plain; charset=utf-8");
  assert.match(
    robots?.body ?? "",
    /Sitemap: https:\/\/example\.com\/sitemap\.xml/,
  );

  const sitemap = await plugin.endpoints
    ?.find((endpoint) => endpoint.path === "/sitemap.xml")
    ?.handler({ config, manifest });
  assert.equal(
    sitemap?.headers?.["content-type"],
    "application/xml; charset=utf-8",
  );
  assert.equal((sitemap?.body?.match(/<url>/g) ?? []).length, 1);
});

test("the json feed endpoint returns a parsed object", async () => {
  const plugin = seo({ feed: { json: true } });
  const response = await plugin.endpoints?.[0]?.handler({ config, manifest });

  assert.equal(
    (response?.json as { version: string }).version,
    "https://jsonfeed.org/version/1.1",
  );
  assert.equal(response?.body, undefined);
});
