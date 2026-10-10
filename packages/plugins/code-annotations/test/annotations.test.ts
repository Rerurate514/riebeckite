import assert from "node:assert/strict";
import { test } from "node:test";
import type { CodeDiffPlan } from "../index.ts";
import {
  appendCodeDiffMeta,
  collectCodeDiff,
  deserializeCodeDiff,
  encodeCodeDiffMeta,
  extractCodeDiffMeta,
  removeCodeDiffMeta,
  serializeCodeDiff,
} from "../index.ts";

test("collectCodeDiff separates leading diff markers from code", () => {
  const collected = collectCodeDiff(
    [
      '+ const added = "+";',
      '- const removed = "-";',
      "",
      "const kept = 1;",
    ].join("\n"),
  );

  assert.equal(
    collected.code,
    [
      ' const added = "+";',
      ' const removed = "-";',
      "",
      "const kept = 1;",
    ].join("\n"),
  );
  assert.deepEqual(collected.plan, { markers: ["+", "-", null, null] });
});

test("diff plans serialize through fence metadata", () => {
  const plan: CodeDiffPlan = { markers: ["+", "-", null] };
  const encoded = serializeCodeDiff(plan);

  assert.deepEqual(deserializeCodeDiff(encoded), plan);
  assert.equal(deserializeCodeDiff("not json"), null);
  assert.equal(deserializeCodeDiff("[]"), null);

  const meta = appendCodeDiffMeta("title=example.ts", plan);
  assert.deepEqual(extractCodeDiffMeta(meta), plan);
  assert.equal(removeCodeDiffMeta(meta), "title=example.ts");
  assert.deepEqual(extractCodeDiffMeta(encodeCodeDiffMeta(plan)), plan);
});
