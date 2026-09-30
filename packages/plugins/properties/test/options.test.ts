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
    position: "start",
    include: undefined,
    exclude: DEFAULT_PROPERTIES_EXCLUDE,
    order: undefined,
    render: "html",
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
      position: "end",
      include,
      exclude: ["x"],
      order,
      render: "slot",
      hideEmpty: false,
      className: "custom",
      collapsed: true,
    }),
    {
      title: null,
      position: "end",
      include,
      exclude: ["x"],
      order,
      render: "slot",
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
      position: "start",
      include: ["a"],
      exclude: ["b"],
      order: ["b", "a"],
      render: "slot",
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
    position: "middle",
    include: "x",
    exclude: [1],
    order: [""],
    render: "json",
    hideEmpty: "yes",
    className: "   ",
    collapsed: "no",
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      "title",
      "position",
      "include",
      "exclude",
      "order",
      "render",
      "hideEmpty",
      "className",
      "collapsed",
    ],
  );
  assert.match(issues[1]?.message ?? "", /"start" or "end"/);
  assert.match(issues[5]?.message ?? "", /"html" or "slot"/);
});
