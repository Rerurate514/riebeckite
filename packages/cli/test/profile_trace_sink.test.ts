import assert from "node:assert/strict";
import { test } from "node:test";
import type { TraceEvent } from "@riebeckite/core";
import { ProfileTraceSink } from "../src/profile/profile_trace_sink.js";
import { renderProfile } from "../src/profile/renderer.js";

function event(
  name: string,
  attributes: TraceEvent["attributes"] = {},
): TraceEvent {
  return { name, time: 0, attributes };
}

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
