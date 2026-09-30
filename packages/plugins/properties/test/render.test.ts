import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGolden } from "@riebeckite/test";
import {
  buildTagHref,
  type PropertiesMessage,
  renderPropertiesPanel,
} from "../index.ts";

test("renderPropertiesPanel returns an empty string when nothing renders", () => {
  assert.equal(renderPropertiesPanel(null), "");
  assert.equal(renderPropertiesPanel(undefined), "");
  assert.equal(renderPropertiesPanel({}), "");
  assert.equal(renderPropertiesPanel({ note: "   " }), "");
  assert.equal(
    renderPropertiesPanel({
      publish: true,
      permalink: "/p",
      aliases: ["x"],
      redirect_from: ["/old"],
    }),
    "",
  );
});

test("renderPropertiesPanel renders a default panel with an escaped heading", () => {
  assertGolden(
    renderPropertiesPanel({
      title: "Hello",
      description: "A <b>note</b>",
      count: 3,
      draft: true,
    }),
    new URL("./__golden__/panel.html", import.meta.url),
  );
});

test("renderPropertiesPanel omits the heading when title is null", () => {
  const html = renderPropertiesPanel({ a: 1 }, { title: null });
  assert.doesNotMatch(html, /__title/);
  assert.match(html, /^<section class="rb-properties"/);
  assert.match(html, /data-property-count="1"/);
});

test("explicit include wins over the default exclude", () => {
  const html = renderPropertiesPanel(
    { publish: true, title: "T", hidden: "no" },
    { include: ["publish", "title"] },
  );

  assert.equal((html.match(/data-property-key=/g) ?? []).length, 2);
  assert.match(html, /data-property-key="publish"/);
  assert.doesNotMatch(html, /data-property-key="hidden"/);
});

test("order places listed keys first and keeps the rest in frontmatter order", () => {
  const html = renderPropertiesPanel(
    { a: 1, b: 2, c: 3 },
    { order: ["c", "a", "missing"] },
  );
  const keys = [...html.matchAll(/data-property-key="([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(keys, ["c", "a", "b"]);
});

test("hideEmpty drops empty values by default and keeps them when disabled", () => {
  const frontmatter = { a: "", b: null, c: [], d: {}, e: "x" };

  const hidden = renderPropertiesPanel(frontmatter);
  assert.equal((hidden.match(/data-property-key=/g) ?? []).length, 1);
  assert.match(hidden, /data-property-key="e"/);

  const kept = renderPropertiesPanel(frontmatter, { hideEmpty: false });
  assert.equal((kept.match(/data-property-key=/g) ?? []).length, 5);
  assert.match(kept, /<ul class="rb-properties__list"><\/ul>/);
});

test("renderPropertiesPanel renders tags, links, nesting, and scalars", () => {
  assertGolden(
    renderPropertiesPanel(
      {
        title: "The <Note>",
        description: "A & B",
        tags: ["Tag", "JP/Web", "#hashtag"],
        note: "#idea",
        meta: { lang: "ja", draft: false },
        list: ["one", 2, true],
        related: "[[Note|label]] then https://example.com",
        when: "2024-01-02",
      },
      {},
      { resolveLink: (target) => (target === "Note" ? "/note" : null) },
    ),
    new URL("./__golden__/panel-rich.html", import.meta.url),
  );
});

test("wikilinks resolve anchors and fall back to escaped text when unknown", () => {
  const html = renderPropertiesPanel(
    {
      related: "See [[Note|the note]] and [[Missing]]",
      anchored: "[[Note#Section]]",
    },
    {},
    { resolveLink: (target) => (target === "Note" ? "/note" : null) },
  );

  assert.match(html, /class="rb-properties__link" href="\/note">the note<\/a>/);
  assert.match(html, /\[\[Missing\]\]/);
  assert.match(html, /href="\/note#Section"/);
});

test("external URLs become noopener links and custom resolveTag overrides the route", () => {
  const html = renderPropertiesPanel(
    { link: "go to https://example.com/x now", tags: ["A"] },
    {},
    { resolveTag: (tag) => `/topics/${tag}` },
  );

  assert.match(
    html,
    /class="rb-properties__link rb-properties__link--external" href="https:\/\/example.com\/x" rel="noopener noreferrer" target="_blank"/,
  );
  assert.match(html, /href="\/topics\/A"/);
});

test("buildTagHref normalizes, encodes, and normalizes the base route", () => {
  assert.equal(buildTagHref("JP/Web"), "/tags/jp/web");
  assert.equal(buildTagHref("#Tag"), "/tags/tag");
  assert.equal(buildTagHref("Tag/"), "/tags/tag");
  assert.equal(buildTagHref("123"), "/tags/123");
  assert.equal(buildTagHref("Tag", "topics"), "topics/tag");
  assert.equal(buildTagHref("Tag", "/topics/"), "/topics/tag");
});

test("invalid values render as escaped text and report a message", () => {
  const messages: PropertiesMessage[] = [];
  const html = renderPropertiesPanel(
    {
      broken: Symbol("x"),
      when: new Date("nope"),
      nan: Number.NaN,
      infinite: Number.POSITIVE_INFINITY,
    },
    {},
    { onMessage: (message) => messages.push(message) },
  );

  assert.match(html, />Symbol\(x\)<\/dd>/);
  assert.match(html, />Invalid Date<\/dd>/);
  assert.match(html, />NaN<\/dd>/);
  assert.match(html, />Infinity<\/dd>/);
  assert.deepEqual(
    messages.map((message) => message.propertyKey),
    ["broken", "when", "nan", "infinite"],
  );
  assert.match(messages[0]?.reason ?? "", /unsupported value type/);
  assert.match(messages[1]?.reason ?? "", /invalid date/);
  assert.match(messages[2]?.reason ?? "", /non-finite number/);
});

test("bigint and Date values reuse the number and time renderers", () => {
  const html = renderPropertiesPanel({
    big: 10n,
    when: new Date("2024-03-04T05:06:07.000Z"),
  });

  assert.match(html, /data-number="10">10<\/span>/);
  assert.match(
    html,
    /<time class="rb-properties__date" datetime="2024-03-04T05:06:07.000Z">2024-03-04<\/time>/,
  );
});

test("collapsed wraps the panel in a details element", () => {
  const html = renderPropertiesPanel({ a: 1 }, { collapsed: true });

  assert.match(html, /^<details class="rb-properties" data-properties/);
  assert.match(html, /data-collapsed/);
  assert.match(html, /<summary class="rb-properties__summary">/);
  assert.match(html, /<\/details>$/);
});
