import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import {
  createFrameworkResolutionPlugin,
  loadStandaloneSsgBundle,
  standaloneSsgModuleUrl,
} from "../src/ssg/standalone.js";

const frameworkRequire = createRequire(
  new URL("../src/ssg/standalone.ts", import.meta.url),
);

test("standalone SSG resolves Hono and HonoX from the integration package", () => {
  const hook = createFrameworkResolutionPlugin().resolveId;
  assert.equal(typeof hook, "function");
  const resolveId = hook as (source: string) => string | undefined;
  assert.equal(resolveId("hono"), frameworkRequire.resolve("hono"));
  assert.equal(resolveId("hono/jsx"), frameworkRequire.resolve("hono/jsx"));
  assert.equal(
    resolveId("honox/server"),
    frameworkRequire.resolve("honox/server"),
  );
  assert.equal(resolveId("@riebeckite/ui"), undefined);
});

test("standalone SSG imports its bundle from a stable module URL", () => {
  const url = standaloneSsgModuleUrl(path.join(tmpdir(), "ssg-bundle"));
  assert.equal(
    url,
    pathToFileURL(path.join(tmpdir(), "ssg-bundle", "ssg-server.mjs")).href,
  );
  assert.equal(url.includes("?"), false);
});

test("standalone SSG keeps one JSX runtime across dynamic chunks", async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), "riebeckite-standalone-runtime-"),
  );
  const jsxRuntime = pathToFileURL(
    frameworkRequire.resolve("hono/jsx/jsx-runtime"),
  ).href;
  try {
    await writeFile(
      path.join(root, "entry.js"),
      `import { jsx } from ${JSON.stringify(jsxRuntime)};
export const entryJsx = jsx;
export default {
  async request() {
    const { renderChunk } = await import("./chunk.js");
    return new Response(jsx("section", { children: renderChunk() }).toString());
  },
};
`,
    );
    await writeFile(
      path.join(root, "chunk.js"),
      `import { entryJsx } from "./entry.js";
export function renderChunk() {
  return entryJsx("p", { children: "chunk content" });
}
`,
    );

    const { app } = await loadStandaloneSsgBundle({
      root,
      entry: path.join(root, "entry.js"),
      outputDirectory: path.join(root, "ssg-bundle"),
    });
    const response = await app.request("http://localhost/");

    assert.equal(response.status, 200);
    assert.match(await response.text(), /<p>chunk content<\/p>/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
