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

test("fields configure tag links, tagBase, and display variants", () => {
  const linked = renderPropertiesPanel(
    { tags: ["JP/Web", "Tag"] },
    {
      fields: {
        tags: { type: "tags", tagBase: "/topics/", variant: "chips" },
      },
    },
  );
  assert.match(linked, /data-variant="chips"/);
  assert.match(linked, /data-tag="JP\/Web" href="\/topics\/jp\/web"/);
  assert.match(linked, />#JP\/Web<\/a>/);

  const plain = renderPropertiesPanel(
    { tags: "Idea" },
    { fields: { tags: { type: "tags", link: false, variant: "links" } } },
  );
  assert.match(plain, /data-variant="links"/);
  assert.doesNotMatch(plain, /<a /);
  assert.match(plain, /<span class="rb-properties__tag" data-tag="Idea">#Idea/);

  const links = renderPropertiesPanel(
    { tags: ["A"] },
    { fields: { tags: { type: "tags", variant: "links" } } },
  );
  assert.match(links, /data-variant="links"/);
  assert.match(links, /href="\/tags\/a"/);
});

test("fields render badges with configured variants", () => {
  const html = renderPropertiesPanel(
    { status: "published", draft: "draft" },
    {
      fields: {
        status: {
          type: "badge",
          variants: { published: "success", draft: "warning" },
        },
        draft: {
          type: "badge",
          variants: { published: "success", draft: "warning" },
        },
      },
    },
  );

  assert.match(
    html,
    /<span class="rb-properties__badge" data-variant="success">published<\/span>/,
  );
  assert.match(
    html,
    /<span class="rb-properties__badge" data-variant="warning">draft<\/span>/,
  );
});

test("fields format dates and keep the source datetime", () => {
  const html = renderPropertiesPanel(
    { created: "2024-03-04T05:06:07Z" },
    {
      fields: {
        created: { type: "date", format: "yyyy/MM/dd HH:mm" },
      },
    },
  );

  assert.match(
    html,
    /<time class="rb-properties__date" datetime="2024-03-04T05:06:07Z">2024\/03\/04 05:06<\/time>/,
  );

  const spaced = renderPropertiesPanel(
    { created: "2024-03-04 05:06:07" },
    { fields: { created: { type: "date" } } },
  );
  assert.match(spaced, /datetime="2024-03-04T05:06:07"/);
});

test("field declaration controls display order", () => {
  const html = renderPropertiesPanel(
    { status: "published", tags: ["A"], created: "2024-01-02" },
    {
      fields: {
        tags: { type: "tags" },
        status: { type: "badge" },
        created: { type: "date" },
      },
    },
  );
  const keys = [...html.matchAll(/data-property-key="([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(keys, ["tags", "status", "created"]);
});

test("wikilink fields link notes but leave plain URLs as text", () => {
  const html = renderPropertiesPanel(
    { related: "[[Note|the note]] and https://example.com" },
    { fields: { related: { type: "wikilinks" } } },
    { resolveLink: (target) => (target === "Note" ? "/note" : null) },
  );

  assert.match(html, /href="\/note">the note<\/a>/);
  assert.doesNotMatch(html, /__link--external/);
  assert.match(html, /https:\/\/example\.com/);
});

test("unknown fields and invalid URLs fall back to safe text", () => {
  const messages: PropertiesMessage[] = [];
  const html = renderPropertiesPanel(
    { unknown: "#kept", source: "javascript:alert(1)" },
    {
      fields: {
        unknown: { type: "not-a-type" } as never,
        source: { type: "link" },
      },
    },
    { onMessage: (message) => messages.push(message) },
  );

  assert.match(html, /#kept/);
  assert.match(html, />javascript:alert\(1\)<\/dd>/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.deepEqual(messages, []);
});

test("field values escape HTML in labels and badges", () => {
  const html = renderPropertiesPanel(
    {
      "<key>": "<script>alert(1)</script>",
      tags: ["<tag>"],
      status: "<b>published</b>",
    },
    { fields: { status: { type: "badge" } } },
  );

  assert.match(html, /data-property-key="&lt;key&gt;"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /data-tag="&lt;tag&gt;"/);
  assert.match(html, /&lt;b&gt;published&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("invalid date fields report the property and render escaped text", () => {
  const messages: PropertiesMessage[] = [];
  const html = renderPropertiesPanel(
    { created: "not a date" },
    { fields: { created: { type: "date" } } },
    { onMessage: (message) => messages.push(message) },
  );

  assert.match(html, />not a date<\/dd>/);
  assert.equal(messages[0]?.propertyKey, "created");
  assert.match(messages[0]?.reason ?? "", /invalid date/);

  const calendar = renderPropertiesPanel(
    { created: "2024-02-30" },
    { fields: { created: { type: "date" } } },
    { onMessage: (message) => messages.push(message) },
  );
  assert.match(calendar, />2024-02-30<\/dd>/);
  assert.equal(messages[1]?.propertyKey, "created");
  assert.match(messages[1]?.reason ?? "", /invalid date/);
});

test("text fields omit empty nested entries when hideEmpty is enabled", () => {
  const html = renderPropertiesPanel(
    { meta: { keep: "yes", empty: "", none: null } },
    { fields: { meta: { type: "text" } } },
  );

  assert.match(html, /data-property-key="keep"/);
  assert.doesNotMatch(html, /data-property-key="empty"/);
  assert.doesNotMatch(html, /data-property-key="none"/);
});

test("empty arrays still render their type-specific container", () => {
  const tags = renderPropertiesPanel(
    { tags: [] },
    { hideEmpty: false, fields: { tags: { type: "tags" } } },
  );
  assert.match(
    tags,
    /<ul class="rb-properties__list" data-variant="chips"><\/ul>/,
  );

  const badges = renderPropertiesPanel(
    { status: [] },
    { hideEmpty: false, fields: { status: { type: "badge" } } },
  );
  assert.match(badges, /<ul class="rb-properties__list"><\/ul>/);
});
