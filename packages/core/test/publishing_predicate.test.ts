import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublished, resolveConfig } from "../src/config.js";

const buildTime = new Date("2024-01-02T00:00:00.000Z");

test("isPublished forwards the configured publish strategy", () => {
  const explicit = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  const selective = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "selective" } },
  });

  assert.equal(isPublished(explicit, {}, { buildTime }), false);
  assert.equal(isPublished(selective, {}, { buildTime }), true);
});

test("isPublished forwards the build time to scheduling", () => {
  const config = resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
  const frontmatter = {
    publish: true,
    publishAt: "2024-01-01T00:00:00.000Z",
  };

  assert.equal(
    isPublished(config, frontmatter, { buildTime: "2023-12-31T00:00:00.000Z" }),
    false,
  );
  assert.equal(isPublished(config, frontmatter, { buildTime }), true);
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
