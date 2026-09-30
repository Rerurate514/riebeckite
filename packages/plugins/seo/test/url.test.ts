import assert from "node:assert/strict";
import { test } from "node:test";
import { type ResolvedRiebeckiteConfig, resolveConfig } from "@riebeckite/core";
import { buildAbsoluteUrl, buildPostUrl } from "../index.ts";
import { escapeXml } from "../src/xml.ts";

const config: ResolvedRiebeckiteConfig = resolveConfig({
  site: { title: "Test", baseUrl: "https://example.com" },
});

test("buildAbsoluteUrl returns the base URL for an empty path", () => {
  assert.equal(buildAbsoluteUrl(config, ""), "https://example.com");
});

test("buildAbsoluteUrl passes absolute URLs through unchanged", () => {
  assert.equal(
    buildAbsoluteUrl(config, "https://cdn.example/cover.png"),
    "https://cdn.example/cover.png",
  );
});

test("buildAbsoluteUrl resolves site-relative paths against the base URL", () => {
  assert.equal(
    buildAbsoluteUrl(config, "/posts/hello"),
    "https://example.com/posts/hello",
  );
  assert.equal(
    buildPostUrl(config, "/posts/hello"),
    "https://example.com/posts/hello",
  );
});

test("buildAbsoluteUrl falls back to a placeholder host when baseUrl is empty", () => {
  const bare = resolveConfig({ site: { title: "Test" } });
  assert.equal(buildAbsoluteUrl(bare, "/about"), "https://example.com/about");
});

test("escapeXml escapes markup but leaves apostrophes intact", () => {
  assert.equal(escapeXml("&<>'\""), `&amp;&lt;&gt;'&quot;`);
});
