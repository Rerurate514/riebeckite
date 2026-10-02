import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden } from "@riebeckite/test";
import type { DiffRevision, MarkdownRevision, PostDiff } from "../index.ts";
import {
  createLineDiff,
  renderDiffHistory,
  renderDiffLine,
  renderDiffPanel,
} from "../index.ts";
import { formatDiffDate } from "../src/components/format-date.ts";

function revision(
  hash: string,
  shortHash: string,
  date: string,
  message: string,
  author: string,
): DiffRevision {
  return { hash, shortHash, date, message, author };
}

test("renderDiffLine prefixes lines and escapes the content", () => {
  const html = renderDiffLine({
    line: {
      type: "added",
      content: 'const a = "<b>&";',
      oldLineNumber: null,
      newLineNumber: 3,
    },
  });

  assert.ok(html.includes("rr-diff-history__line--added"));
  assert.ok(html.includes('<td class="rr-diff-history__num"></td>'));
  assert.ok(html.includes('<td class="rr-diff-history__num">3</td>'));
  assert.ok(html.includes("+ const a = &quot;&lt;b&gt;&amp;&quot;;"));
});

test("golden: renderDiffPanel renders the diff table markup", () => {
  const diff: PostDiff = {
    from: revision("f".repeat(40), "f".repeat(7), "not-a-date", "old", "Alice"),
    to: revision("1".repeat(40), "1".repeat(7), "not-a-date", "new", "Bob"),
    lines: createLineDiff("a\nb\nc", "a\nB\nc\nd"),
  };

  assertGolden(
    renderDiffPanel(diff),
    new URL("./__golden__/diff_panel.html", import.meta.url),
  );
});

test("renderDiffHistory falls back to an empty state", () => {
  const html = renderDiffHistory({ revisions: [], selected: null });

  assert.ok(html.includes("rr-diff-history__empty"));
  assert.ok(html.includes("No Git history is available"));
  assert.ok(html.includes('"revisions":[]'));
});

test("formatDiffDate formats a valid ISO timestamp with a fixed English abbreviation", () => {
  assert.equal(formatDiffDate("2024-01-02T00:00:00Z"), "Jan 2");
});

test("formatDiffDate is timezone independent and uses UTC", () => {
  assert.equal(formatDiffDate("2024-03-01T23:30:00Z"), "Mar 1");
});

test("formatDiffDate returns invalid values unchanged", () => {
  assert.equal(formatDiffDate("not-a-date"), "not-a-date");
});

test("renderDiffHistory escapes the payload and revision text", () => {
  const to = revision(
    "a".repeat(40),
    "a".repeat(7),
    "not-a-date",
    "</script>",
    "Alice",
  );
  const revisions: MarkdownRevision[] = [{ ...to, markdown: "</script>" }];
  const selected: PostDiff = { from: null, to, lines: [] };

  const html = renderDiffHistory({ revisions, selected });

  assert.ok(html.includes("&lt;/script&gt;"));
  assert.ok(html.includes("\\u003c/script>"));
  assert.ok(!html.includes("</script></span>"));
  assert.ok(!html.includes('"selected"'));
});

test("renderDiffHistory renders locale-independent revision dates", () => {
  const to = revision(
    "b".repeat(40),
    "b".repeat(7),
    "2024-01-02T00:00:00Z",
    "A change",
    "Alice",
  );
  const revisions: MarkdownRevision[] = [{ ...to, markdown: "" }];
  const selected: PostDiff = { from: null, to, lines: [] };

  const html = renderDiffHistory({ revisions, selected });

  assert.ok(html.includes('<span class="rr-diff-history__date">Jan 2</span>'));
  assert.ok(html.includes("bbbbbbb · Jan 2"));
});
