import assert from "node:assert/strict";
import { test } from "node:test";
import { wavedrom } from "../index.js";

test("registers WaveDrom and rejects invalid options", () => {
  const plugin = wavedrom();
  assert.equal(plugin.name, "wavedrom");
  assert.equal(plugin.processedContentCache?.version, "wavedrom-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initWaveDrom");
  assert.deepEqual(plugin.validateOptions?.({ skin: "wide" } as never), [
    { path: "skin", message: 'Expected "default", "narrow", or "lowkey".' },
  ]);
});
