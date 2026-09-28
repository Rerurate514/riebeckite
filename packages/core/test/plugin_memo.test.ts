import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createPluginCache,
  createUnavailablePluginCache,
  type JsonValue,
  type PluginCache,
} from "../src/plugin/plugin_cache.js";
import {
  createPluginMemo,
  stableStringify,
} from "../src/plugin/plugin_memo.js";

function memoryCache(): PluginCache & { readonly size: number } {
  const values = new Map<string, string>();
  return {
    get size() {
      return values.size;
    },
    async get<T extends JsonValue>(key: string): Promise<T | undefined> {
      const raw = values.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    async set<T extends JsonValue>(key: string, value: T): Promise<void> {
      values.set(key, JSON.stringify(value));
    },
    async delete(key: string): Promise<void> {
      values.delete(key);
    },
    async clear(): Promise<void> {
      values.clear();
    },
  };
}

test("memo hits the cache for identical dependencies", async () => {
  const cache = memoryCache();
  const memo = createPluginMemo(cache);
  let calls = 0;
  const compute = async () => {
    calls++;
    return { value: calls } as JsonValue;
  };

  assert.deepEqual(await memo.memo("key", { a: 1 }, compute), { value: 1 });
  assert.deepEqual(await memo.memo("key", { a: 1 }, compute), { value: 1 });
  assert.equal(calls, 1);
  assert.equal(cache.size, 1);
});

test("memo recomputes when dependencies change", async () => {
  const cache = memoryCache();
  const memo = createPluginMemo(cache);
  let calls = 0;
  const compute = async () => {
    calls++;
    return { value: calls } as JsonValue;
  };

  await memo.memo("key", { a: 1 }, compute);
  await memo.memo("key", { a: 2 }, compute);
  assert.equal(calls, 2);
});

test("memo treats differently ordered objects as the same dependency set", async () => {
  const cache = memoryCache();
  const memo = createPluginMemo(cache);
  let calls = 0;
  const compute = async () => {
    calls++;
    return "value";
  };

  await memo.memo("key", { a: 1, b: [1, { c: 2, d: 3 }] }, compute);
  await memo.memo("key", { b: [1, { d: 3, c: 2 }], a: 1 }, compute);
  assert.equal(calls, 1);
});

test("memo recomputes after a corrupted cache entry is detected", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-memo-"));
  try {
    const cache = createPluginCache({
      pluginName: "memo-test",
      cacheDirectory: directory,
    });
    const memo = createPluginMemo(cache);
    let calls = 0;
    const compute = async () => {
      calls++;
      return { value: calls } as JsonValue;
    };

    await memo.memo("key", { a: 1 }, compute);
    await memo.memo("key", { a: 1 }, compute);
    assert.equal(calls, 1);

    const [entry] = await listJsonFiles(directory);
    assert.ok(entry, "expected a cache entry to exist");
    await writeFile(entry, "{ this is not json", "utf8");

    assert.deepEqual(await memo.memo("key", { a: 1 }, compute), { value: 2 });
    assert.equal(calls, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("memo degrades to recomputing when the cache is unavailable", async () => {
  const memo = createPluginMemo(createUnavailablePluginCache());
  let calls = 0;
  const compute = async () => {
    calls++;
    return "value";
  };

  assert.equal(await memo.memo("key", {}, compute), "value");
  assert.equal(await memo.memo("key", {}, compute), "value");
  assert.equal(calls, 2);
});

test("stableStringify sorts object keys recursively", () => {
  assert.equal(
    stableStringify({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] } }),
    '{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}',
  );
  assert.equal(stableStringify([1, "two", null, true]), '[1,"two",null,true]');
});

async function listJsonFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { recursive: true })) {
    if (entry.endsWith(".json")) {
      found.push(path.join(directory, entry));
    }
  }
  return found;
}
