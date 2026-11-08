import assert from "node:assert/strict";
import { test } from "node:test";
import type { CommentsPage } from "../src/types.js";
import {
  DEFAULT_COMMENTS_CLASS_NAME,
  DEFAULT_COMMENTS_EMPTY_TEXT,
  DEFAULT_COMMENTS_HEADING_TEXT,
  DEFAULT_COMMENTS_LIMIT,
  resolveCommentsOptions,
  validateCommentsOptions,
} from "../src/options.js";
import { MemoryCommentsProvider } from "../src/provider.js";
import { renderCommentsSection, COMMENTS_ATTRIBUTE } from "../src/render.js";
import { comments, COMMENTS_PLUGIN_NAME } from "../index.ts";

const samplePage: CommentsPage = {
  contentId: "page-1",
  total: 1,
  comments: [
    {
      id: "c1",
      author: { name: "Alice", url: "https://example.com/alice" },
      body: "Great post!",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
};

test("resolveCommentsOptions applies defaults", () => {
  const resolved = resolveCommentsOptions();
  assert.ok(resolved.provider instanceof MemoryCommentsProvider);
  assert.equal(resolved.headingText, DEFAULT_COMMENTS_HEADING_TEXT);
  assert.equal(resolved.className, DEFAULT_COMMENTS_CLASS_NAME);
  assert.equal(resolved.limit, DEFAULT_COMMENTS_LIMIT);
  assert.equal(resolved.emptyText, DEFAULT_COMMENTS_EMPTY_TEXT);
});

test("validateCommentsOptions rejects invalid limit", () => {
  const issues = validateCommentsOptions({ limit: -1 });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "limit");
});

test("validateCommentsOptions rejects invalid provider", () => {
  const issues = validateCommentsOptions({ provider: {} as never });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].path, "provider");
});

test("MemoryCommentsProvider returns empty page for unknown content", async () => {
  const provider = new MemoryCommentsProvider();
  const page = await provider.getComments("unknown");
  assert.equal(page.comments.length, 0);
  assert.equal(page.total, 0);
});

test("MemoryCommentsProvider respects limit", async () => {
  const provider = new MemoryCommentsProvider([
    [samplePage.contentId, samplePage],
  ]);
  const page = await provider.getComments(samplePage.contentId, 0);
  assert.equal(page.comments.length, 0);
});

test("renderCommentsSection renders heading and comments", () => {
  const html = renderCommentsSection(
    samplePage,
    DEFAULT_COMMENTS_HEADING_TEXT,
    DEFAULT_COMMENTS_CLASS_NAME,
    DEFAULT_COMMENTS_EMPTY_TEXT,
  );
  assert.ok(html.includes(COMMENTS_ATTRIBUTE));
  assert.ok(html.includes("Great post!"));
  assert.ok(html.includes("Alice"));
  assert.ok(html.includes('data-comment-id="c1"'));
});

test("renderCommentsSection renders empty state", () => {
  const empty: CommentsPage = { contentId: "p", comments: [], total: 0 };
  const html = renderCommentsSection(
    empty,
    DEFAULT_COMMENTS_HEADING_TEXT,
    DEFAULT_COMMENTS_CLASS_NAME,
    DEFAULT_COMMENTS_EMPTY_TEXT,
  );
  assert.ok(html.includes(DEFAULT_COMMENTS_EMPTY_TEXT));
});

test("comments() returns a plugin with the expected name", () => {
  const plugin = comments();
  assert.equal(plugin.name, COMMENTS_PLUGIN_NAME);
});
