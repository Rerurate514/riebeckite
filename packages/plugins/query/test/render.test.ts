import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContentManifestEntry } from "@riebeckite/core";
import { assertGolden } from "../../../../tests/helpers/golden.ts";
import {
  renderQueryError,
  renderQueryResult,
  resolveQuery,
} from "../src/render.ts";

function entry(
  slug: string,
  frontmatter: Record<string, unknown> = {},
  tags: string[] = [],
): ContentManifestEntry {
  const permalink = `/${slug}`;
  return {
    slug,
    permalink,
    publicLocation: { slug, permalink },
    title: slug,
    frontmatter,
    html: "",
    tags,
    links: [],
    backlinks: [],
    assets: [],
  };
}

const alpha = entry("alpha", { title: "Alpha", date: "2024-01-02" }, ["news"]);
const beta = entry("beta", { created: "2024-02-03" });

test("resolveQuery applies defaults and lets the spec win over the options", () => {
  assert.deepEqual(resolveQuery({}, {}), {
    format: "table",
    columns: ["title", "date"],
    empty: "No matching content.",
    className: "rr-query",
  });

  assert.deepEqual(
    resolveQuery(
      { format: "list", columns: ["title", "tags"], empty: "none" },
      {
        defaultFormat: "table",
        defaultColumns: ["a"],
        emptyMessage: "fallback",
        className: "q",
      },
    ),
    {
      format: "list",
      columns: ["title", "tags"],
      empty: "none",
      className: "q",
    },
  );

  assert.deepEqual(
    resolveQuery(
      {},
      {
        defaultFormat: "list",
        defaultColumns: ["title"],
        emptyMessage: "Nothing",
        className: "custom",
      },
    ),
    {
      format: "list",
      columns: ["title"],
      empty: "Nothing",
      className: "custom",
    },
  );
});

test("renderQueryResult renders an escaped empty state", () => {
  assert.equal(
    renderQueryResult([], resolveQuery({}, {})),
    '<p class="rr-query rr-query--empty">No matching content.</p>',
  );
  assert.equal(
    renderQueryResult([], resolveQuery({ empty: "0 < 1 & 2" }, {})),
    '<p class="rr-query rr-query--empty">0 &lt; 1 &amp; 2</p>',
  );
});

test("renderQueryError uses the configured class and escapes the message", () => {
  assert.equal(
    renderQueryError("bad <x>", { className: "c&d" }),
    '<div class="c&amp;d c&amp;d--error" role="status">bad &lt;x&gt;</div>',
  );
  assert.match(
    renderQueryError("oops", {}),
    /^<div class="rr-query rr-query--error"/,
  );
});

test("renderQueryResult renders a table with labels and typed cells", () => {
  assertGolden(
    renderQueryResult(
      [alpha, beta],
      resolveQuery(
        { columns: ["title", "date", "tags", "permalink", "url"] },
        {},
      ),
    ),
    new URL("./__golden__/table.html", import.meta.url),
  );
});

test("renderQueryResult renders a list with title links and meta values", () => {
  assertGolden(
    renderQueryResult(
      [alpha, beta],
      resolveQuery({ format: "list", columns: ["title", "date", "tags"] }, {}),
    ),
    new URL("./__golden__/list.html", import.meta.url),
  );
});

test("date cells fall back through created and published, then render empty", () => {
  const html = renderQueryResult(
    [beta, entry("gamma", { published: "2023-12-31" }), entry("delta")],
    resolveQuery({ columns: ["date"] }, {}),
  );

  assert.equal((html.match(/rr-query__cell--date/g) ?? []).length, 3);
  assert.match(html, />2024-02-03</);
  assert.match(html, />2023-12-31</);
  assert.match(html, /rr-query__cell--date"><\/td>/);
});

test("list items omit the meta span when the value is empty", () => {
  const html = renderQueryResult(
    [entry("plain")],
    resolveQuery({ format: "list", columns: ["title", "date"] }, {}),
  );

  assert.match(html, /<li class="rr-query__item">/);
  assert.doesNotMatch(html, /__meta/);
});

test("frontmatter values are escaped and arrays are joined", () => {
  const html = renderQueryResult(
    [
      entry("x", {
        authors: ["a", "b"],
        note: "<b>&</b>",
        when: " 2024-05-06 ",
        count: 7,
        ok: true,
      }),
    ],
    resolveQuery({ columns: ["authors", "note", "when", "count", "ok"] }, {}),
  );

  assert.match(html, />a, b</);
  assert.match(html, />&lt;b&gt;&amp;&lt;\/b&gt;</);
  assert.match(html, />2024-05-06</);
  assert.match(html, />7</);
  assert.match(html, />true</);
});

test("the title link prefers a non-empty frontmatter title over entry.title", () => {
  const html = renderQueryResult(
    [entry("slug-name", { title: "Frontmatter Title" })],
    resolveQuery({ columns: ["title"] }, {}),
  );

  assert.match(html, /href="\/slug-name"/);
  assert.match(html, />Frontmatter Title<\/a>/);
});

test("the title link escapes the title and the permalink attribute", () => {
  const html = renderQueryResult(
    [{ ...entry("evil"), title: '<X> & "y"' }],
    resolveQuery({ columns: ["title"] }, {}),
  );

  assert.match(html, /href="\/evil"/);
  assert.match(html, />&lt;X&gt; &amp; &quot;y&quot;<\/a>/);
});
