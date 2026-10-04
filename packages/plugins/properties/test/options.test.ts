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

test("resolvePropertiesOptions applies documented defaults", () => {
  assert.deepEqual(resolvePropertiesOptions(), {
    title: DEFAULT_PROPERTIES_TITLE,
    include: undefined,
    exclude: DEFAULT_PROPERTIES_EXCLUDE,
    order: undefined,
    hideEmpty: true,
    className: DEFAULT_PROPERTIES_CLASS,
    collapsed: false,
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

  assert.deepEqual(
    resolvePropertiesOptions({
      title: null,
      include,
      exclude: ["x"],
      order,
      hideEmpty: false,
      className: "custom",
      collapsed: true,
    }),
    {
      title: null,
      include,
      exclude: ["x"],
      order,
      hideEmpty: false,
      className: "custom",
      collapsed: true,
    },
  );
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
    }),
    [],
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
  assert.match(issues[4]?.message ?? "", /boolean/);
});
