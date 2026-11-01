import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEmbedFragmentParameters } from "../src/content/attachment.js";

test("parses Obsidian attachment fragment parameters", () => {
  assert.deepEqual(parseEmbedFragmentParameters("page=3"), { page: 3 });
  assert.deepEqual(parseEmbedFragmentParameters("page=3&height=400"), {
    page: 3,
    height: 400,
  });
  assert.deepEqual(parseEmbedFragmentParameters("t=10"), { startTime: 10 });
  assert.deepEqual(parseEmbedFragmentParameters("t=1:30"), { startTime: 90 });
  assert.deepEqual(parseEmbedFragmentParameters("t=01:02:03"), {
    startTime: 3723,
  });
  assert.deepEqual(parseEmbedFragmentParameters("start=5,12"), {
    startTime: 5,
    endTime: 12,
  });
  assert.deepEqual(parseEmbedFragmentParameters("page=3.5&height=abc"), {});
  assert.deepEqual(parseEmbedFragmentParameters("page=0&height=-1"), {});
  assert.deepEqual(parseEmbedFragmentParameters("unknown=value"), {});
  assert.deepEqual(parseEmbedFragmentParameters(""), {});
  assert.deepEqual(parseEmbedFragmentParameters(undefined), {});
});
