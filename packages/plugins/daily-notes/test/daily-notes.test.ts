import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifest,
  type ContentManifestEntry,
  type ResolvedRiebeckiteConfig,
  resolveConfig,
} from "@riebeckite/core";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import DailyNotes from "../components/daily-notes.js";
import {
  DEFAULT_DAILY_NOTES_DATE_FORMAT,
  DEFAULT_DAILY_NOTES_LOCALE,
  formatDailyNoteDate,
  resolveDisplayOptions,
} from "../src/daily-notes.js";
import { getDailyNotes } from "../src/daily-notes.server.js";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

function makeEntry(
  overrides: Partial<ContentManifestEntry> & { slug: string },
): ContentManifestEntry {
  const permalink = overrides.slug === "index" ? "/" : `/${overrides.slug}`;

  return {
    slug: overrides.slug,
    permalink,
    publicLocation: { slug: overrides.slug, permalink },
    title: "",
    frontmatter: {},
    publishing: {
      visibility: "draft",
      routable: false,
      discoverable: false,
    },
    html: "",
    tags: [],
    links: [],
    backlinks: [],
    assets: [],
    ...overrides,
  };
}

function makeManifest(entries: ContentManifestEntry[]): ContentManifest {
  const discoverableEntries = entries.filter(
    (entry) => entry.frontmatter.publish === true,
  );
  return {
    entries,
    publicEntries: entries,
    discoverableEntries,
  } as unknown as ContentManifest;
}

const explicitConfig: ResolvedRiebeckiteConfig = resolveConfig({
  site: { title: "Test" },
  content: { filters: { publishStrategy: "explicit" } },
});

test("extracts a snippet from the configured frontmatter key", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-01-02",
      frontmatter: { "daily-summary": "  今日は静かな一日。  " },
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes.length, 1);
  assert.equal(notes[0].snippet, "今日は静かな一日。");
  assert.equal(notes[0].slug, "Daily/2024-01-02");
  assert.equal(notes[0].date, "2024-01-02");
});

test("extracts a section up to the next heading and strips HTML", () => {
  const html = [
    "<h2>今日のひとこと</h2>",
    "<p>Hello <strong>world</strong> &amp; friends.</p>",
    "<h3>補足</h3>",
    "<p>Sub note.</p>",
    "<h2>Next section</h2>",
    "<p>This must not appear.</p>",
  ].join("\n");
  const manifest = makeManifest([
    makeEntry({ slug: "Daily/2024-02-01", html }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes.length, 1);
  assert.equal(notes[0].snippet, "Hello world & friends. 補足 Sub note.");
  assert.ok(!notes[0].snippet.includes("This must not appear."));
});

test("extracts a code block and decodes entities", () => {
  const html =
    '<pre><code class="language-daily-snippet">const a = 1;\nif (a &lt; 2) {\n  run();\n}</code></pre>';
  const manifest = makeManifest([
    makeEntry({ slug: "Daily/2024-02-02", html }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes.length, 1);
  assert.equal(notes[0].snippet, "const a = 1;\nif (a < 2) {\n  run();\n}");
});

test("skips a note when every strategy fails without falling back to the body", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-02-03",
      html: "<h2>Other</h2><p>Full body text that must never surface.</p>",
      frontmatter: { title: "Body fallback" },
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.deepEqual(notes, []);
});

test("honours strategy order: frontmatter before section before code block", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-02-04",
      frontmatter: { "daily-summary": "from frontmatter" },
      html: "<h2>今日のひとこと</h2><p>from section</p><code>from code</code>",
    }),
    makeEntry({
      slug: "Daily/2024-02-05",
      html: [
        "<p>intro without the section heading</p>",
        '<pre><code class="language-daily-snippet">from code</code></pre>',
      ].join("\n"),
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes.length, 2);
  assert.equal(notes[0].snippet, "from code");
  assert.equal(notes[1].snippet, "from frontmatter");
});

test("surfaces a private note's snippet but never its url or title", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-03-01",
      title: "Secret Diary",
      permalink: "/Daily/2024-03-01",
      frontmatter: { "daily-summary": "小さな気づき", private: true },
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes.length, 1);
  assert.equal(notes[0].snippet, "小さな気づき");
  assert.equal(notes[0].sourceUrl, null);
  assert.equal(notes[0].sourceTitle, null);
});

test("exposes url and title for a published note", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-03-02",
      title: "Public Diary",
      permalink: "/Daily/2024-03-02",
      frontmatter: { "daily-summary": "公開メモ", publish: true },
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });

  assert.equal(notes[0].sourceUrl, "/Daily/2024-03-02");
  assert.equal(notes[0].sourceTitle, "Public Diary");
});

test("a private note's body text never leaks into the output", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-03-03",
      title: "Private Title",
      permalink: "/Daily/2024-03-03",
      frontmatter: { "daily-summary": "表に出す一言" },
      html: "<p>SECRET_BODY_MARKER</p><h2>今日のひとこと</h2><p>also secret</p>",
    }),
  ]);

  const notes = getDailyNotes({ manifest, config: explicitConfig });
  const serialized = JSON.stringify(notes);

  assert.ok(!serialized.includes("SECRET_BODY_MARKER"));
  assert.ok(!serialized.includes("also secret"));
  assert.ok(!serialized.includes("Private Title"));
  assert.ok(!serialized.includes("/Daily/2024-03-03"));
});

