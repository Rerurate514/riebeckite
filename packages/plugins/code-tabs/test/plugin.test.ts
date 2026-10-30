import assert from "node:assert/strict";
import { test } from "node:test";
import { remarkCodeMeta } from "../index.js";

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
