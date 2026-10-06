import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublished, resolveConfig } from "../src/config.js";
import { resolvePublishingState } from "../src/content/publishing.js";
import type { PostFrontmatter } from "../src/types/post_content.js";
import type { PublishStrategy } from "../src/types/publish_strategy.js";

const buildTime = new Date("2024-01-02T00:00:00.000Z");
const strategies: PublishStrategy[] = ["explicit", "selective"];
const cases: { name: string; frontmatter: PostFrontmatter }[] = [
  { name: "empty", frontmatter: {} },
  { name: "publish true", frontmatter: { publish: true } },
  { name: "publish false", frontmatter: { publish: false } },
  { name: "private true", frontmatter: { private: true } },
  { name: "draft true", frontmatter: { draft: true } },
  { name: "visibility public", frontmatter: { visibility: "public" } },
  { name: "visibility unlisted", frontmatter: { visibility: "unlisted" } },
  { name: "visibility draft", frontmatter: { visibility: "draft" } },
  {
    name: "publishAt past",
    frontmatter: { publishAt: "2024-01-01T00:00:00.000Z" },
  },
  {
    name: "publishAt future with publish",
    frontmatter: { publish: true, publishAt: "2999-01-01T00:00:00.000Z" },
  },
  {
    name: "visibility unlisted with future publishAt",
    frontmatter: {
      visibility: "unlisted",
      publishAt: "2999-01-01T00:00:00.000Z",
    },
  },
];

test("isPublished agrees with the manifest publishing rule", () => {
  for (const strategy of strategies) {
    const config = resolveConfig({
      site: { title: "Test" },
      content: { filters: { publishStrategy: strategy } },
    });
    for (const { name, frontmatter } of cases) {
      const expected = resolvePublishingState(frontmatter, {
        strategy,
        buildTime,
      }).routable;
      assert.equal(
        isPublished(config, frontmatter, { buildTime }),
        expected,
        `${strategy} / ${name}`,
      );
    }
  }
});

test("isPublished routes explicit visibility and respects scheduling", () => {
  const explicit = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  assert.equal(
    isPublished(explicit, { visibility: "public" }, { buildTime }),
    true,
  );
  assert.equal(
    isPublished(
      explicit,
      { publish: true, publishAt: "2999-01-01T00:00:00.000Z" },
      { buildTime },
    ),
    false,
  );
});
