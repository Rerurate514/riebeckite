import assert from "node:assert/strict";
import { test } from "node:test";
import { type ContentManifestEntry, Pipeline } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import {
  buildTimeline,
  parseInlineTimeline,
  renderTimelinePage,
  resolveTimelineOptions,
  timeline,
} from "../index.ts";

function entry(
  slug: string,
  frontmatter: Record<string, unknown>,
  tags: string[] = [],
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { slug, permalink: `/${slug}` },
    title: slug,
    frontmatter,
    html: "",
    publishing: { visibility: "public", routable: true, discoverable: true },
    tags,
    links: [],
    backlinks: [],
    assets: [],
  };
}

test("timeline automatically selects dated notes and honors explicit markers", () => {
  const entries = buildTimeline(
    [
      entry("later", { timeline: true, date: "2025-02-01" }),
      entry("automatic", { date: "2024-01-01" }),
      entry("excluded", { timeline: false, created: "2023-01-01" }),
      entry("invalid", { published: "not-a-date" }),
    ],
    resolveTimelineOptions(),
  );
  assert.deepEqual(
    entries.map(({ date, title }) => ({ date, title })),
    [
      { date: "2024-01-01", title: "automatic" },
      { date: "2025-02-01", title: "later" },
    ],
  );
});

test("timeline selectors use folder or tag, with exclusions taking precedence", () => {
  const entries = buildTimeline(
    [
      entry("Events/release", { date: "2026-01-01" }, ["release"]),
      entry("Projects/History/milestone", { date: "2026-01-02" }, [
        "milestone",
      ]),
      entry("Elsewhere/tagged", { date: "2026-01-03" }, ["release"]),
      entry("Events/hidden", { date: "2026-01-04", timeline: true }, [
        "hidden",
      ]),
      entry("Notes/other", { date: "2026-01-05" }),
    ],
    resolveTimelineOptions({
      include: { folders: ["Events", "Projects\\History"], tags: ["#release"] },
      exclude: { tags: ["hidden"] },
    }),
  );
  assert.deepEqual(
    entries.map((item) => item.title),
    ["Events/release", "Projects/History/milestone", "Elsewhere/tagged"],
  );
});

test("marked selection preserves the former marked-notes-only behavior and key", () => {
  const entries = buildTimeline(
    [
      entry("included", { featured: true, date: "2026-01-01" }),
      entry("automatic", { date: "2026-01-02" }),
      entry("excluded", { featured: false, date: "2026-01-03" }),
    ],
    resolveTimelineOptions({ key: "featured", selection: "marked" }),
  );
  assert.deepEqual(
    entries.map((item) => item.title),
    ["included"],
  );
});

test("timeline option resolution tolerates invalid runtime selector values", () => {
  const options = resolveTimelineOptions({
    include: { folders: "Events" as unknown as string[] },
    selection: "other" as "automatic",
  });
  assert.deepEqual(options.include, { folders: [], tags: [] });
  assert.equal(options.selection, "automatic");
});

test("inline parsers preserve labels, multiple events, blank lines, and multiline bodies", () => {
  assert.deepEqual(
    parseInlineTimeline(
      "timeline",
      "[line-3, body-2, active-color-text-accent]\n+ 2026年\n+ 開発開始\n+ **開始**しました。\n  続きの説明\n\n+ Before launch\n+ Release\n+ `ready`",
    ),
    {
      line: 3,
      body: 2,
      activeColor: "text-accent",
      events: [
        {
          date: "2026年",
          title: "開発開始",
          content: "**開始**しました。\n  続きの説明",
        },
        { date: "Before launch", title: "Release", content: "`ready`" },
      ],
    },
  );
  assert.deepEqual(
    parseInlineTimeline(
      "timeline-labeled",
      "date: 17th century\ntitle: Origins\ncontent:\nFirst paragraph.\n\nSecond paragraph.\n\ndate: 2026-01-01\ntitle: Release\ncontent: Done",
    )?.events,
    [
      {
        date: "17th century",
        title: "Origins",
        content: "First paragraph.\n\nSecond paragraph.",
      },
      { date: "2026-01-01", title: "Release", content: "Done" },
    ],
  );
  assert.equal(parseInlineTimeline("timeline", "+ only one line"), null);
  assert.equal(
    parseInlineTimeline(
      "timeline",
      "[active-color-not-allowed]\n+ Date\n+ Title\n+ Body",
    )?.activeColor,
    undefined,
  );
});

test("inline timeline enters the standard Markdown pipeline safely", async () => {
  const pipeline = new Pipeline(
    new Map([["target", "target"]]),
    new Map([["target", "/target"]]),
    undefined,
    { plugins: [timeline(), obsidianMarkdown()] },
  );
  const result = await pipeline.execute(`\`\`\`timeline
+ 2026-01-01
+ **Launch**
+ [safe](https://example.com) and \`code\` [[target]] <img src=x onerror=alert(1)>
\`\`\`

\`\`\`timeline-labeled
date: Before launch
title: Second
content:
Two lines.
\`\`\``);
  assert.match(result.html, /rb-timeline--inline/);
  assert.match(result.html, /<strong>Launch<\/strong>/);
  assert.match(result.html, /href="https:\/\/example\.com"/);
  assert.match(result.html, /href="\/target"/);
  assert.doesNotMatch(result.html, /onerror|alert\(1\)/);
  assert.equal((result.html.match(/rb-timeline--inline/g) ?? []).length, 2);
});

test("timeline page escapes content", () => {
  const page = renderTimelinePage(
    [{ date: "2025-01-01", permalink: "/a?x=1&y=2", title: "A < B" }],
    resolveTimelineOptions(),
  );
  assert.match(page.html, /href="\/a\?x=1&amp;y=2"/);
  assert.match(page.html, /A &lt; B/);
});
