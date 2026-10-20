import assert from "node:assert/strict";
import { test } from "node:test";
import type { TraceEvent, TraceSpan } from "@riebeckite/core";
import { ProfileTraceSink } from "../src/profile/profile_trace_sink.js";
import { renderProfile } from "../src/profile/renderer.js";

function event(
  name: string,
  attributes: TraceEvent["attributes"] = {},
): TraceEvent {
  return { name, time: 0, attributes };
}

function span(name: string, durationMs: number): TraceSpan {
  return {
    name,
    startTime: 0,
    durationMs,
    status: "ok",
    attributes: {},
  };
}

test("profile retains inclusive stage durations", () => {
  const sink = new ProfileTraceSink();
  sink.onSpan(span("content.discovery", 12));
  sink.onSpan(span("content.discovery", 8));

  const report = sink.createReport();
  assert.equal(report.stages.get("content.discovery")?.calls, 2);
  assert.equal(
    report.stages.get("content.discovery")?.cumulativeDurationMs,
    20,
  );
  assert.match(renderProfile(report), /overlapping spans are not additive/);
});

test("profile separates content cache from plugin cache", () => {
  const sink = new ProfileTraceSink();
  sink.onEvent(event("cache.hit", { plugin: "example" }));
  sink.onEvent(event("cache.miss", { plugin: "example" }));
  sink.onEvent(event("persistentContentCache.hit", { slug: "a" }));
  sink.onEvent(
    event("persistentContentCache.miss", { slug: "b", reason: "no-entry" }),
  );
  sink.onEvent(
    event("persistentContentCache.miss", {
      slug: "c",
      reason: "dependency-changed",
      dependencyKind: "file",
      dependencyId: "dep.txt",
    }),
  );
  sink.onEvent(
    event("persistentContentCache.bypass", {
      slug: "d",
      reason: "l10n plugin is enabled",
    }),
  );

  const report = sink.createReport();
  assert.deepEqual(report.cache, { hits: 1, misses: 1, hitRate: 0.5 });
  assert.equal(report.contentCache?.hits, 1);
  assert.equal(report.contentCache?.misses, 2);
  assert.equal(report.contentCache?.bypasses, 1);
  assert.deepEqual(report.contentCache?.missReasons, [
    { reason: "dependency-changed", count: 1 },
    { reason: "no-entry", count: 1 },
  ]);
  assert.deepEqual(report.contentCache?.bypassReasons, [
    { reason: "l10n plugin is enabled", count: 1 },
  ]);

  const output = renderProfile(report);
  assert.match(output, /Plugin cache/);
  assert.match(output, /Content cache/);
  assert.match(output, /dependency-changed/);
  assert.match(output, /l10n plugin is enabled/);
});

test("profile omits the content cache section without content cache events", () => {
  const sink = new ProfileTraceSink();
  sink.onEvent(event("cache.hit", { plugin: "example" }));

  const report = sink.createReport();
  assert.equal(report.contentCache, undefined);
  assert.doesNotMatch(renderProfile(report), /Content cache/);
});

test("profile reports fast path metrics from the build.fast-path event", () => {
  const sink = new ProfileTraceSink();
  sink.onEvent(
    event("build.fast-path", {
      fastPathEligible: true,
      fastPathUsed: true,
      fastPathBlockReason: "",
      fastPathDecisionDurationMs: 12,
      buildStateReadDurationMs: 3,
      contentPlanDurationMs: 9,
      externalDependencyDurationMs: 2,
      pluginValidationDurationMs: 1,
      outputInventoryValidationDurationMs: 5,
      outputHashValidationDurationMs: 4,
      outputFilesHashed: 42,
      outputBytesHashed: 2048,
      rssBeforeBytes: 100_000_000,
      rssAfterBytes: 100_500_000,
      peakRssBytes: 100_500_000,
    }),
  );

  const report = sink.createReport();
  assert.equal(report.fastPath?.used, true);
  assert.equal(report.fastPath?.blockReason, "");
  assert.equal(report.fastPath?.fastPathDecisionDurationMs, 12);
  assert.equal(report.fastPath?.buildStateReadDurationMs, 3);
  assert.equal(report.fastPath?.contentPlanDurationMs, 9);
  assert.equal(report.fastPath?.outputFilesHashed, 42);
  assert.equal(report.fastPath?.outputBytesHashed, 2048);
  assert.equal(report.fastPath?.peakRssBytes, 100_500_000);

  const output = renderProfile(report);
  assert.match(output, /Fast path/);
  assert.match(output, /Output files hashed/);
  assert.doesNotMatch(output, /Block reason/);
});

test("profile reports a fast path block reason on fallback", () => {
  const sink = new ProfileTraceSink();
  sink.onEvent(
    event("build.fast-path", {
      fastPathEligible: false,
      fastPathUsed: false,
      fastPathBlockReason: "output-inventory-mismatch",
    }),
  );

  const report = sink.createReport();
  assert.equal(report.fastPath?.used, false);
  assert.equal(report.fastPath?.blockReason, "output-inventory-mismatch");
  assert.match(renderProfile(report), /output-inventory-mismatch/);
});
