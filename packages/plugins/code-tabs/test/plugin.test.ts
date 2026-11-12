import assert from "node:assert/strict";
import { test } from "node:test";
import { ContentManager, resolveConfig } from "@riebeckite/core";
import { codeTabs, remarkCodeMeta } from "../index.js";

test("copies non-empty code fence metadata onto the rendered properties", () => {
  const tree: {
    type: string;
    children: Array<{
      type: string;
      meta?: string;
      data?: { hProperties?: Record<string, unknown> };
    }>;
  } = {
    type: "root",
    children: [
      {
        type: "code",
        meta: "title=index.ts",
        data: { hProperties: { className: ["language-ts"] } },
      },
      { type: "code", meta: "  " },
    ],
  };

  remarkCodeMeta()(tree);

  const [withMeta, withoutMeta] = tree.children;
  assert.ok(withMeta);
  assert.ok(withoutMeta);
  assert.deepEqual(withMeta.data, {
    hProperties: {
      className: ["language-ts"],
      "data-meta": "title=index.ts",
    },
  });
  assert.equal(withoutMeta.data, undefined);
});

test("renders grouped code tabs through the HAST component", async () => {
  const manager = new ContentManager(
    {
      async scan() {
        return [{ path: "posts/demo.md" }];
      },
      async read() {
        return `---
publish: true
title: Demo
---

\`\`\`ts tab=TypeScript
const value = 1;
\`\`\`

\`\`\`js tab=JavaScript
const value = 2;
\`\`\`
`;
      },
    },
    [],
    {
      config: resolveConfig({
        site: { title: "Test" },
        plugins: [codeTabs()],
      }),
    },
  );

  const html =
    (await manager.getManifest()).bySlug.get("posts/demo")?.html ?? "";

  assert.match(html, /class="rr-code-tabs"/);
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-code-tabs-label="TypeScript"/);
  assert.match(html, /data-code-tabs-label="JavaScript"/);
  assert.equal(html.split('role="tabpanel"').length - 1, 2);
  assert.match(html, /const value = 1;/);
  assert.match(html, /const value = 2;/);
});
