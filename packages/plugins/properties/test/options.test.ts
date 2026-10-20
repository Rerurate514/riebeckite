import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PROPERTIES_CLASS,
  DEFAULT_PROPERTIES_EXCLUDE,
  DEFAULT_PROPERTIES_TITLE,
  PROPERTIES_ATTRIBUTE,
  resolvePropertiesOptions,
  validatePropertiesOptions,
} from "../index.ts";
import { mergePropertiesOptions } from "../src/options.ts";

test("resolvePropertiesOptions applies documented defaults", () => {
  assert.deepEqual(resolvePropertiesOptions(), {
    title: DEFAULT_PROPERTIES_TITLE,
    include: undefined,
    exclude: DEFAULT_PROPERTIES_EXCLUDE,
    order: undefined,
    hideEmpty: true,
    className: DEFAULT_PROPERTIES_CLASS,
    collapsed: false,
    fields: {},
  });

  assert.equal(DEFAULT_PROPERTIES_TITLE, "Properties");
  assert.equal(DEFAULT_PROPERTIES_CLASS, "rb-properties");
  assert.equal(PROPERTIES_ATTRIBUTE, "data-properties");
  assert.deepEqual(DEFAULT_PROPERTIES_EXCLUDE, [
    "publish",
    "permalink",
    "aliases",
    "redirect_from",
  ]);
});

test("resolvePropertiesOptions keeps explicit overrides including null title", () => {
  const include = ["b", "a"];
  const order = ["b", "a"];
  const fields = {
    status: { type: "badge" as const },
  };

  assert.deepEqual(
    resolvePropertiesOptions({
      title: null,
      include,
      exclude: ["x"],
      order,
      hideEmpty: false,
      className: "custom",
      collapsed: true,
      fields,
    }),
    {
      title: null,
      include,
      exclude: ["x"],
      order,
      hideEmpty: false,
      className: "custom",
      collapsed: true,
      fields,
    },
  );
});

test("declared fields provide the default order without implicit filtering", () => {
  const resolved = resolvePropertiesOptions({
    fields: {
      status: { type: "badge" },
      tags: { type: "tags", variant: "chips" },
    },
  });

  assert.deepEqual(resolved.order, ["status", "tags"]);
  assert.equal(resolved.include, undefined);
  assert.deepEqual(resolved.exclude, DEFAULT_PROPERTIES_EXCLUDE);

  const explicit = resolvePropertiesOptions({
    order: ["tags"],
    fields: {
      status: { type: "badge" },
      tags: { type: "tags" },
    },
  });
  assert.deepEqual(explicit.order, ["tags"]);
});

test("mergePropertiesOptions merges fields per key and lets overrides win", () => {
  const merged = mergePropertiesOptions(
    {
      title: "Base",
      fields: {
        tags: { type: "tags", variant: "chips" },
        status: { type: "text" },
      },
    },
    {
      title: "Override",
      fields: {
        status: { type: "badge", variants: { published: "success" } },
      },
    },
  );

  assert.equal(merged.title, "Override");
  assert.deepEqual(merged.fields, {
    tags: { type: "tags", variant: "chips" },
    status: { type: "badge", variants: { published: "success" } },
  });
});

test("validatePropertiesOptions accepts undefined and valid options", () => {
  assert.deepEqual(validatePropertiesOptions(undefined), []);
  assert.deepEqual(validatePropertiesOptions({}), []);
  assert.deepEqual(
    validatePropertiesOptions({
      title: null,
      include: ["a"],
      exclude: ["b"],
      order: ["b", "a"],
      hideEmpty: false,
      className: "x",
      collapsed: true,
      fields: {
        tags: {
          type: "tags",
          link: true,
          tagBase: "/topics/",
          variant: "chips",
        },
        status: {
          type: "badge",
          variants: { published: "success", draft: "warning" },
        },
        created: { type: "date", format: "yyyy-MM-dd" },
        related: { type: "wikilinks" },
        summary: { type: "text" },
        source: { type: "link" },
      },
    }),
    [],
  );
});

test("validatePropertiesOptions reports invalid fields with their paths", () => {
  const issues = validatePropertiesOptions({
    fields: {
      "": { type: "text" },
      tags: "invalid",
      status: { type: "unknown" },
      created: { type: "date", format: "YYYY" },
      badge: { type: "badge", variants: { draft: "" } },
      related: {
        type: "tags",
        link: "yes",
        tagBase: "",
        variant: "pill",
        extra: true,
      },
    },
  } as never);

  assert.deepEqual(
    issues.map((issue) => issue.path).sort(),
    [
      "fields.",
      "fields.badge.variants.draft",
      "fields.created.format",
      "fields.related.extra",
      "fields.related.link",
      "fields.related.tagBase",
      "fields.related.variant",
      "fields.status.type",
      "fields.tags",
    ].sort(),
  );
  assert.match(
    issues.find((issue) => issue.path === "fields.status.type")?.message ?? "",
    /Expected one of/,
  );
});

test("validatePropertiesOptions reports every invalid field with its path", () => {
  const issues = validatePropertiesOptions({
    title: 1,
    include: "x",
    exclude: [1],
    order: [""],
    hideEmpty: "yes",
    className: "   ",
    collapsed: "no",
  } as never);

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      "title",
      "include",
      "exclude",
      "order",
      "hideEmpty",
      "className",
      "collapsed",
    ],
  );
  assert.match(issues[0]?.message ?? "", /string or null/);
});
