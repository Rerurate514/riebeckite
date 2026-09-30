import assert from "node:assert/strict";
import { test } from "node:test";
import {
  relatedPosts,
  relatedPostsPlugin,
  resolveRelatedPostsOptions,
} from "../index.ts";

test("applies the documented defaults", () => {
  assert.deepEqual(resolveRelatedPostsOptions(), {
    limit: 5,
    minScore: 1,
    heading: true,
    headingText: "Related",
    className: "rb-related-posts",
    useTags: true,
    useBacklinks: true,
  });
});

test("honours explicit overrides, including falsy values", () => {
  assert.deepEqual(
    resolveRelatedPostsOptions({
      limit: 0,
      minScore: 0,
      heading: false,
      headingText: "Keep reading",
      className: "my-related",
      useTags: false,
      useBacklinks: false,
    }),
    {
      limit: 0,
      minScore: 0,
      heading: false,
      headingText: "Keep reading",
      className: "my-related",
      useTags: false,
      useBacklinks: false,
    },
  );
});

test("falls back to the default class name for blank input", () => {
  assert.equal(
    resolveRelatedPostsOptions({ className: "   " }).className,
    "rb-related-posts",
  );
});

test("trims a custom class name", () => {
  assert.equal(
    resolveRelatedPostsOptions({ className: "  my-related  " }).className,
    "my-related",
  );
});

test("relatedPostsPlugin is the same factory as relatedPosts", () => {
  assert.equal(relatedPostsPlugin, relatedPosts);
});
