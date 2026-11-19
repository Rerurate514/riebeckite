import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_UI_LABELS, resolveUiLabels } from "../labels.js";

test("returns English defaults without a dictionary", () => {
  assert.deepEqual(resolveUiLabels(undefined), DEFAULT_UI_LABELS);
  assert.deepEqual(resolveUiLabels("ja"), DEFAULT_UI_LABELS);
});

test("merges a matching dictionary over the defaults", () => {
  const labels = resolveUiLabels("ja", {
    ja: { contents: "目次", filter: "絞り込み" },
  });
  assert.equal(labels.contents, "目次");
  assert.equal(labels.filter, "絞り込み");
  assert.equal(labels.collapse, DEFAULT_UI_LABELS.collapse);
});

test("matches language case-insensitively and ignores unknown keys", () => {
  const labels = resolveUiLabels("JA", {
    ja: { contents: "目次", irrelevant: "value" },
  });
  assert.equal(labels.contents, "目次");
  assert.ok(!Object.keys(labels).includes("irrelevant"));
});

test("falls back to English for languages without a dictionary", () => {
  const labels = resolveUiLabels("fr", { ja: { contents: "目次" } });
  assert.deepEqual(labels, DEFAULT_UI_LABELS);
});

test("ignores non-string and empty dictionary values", () => {
  const labels = resolveUiLabels(
    "ja",
    JSON.parse('{"ja":{"contents":"","filter":1}}'),
  );
  assert.equal(labels.contents, DEFAULT_UI_LABELS.contents);
  assert.equal(labels.filter, DEFAULT_UI_LABELS.filter);
});

test("plugin chrome labels keep their English defaults", () => {
  assert.equal(DEFAULT_UI_LABELS.sidebarNavigation, "Sidebar navigation");
  assert.equal(DEFAULT_UI_LABELS.history, "History");
  assert.equal(DEFAULT_UI_LABELS.historyChanges, "{count} changes");
  assert.equal(DEFAULT_UI_LABELS.seriesPosition, "Part {index} of {total}");
  assert.equal(
    DEFAULT_UI_LABELS.globalGraphMode,
    "Global graph · {count} notes",
  );
  assert.equal(
    DEFAULT_UI_LABELS.localGraphTruncated,
    "This neighbourhood is large, so the graph stops after 320 nodes.",
  );
});
