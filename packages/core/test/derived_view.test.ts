import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDerivedViewRegistry,
  defineDerivedView,
  type JsonValue,
  type PluginCache,
} from "../index.js";

function memoryCache(): PluginCache {
  const values = new Map<string, JsonValue>();
  return {
    async get<T extends JsonValue>(key: string): Promise<T | undefined> {
      return values.get(key) as T | undefined;
    },
    async set<T extends JsonValue>(key: string, value: T): Promise<void> {
      values.set(key, value);
    },
    async delete(key: string): Promise<void> {
      values.delete(key);
    },
    async clear(): Promise<void> {
      values.clear();
    },
  };
}

test("derived views resolve typed references and deduplicate concurrent work", async () => {
  const registry = createDerivedViewRegistry();
  let calls = 0;
  const doubled = defineDerivedView<number, number>({
    id: "test.doubled",
    version: "1",
    input: { parse: (value) => Number(value) },
    compute: async (value) => {
      calls++;
      return value * 2;
    },
  });
  const total = defineDerivedView<number, number>({
    id: "test.total",
    version: "1",
    compute: (value, context) => context.resolve(doubled, value),
  });
  registry.register(doubled);
  registry.register(total);

  assert.deepEqual(
    await Promise.all([registry.resolve(total, 3), registry.resolve(total, 3)]),
    [6, 6],
  );
  assert.equal(calls, 1);
});

test("derived views reject duplicate registration and cycles", async () => {
  const registry = createDerivedViewRegistry();
  const first = defineDerivedView<number, number>({
    id: "test.first",
    version: "1",
    compute: (value, context) => context.resolve<number>("test.second", value),
  });
  const second = defineDerivedView<number, number>({
    id: "test.second",
    version: "1",
    compute: (value, context) => context.resolve(first, value),
  });
  registry.register(first);
  assert.throws(() => registry.register(first), /already registered/);
  registry.register(second);
  await assert.rejects(() => registry.resolve(first, 1), /cycle detected/);
});

test("derived views reuse only current tracked dependencies", async () => {
  const cache = memoryCache();
  const fingerprints = new Map([["post", "one"]]);
  const registry = createDerivedViewRegistry({
    cache: () => cache,
    dependencyFingerprint: (dependency) => fingerprints.get(dependency.id),
  });
  let calls = 0;
  const view = defineDerivedView<string, { value: number }>({
    id: "test.cached",
    version: "1",
    compute: (_input, context) => {
      calls++;
      context.track({
        type: "content",
        id: "post",
        fingerprint: fingerprints.get("post"),
      });
      return { value: calls };
    },
  });
  registry.register(view);

  assert.deepEqual(await registry.resolve(view, "input"), { value: 1 });
  assert.deepEqual(await registry.resolve(view, "input"), { value: 1 });
  fingerprints.set("post", "two");
  assert.deepEqual(await registry.resolve(view, "input"), { value: 2 });
});

test("derived views ignore corrupted cache values and do not persist non-JSON output", async () => {
  const cache = memoryCache();
  const registry = createDerivedViewRegistry({ cache: () => cache });
  let calls = 0;
  const view = defineDerivedView<string, Date>({
    id: "test.ephemeral",
    version: "1",
    compute: () => new Date(++calls),
  });
  registry.register(view);

  assert.equal((await registry.resolve(view, "input")).getTime(), 1);
  assert.equal((await registry.resolve(view, "input")).getTime(), 2);

  const corruptedCache: PluginCache = {
    async get<T extends JsonValue>(): Promise<T | undefined> {
      return "corrupted" as T;
    },
    async set(): Promise<void> {
      return;
    },
    async delete(): Promise<void> {
      return;
    },
    async clear(): Promise<void> {
      return;
    },
  };
  const corrupted = createDerivedViewRegistry({
    cache: () => corruptedCache,
  });
  const recovered = defineDerivedView<string, number>({
    id: "test.corruption",
    version: "1",
    compute: () => 1,
  });
  corrupted.register(recovered);
  assert.equal(await corrupted.resolve(recovered, "input"), 1);
});

test("derived view callers cancel independently and stop work only when unused", async () => {
  let complete: ((value: number) => void) | undefined;
  let aborted = false;
  const view = defineDerivedView<string, number>({
    id: "test.abort",
    version: "1",
    compute: (_input, context) =>
      new Promise<number>((resolve, reject) => {
        complete = resolve;
        context.signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(context.signal.reason);
          },
          { once: true },
        );
      }),
  });
  const registry = createDerivedViewRegistry();
  registry.register(view);
  const first = new AbortController();
  const second = new AbortController();
  const firstResult = registry.resolve(view, "same", { signal: first.signal });
  const secondResult = registry.resolve(view, "same", {
    signal: second.signal,
  });
  await waitFor(() => complete !== undefined);

  first.abort(new Error("first"));
  await assert.rejects(firstResult, /first/);
  assert.equal(aborted, false);
  complete?.(2);
  assert.equal(await secondResult, 2);

  const third = new AbortController();
  const fourth = new AbortController();
  complete = undefined;
  const thirdResult = registry.resolve(view, "next", { signal: third.signal });
  const fourthResult = registry.resolve(view, "next", {
    signal: fourth.signal,
  });
  await waitFor(() => complete !== undefined);
  third.abort();
  fourth.abort();
  await assert.rejects(thirdResult);
  await assert.rejects(fourthResult);
  assert.equal(aborted, true);
});

async function waitFor(predicate: () => boolean): Promise<void> {
  while (!predicate())
    await new Promise<void>((resolve) => queueMicrotask(resolve));
}
