import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTaxonomyTagHref } from "../index.js";

test("buildTaxonomyTagHref uses the configured tag base path", () => {
  assert.equal(
    buildTaxonomyTagHref("Release Notes", "/topics"),
    "/topics/release-notes",
  );
  assert.equal(
    buildTaxonomyTagHref("Release Notes", "topics/"),
    "/topics/release-notes",
  );
});

test("buildTaxonomyTagHref keeps nested tags and percent-encoded fallbacks", () => {
  assert.equal(
    buildTaxonomyTagHref("Guide/Intro", "/tags"),
    "/tags/guide/intro",
  );
  assert.equal(
    buildTaxonomyTagHref("日本語", "/tags"),
    "/tags/%E6%97%A5%E6%9C%AC%E8%AA%9E",
  );
});

test("buildTaxonomyTagHref returns the base path for a blank tag", () => {
  assert.equal(buildTaxonomyTagHref("   ", "/tags"), "/tags");
  assert.equal(buildTaxonomyTagHref("", ""), "");
});
