import assert from "node:assert/strict";
import { test } from "node:test";
import { chartjs } from "../index.js";

test("registers Chart.js and rejects invalid options", () => {
  const plugin = chartjs();
  assert.equal(plugin.name, "chartjs");
  assert.equal(plugin.processedContentCache?.version, "chartjs-v1");
  assert.equal(plugin.clientEntries?.[0]?.exportName, "initChartJs");
  assert.deepEqual(plugin.validateOptions?.({ responsive: "yes" } as never), [
    { path: "responsive", message: "Expected a boolean." },
  ]);
});
