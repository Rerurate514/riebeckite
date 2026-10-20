import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutputDescriptor } from "../src/content/output_dependency.js";
import {
  buildOutputPlan,
  compareOutputPlan,
} from "../src/content/output_plan.js";

const content = (path: string): OutputDescriptor => ({
  kind: "content",
  path,
  producer: "content:note",
  dependencies: [{ type: "content", slug: "note" }],
});

const generated = (path: string): OutputDescriptor => ({
  kind: "generated",
  path,
  producer: "plugin:search",
  dependencies: [{ type: "global" }],
});

test("output plan combines content, Hono routes, plugins, and assets", () => {
  const plan = buildOutputPlan({
    inventory: [content("note.html"), generated("search-index.json")],
    affectedPaths: new Set(["note.html"]),
    cacheAvailable: true,
    honoStaticRoutePaths: new Set(["index.html"]),
    viteClientAssetPaths: new Set(["assets/app.js"]),
    sitePublicAssetPaths: new Set(["robots.txt"]),
  });

  assert.deepEqual(
    plan.entries.map((entry) => [entry.path, entry.owner, entry.action]),
    [
      ["assets/app.js", "vite-client-asset", "unknown"],
      ["index.html", "hono-static-route", "unknown"],
      ["note.html", "content", "generate"],
      ["robots.txt", "site-public-asset", "unknown"],
      ["search-index.json", "plugin", "reuse"],
    ],
  );
});

test("output plan records removed unpublished content without retaining it", () => {
  const plan = buildOutputPlan({
    inventory: [],
    removed: [content("private.html")],
  });
  assert.deepEqual(plan.entries, [
    {
      path: "private.html",
      owner: "content",
      kind: "content",
      source: "content:note",
      dependencies: [{ type: "content", slug: "note" }],
      publicationEligible: false,
      cacheEligible: false,
      expectedToExist: false,
      action: "remove",
    },
  ]);
});

test("output plan identifies owner conflicts and unknown dist outputs", () => {
  const plan = buildOutputPlan({
    inventory: [content("index.html")],
    honoStaticRoutePaths: new Set(["index.html"]),
    actualPaths: ["index.html", "unclassified.bin"],
  });

  assert.deepEqual(plan.conflicts, [
    { path: "index.html", owners: ["content", "hono-static-route"] },
  ]);
  assert.deepEqual(plan.unknownPaths, ["unclassified.bin"]);
  assert.equal(
    plan.entries.find((entry) => entry.path === "unclassified.bin")?.action,
    "unknown",
  );
});

test("output plan ordering is deterministic", () => {
  const first = buildOutputPlan({
    inventory: [content("z.html"), generated("a.json")],
    actualPaths: ["unknown.bin"],
  });
  const second = buildOutputPlan({
    inventory: [generated("a.json"), content("z.html")],
    actualPaths: ["unknown.bin"],
  });
  assert.deepEqual(first, second);
});

test("output plan comparison reports missing, unknown, and publication violations", () => {
  const plan = buildOutputPlan({
    inventory: [content("present.html"), generated("missing.json")],
    removed: [content("private.html")],
    actualPaths: ["present.html", "private.html", "unclassified.bin"],
  });
  assert.deepEqual(
    compareOutputPlan(plan, [
      "present.html",
      "private.html",
      "unclassified.bin",
    ]),
    {
      matched: ["present.html"],
      missingInPlan: ["unclassified.bin"],
      missingInDist: ["missing.json"],
      ownerConflicts: [],
      unknown: ["unclassified.bin"],
      publicationViolations: ["private.html"],
    },
  );
});