test("orders notes newest first, then by slug ascending, undated last", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-01-03",
      frontmatter: { "daily-summary": "older" },
    }),
    makeEntry({
      slug: "Daily/2024-01-05b",
      frontmatter: { "daily-summary": "same day b" },
    }),
    makeEntry({
      slug: "Daily/2024-01-05",
      frontmatter: { "daily-summary": "same day a" },
    }),
    makeEntry({
      slug: "Daily/undated",
      frontmatter: { "daily-summary": "no date" },
    }),
  ]);

  const notes = getDailyNotes({
    manifest,
    config: explicitConfig,
    options: { widget: { limit: 10 } },
  });

  assert.deepEqual(
    notes.map((note) => note.slug),
    [
      "Daily/2024-01-05",
      "Daily/2024-01-05b",
      "Daily/2024-01-03",
      "Daily/undated",
    ],
  );
  assert.equal(notes[0].date, "2024-01-05");
  assert.equal(notes[1].date, "2024-01-05");
  assert.equal(notes[2].date, "2024-01-03");
  assert.equal(notes[3].date, "");
});

test("applies the widget limit", () => {
  const entries = Array.from({ length: 7 }, (_, index) =>
    makeEntry({
      slug: `Daily/2024-04-0${index + 1}`,
      frontmatter: { "daily-summary": `snippet ${index}` },
    }),
  );
  const manifest = makeManifest(entries);

  assert.equal(getDailyNotes({ manifest, config: explicitConfig }).length, 5);
  assert.equal(
    getDailyNotes({
      manifest,
      config: explicitConfig,
      options: { widget: { limit: 2 } },
    }).length,
    2,
  );
});

test("filters notes by the source directory and optional path pattern", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-05-01",
      frontmatter: { "daily-summary": "matches" },
    }),
    makeEntry({
      slug: "Daily/notes/memo",
      frontmatter: { "daily-summary": "wrong shape" },
    }),
    makeEntry({
      slug: "Journal/2024-05-02",
      frontmatter: { "daily-summary": "wrong directory" },
    }),
  ]);

  const notes = getDailyNotes({
    manifest,
    config: explicitConfig,
    options: {
      source: { pathPattern: "Daily/{YYYY}-{MM}-{DD}" },
      widget: { limit: 10 },
    },
  });

  assert.deepEqual(
    notes.map((note) => note.slug),
    ["Daily/2024-05-01"],
  );
});

test("derives the date from frontmatter created and filename, preferring frontmatter", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-06-01",
      frontmatter: { "daily-summary": "slug date", date: "2024-07-01" },
    }),
    makeEntry({
      slug: "Daily/2024-06-02",
      frontmatter: { "daily-summary": "created", created: "2024-08-09" },
    }),
    makeEntry({
      slug: "Daily/2024-06-03",
      frontmatter: { "daily-summary": "slug only" },
    }),
  ]);

  const notes = getDailyNotes({
    manifest,
    config: explicitConfig,
    options: { widget: { limit: 10 } },
  });

  const dates = Object.fromEntries(notes.map((note) => [note.slug, note.date]));

  assert.equal(dates["Daily/2024-06-01"], "2024-07-01");
  assert.equal(dates["Daily/2024-06-02"], "2024-08-09");
  assert.equal(dates["Daily/2024-06-03"], "2024-06-03");
});

test("date display defaults to a locale-independent ISO date", () => {
  const display = resolveDisplayOptions(undefined);

  assert.equal(display.dateFormat, DEFAULT_DAILY_NOTES_DATE_FORMAT);
  assert.equal(display.locale, DEFAULT_DAILY_NOTES_LOCALE);
  assert.equal(formatDailyNoteDate("2024-01-05", display), "2024-01-05");
});

test("date display can use a locale-aware format", () => {
  const display = resolveDisplayOptions({
    dateFormat: "long",
    locale: "en-US",
  });

  assert.match(formatDailyNoteDate("2024-01-05", display), /January 5, 2024/);
  assert.equal(formatDailyNoteDate("", display), "");
});

test("getDailyNotes applies the configured date format", () => {
  const manifest = makeManifest([
    makeEntry({
      slug: "Daily/2024-01-05",
      frontmatter: { "daily-summary": "entry" },
    }),
  ]);

  const notes = getDailyNotes({
    manifest,
    config: explicitConfig,
    options: { dateFormat: "long", locale: "en-US" },
  });

  assert.equal(notes[0].date, "2024-01-05");
  assert.match(notes[0].dateDisplay, /January 5, 2024/);
});

test("DailyNotes renders English labels and ISO dates", () => {
  const html = renderToString(
    DailyNotes({
      notes: [
        {
          date: "2024-01-05",
          dateDisplay: "2024-01-05",
          snippet: "A short note",
          slug: "Daily/2024-01-05",
          sourceUrl: null,
          sourceTitle: null,
        },
      ],
    }),
  );

  assert.ok(html.includes("Recent Daily Notes"), html);
  assert.ok(html.includes("2024-01-05"), html);
  assert.doesNotMatch(html, /[\u3040-\u30ff\u4e00-\u9faf]/);
});
