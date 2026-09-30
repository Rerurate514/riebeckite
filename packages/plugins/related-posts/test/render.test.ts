import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden } from "@riebeckite/test";
import {
  type RelatedPostsEntry,
  renderRelatedPosts,
  resolveRelatedPostsOptions,
} from "../index.ts";

const entries: RelatedPostsEntry[] = [
  { slug: "a", permalink: "/a", title: "Alpha", score: 5 },
  { slug: "b", permalink: "/b", title: "Beta", score: 4 },
];

test("returns an empty string when there are no entries", () => {
  assert.equal(renderRelatedPosts([], resolveRelatedPostsOptions()), "");
});

test("renders the heading, list, and scored links by default", () => {
  assert.equal(
    renderRelatedPosts(entries, resolveRelatedPostsOptions()),
    [
      '<nav class="rb-related-posts" data-related-posts>',
      '<h2 class="rb-related-posts__heading">Related</h2>',
      "<ul>",
      '<li class="rb-related-posts__item"><a class="rb-related-posts__link" href="/a" data-related-score="5">Alpha</a></li>',
      '<li class="rb-related-posts__item"><a class="rb-related-posts__link" href="/b" data-related-score="4">Beta</a></li>',
      "</ul>",
      "</nav>",
    ].join(""),
  );
});

test("omits the heading when heading is false", () => {
  const html = renderRelatedPosts(
    entries,
    resolveRelatedPostsOptions({ heading: false }),
  );

  assert.ok(!html.includes("<h2"));
  assert.ok(
    html.startsWith('<nav class="rb-related-posts" data-related-posts>'),
  );
  assert.ok(html.endsWith("</ul></nav>"));
});

test("uses the custom class name on every element", () => {
  const html = renderRelatedPosts(
    entries,
    resolveRelatedPostsOptions({ className: "x" }),
  );

  assert.ok(html.includes('<nav class="x" data-related-posts>'));
  assert.ok(html.includes('<h2 class="x__heading">'));
  assert.ok(html.includes('<li class="x__item">'));
  assert.ok(html.includes('<a class="x__link"'));
});

test("escapes titles, permalinks, class names, and heading text", () => {
  const html = renderRelatedPosts(
    [
      {
        slug: "x",
        permalink: "/a?x=1&y=2",
        title: '<b>Tom & "Jerry"</b>',
        score: 2,
      },
    ],
    resolveRelatedPostsOptions({
      className: 'c"name',
      headingText: "A < B",
    }),
  );

  assert.ok(!html.includes("<b>"));
  assert.ok(!html.includes('"Jerry"'));
  assert.ok(html.includes("&lt;b&gt;Tom &amp; &quot;Jerry&quot;&lt;/b&gt;"));
  assert.ok(html.includes('href="/a?x=1&amp;y=2"'));
  assert.ok(html.includes('class="c&quot;name"'));
  assert.ok(html.includes("A &lt; B"));
});

test("matches a structured related-posts block", () => {
  assertGolden(
    renderRelatedPosts(
      [
        { slug: "intro", permalink: "/intro", title: "Introduction", score: 6 },
        { slug: "api", permalink: "/api", title: "API", score: 3 },
        { slug: "faq", permalink: "/faq", title: "FAQ", score: 3 },
      ],
      resolveRelatedPostsOptions({ headingText: "Related notes" }),
    ),
    new URL("./__golden__/related-posts.html", import.meta.url),
  );
});
