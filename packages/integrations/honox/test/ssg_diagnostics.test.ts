import assert from "node:assert/strict";
import test from "node:test";
import { inspectGeneratedHtmlPages } from "../src/ssg/diagnostics.js";
import type { SsgModule } from "../src/ssg/types.js";

test("inspectGeneratedHtmlPages returns plugin diagnostics", () => {
  const messages: string[] = [];
  const module = {
    default: async () => new Response(""),
    config: {
      plugins: [
        {
          name: "quality",
          inspectGeneratedHtml: ({ path }: { path: string }) => [
            {
              severity: "warning" as const,
              message: "Missing alt",
              code: "missing-alt",
              filePath: path,
            },
          ],
        },
      ],
    },
  } as unknown as SsgModule;

  const diagnostics = inspectGeneratedHtmlPages(
    module,
    [{ path: "index.html", html: "<img>" }],
    {
      warn: (message) => messages.push(message),
      info: (message) => messages.push(message),
    },
  );

  assert.deepEqual(diagnostics, [
    {
      code: "missing-alt",
      severity: "warning",
      message: "Missing alt",
      pluginName: "quality",
      filePath: "index.html",
    },
  ]);
  assert.equal(messages.length, 1);
});
