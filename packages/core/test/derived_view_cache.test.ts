import assert from "node:assert/strict";
import { test } from "node:test";
import { withTemporaryDirectory } from "@riebeckite/test/fixtures";
import { createDerivedViewRegistry, defineDerivedView } from "../index.js";
import { createPluginCache } from "../src/plugin/plugin_cache.js";

type RoundTrip = {
  calls: number;
  first: unknown;
  second: unknown;
};

async function resolveTwice(
  directory: string,
  id: string,
  compute: () => unknown,
): Promise<RoundTrip> {
  const cache = createPluginCache({
    pluginName: "derived-view-cache-test",
    cacheDirectory: directory,
  });
  let calls = 0;
  const view = defineDerivedView<null, unknown>({
    id,
    version: "1",
    compute: () => {
      calls += 1;
      return compute();
    },
  });
  const first = createDerivedViewRegistry({ cache: () => cache });
  first.register(view);
  const firstValue = await first.resolve(view, null);
  const second = createDerivedViewRegistry({ cache: () => cache });
  second.register(view);
  const secondValue = await second.resolve(view, null);
  return { calls, first: firstValue, second: secondValue };
}

test("derived views cache values that survive a JSON round trip", async () => {
  await withTemporaryDirectory(async (directory) => {
    const cases = [
      { id: "plain-object", value: { value: 1 } },
      { id: "nested-json", value: { value: { list: [1, "two", true, null] } } },
      { id: "array", value: [1, "two", null] },
      { id: "empty-object", value: {} },
    ];
    for (const item of cases) {
      const result = await resolveTwice(
        directory,
        `test.cacheable.${item.id}`,
        () => item.value,
      );
      assert.equal(result.calls, 1, item.id);
      assert.deepEqual(result.second, result.first, item.id);
      assert.deepEqual(
        result.first,
        JSON.parse(JSON.stringify(item.value)),
        item.id,
      );
    }
  });
});

test("derived views do not cache values that a JSON round trip changes", async () => {
  await withTemporaryDirectory(async (directory) => {
    const sparse: unknown[] = [1, 2];
    delete sparse[1];
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const arrayWithProperty = [1] as unknown[] & { extra?: number };
    arrayWithProperty.extra = 2;
    const symbolKeyed = { value: 1, [Symbol("extra")]: 2 };
    const ownToJson = {};
    Object.defineProperty(ownToJson, "toJSON", { value: () => ({}) });
    const cases = [
      { id: "undefined-property", value: { value: undefined } },
      { id: "undefined-element", value: [1, undefined, 2] },
      { id: "sparse-array", value: sparse },
      { id: "nan", value: Number.NaN },
      { id: "infinity", value: Number.POSITIVE_INFINITY },
      { id: "negative-infinity", value: Number.NEGATIVE_INFINITY },
      { id: "negative-zero", value: -0 },
      { id: "date", value: new Date("2024-01-01T00:00:00.000Z") },
      { id: "regexp", value: /pattern/ },
      { id: "symbol", value: Symbol("value") },
      { id: "function", value: () => "value" },
      { id: "nested-nan", value: { value: { value: Number.NaN } } },
      { id: "circular", value: circular },
      { id: "array-with-property", value: arrayWithProperty },
      { id: "symbol-key", value: symbolKeyed },
      { id: "own-to-json", value: ownToJson },
    ];
    for (const item of cases) {
      const result = await resolveTwice(
        directory,
        `test.rejected.${item.id}`,
        () => item.value,
      );
      assert.equal(result.calls, 2, item.id);
      assert.deepEqual(result.second, result.first, item.id);
    }
  });
});

test("derived views keep serving values that a previous run cached", async () => {
  await withTemporaryDirectory(async (directory) => {
    const value = { value: { list: [1, 2, 3] } };
    const first = await resolveTwice(directory, "test.reused", () => value);
    assert.equal(first.calls, 1);
    const second = await resolveTwice(directory, "test.reused", () => value);
    assert.equal(second.calls, 0);
    assert.deepEqual(second.first, first.first);
    assert.deepEqual(second.second, first.first);
  });
});
