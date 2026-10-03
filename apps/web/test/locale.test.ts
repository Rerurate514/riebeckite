import assert from "node:assert/strict";
import { test } from "node:test";
import {
  archivePaginationLabels,
  buildArchiveDescription,
  buildTagDescription,
  formatArchivePeriod,
  resolveWebLocale,
} from "../app/lib/locale";

test("resolveWebLocale recognizes japanese tags and falls back to english", () => {
  assert.equal(resolveWebLocale("ja"), "ja");
  assert.equal(resolveWebLocale("ja-JP"), "ja");
  assert.equal(resolveWebLocale("ja_JP"), "ja");
  assert.equal(resolveWebLocale("JA-jp"), "ja");
  assert.equal(resolveWebLocale("en"), "en");
  assert.equal(resolveWebLocale("en-US"), "en");
  assert.equal(resolveWebLocale("fr"), "en");
  assert.equal(resolveWebLocale(undefined), "en");
});

test("archivePaginationLabels localizes previous and next", () => {
  assert.deepEqual(archivePaginationLabels("ja"), {
    previous: "前のページ",
    next: "次のページ",
  });
  assert.deepEqual(archivePaginationLabels("ja-JP"), {
    previous: "前のページ",
    next: "次のページ",
  });
  assert.deepEqual(archivePaginationLabels("en"), {
    previous: "Previous",
    next: "Next",
  });
  assert.deepEqual(archivePaginationLabels(undefined), {
    previous: "Previous",
    next: "Next",
  });
});

test("formatArchivePeriod uses locale-aware month names", () => {
  assert.equal(formatArchivePeriod("2026-01", "ja"), "2026年1月");
  assert.equal(formatArchivePeriod("2026-01", "ja-JP"), "2026年1月");
  assert.equal(formatArchivePeriod("2026-01", "en"), "January 2026");
  assert.equal(formatArchivePeriod("2026-01", undefined), "January 2026");
  assert.equal(formatArchivePeriod("2026-12", "en"), "December 2026");
  assert.equal(formatArchivePeriod("2026", "ja"), "2026年");
  assert.equal(formatArchivePeriod("2026", "en"), "2026");
  assert.equal(formatArchivePeriod("2026-xx", "ja"), "2026-xx");
  assert.equal(formatArchivePeriod("unknown", "en"), "unknown");
});

test("description builders localize tag and archive copy", () => {
  assert.equal(
    buildTagDescription("Riebeckite", "docs", "ja"),
    "Riebeckite の #docs タグの記事一覧です。",
  );
  assert.equal(
    buildTagDescription("Riebeckite", "docs", "en"),
    "Posts tagged #docs on Riebeckite.",
  );
  assert.equal(
    buildArchiveDescription("Riebeckite", "2026年1月", "ja"),
    "Riebeckite の 2026年1月 の記事一覧です。",
  );
  assert.equal(
    buildArchiveDescription("Riebeckite", "January 2026", "en"),
    "Posts from January 2026 on Riebeckite.",
  );
});
