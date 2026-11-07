import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createFrameworkResolutionPlugin } from "../src/ssg/standalone.js";

const frameworkRequire = createRequire(
  new URL("../src/ssg/standalone.ts", import.meta.url),
);

test("standalone SSG resolves Hono and HonoX from the integration package", () => {
  const resolveId = createFrameworkResolutionPlugin().resolveId;
  assert.equal(typeof resolveId, "function");
  assert.equal(resolveId("hono"), frameworkRequire.resolve("hono"));
  assert.equal(resolveId("hono/jsx"), frameworkRequire.resolve("hono/jsx"));
  assert.equal(
    resolveId("honox/server"),
    frameworkRequire.resolve("honox/server"),
  );
  assert.equal(resolveId("@riebeckite/ui"), undefined);
});
