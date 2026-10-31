import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentManifestEntry,
  createDerivedViewRegistry,
  defineDerivedView,
  derivedDependenciesToOutputDependencies,
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

test("derived views accept omitted and date inputs and reject unsupported input", async () => {
  const registry = createDerivedViewRegistry();
  const noInput = defineDerivedView<undefined, string>({
    id: "test.no-input",
    version: "1",
    compute: () => "ready",
  });
  registry.register(noInput);
  const dateInput = defineDerivedView<Date, string>({
    id: "test.date-input",
    version: "1",
    compute: (value) => value.toISOString(),
  });
  registry.register(dateInput);
  assert.equal(await registry.resolve(noInput, undefined), "ready");
  assert.equal(
    await registry.resolve(dateInput, new Date("2024-01-01T00:00:00.000Z")),
    "2024-01-01T00:00:00.000Z",
  );
  await assert.rejects(
    registry.resolve(noInput, new Map() as unknown as undefined),
    /must be JSON-serializable/,
  );
  await assert.rejects(
    registry.resolve(noInput, { value: undefined } as unknown as undefined),
    /must be JSON-serializable/,
  );
});

test("unknown dependencies prevent persistent reuse", async () => {
  const storage = memoryCache();
  let computed = "first";
  let runs = 0;
  const view = defineDerivedView<null, string>({
    id: "test.unknown-dependency",
    version: "1",
    compute(_input, context) {
      context.track({ type: "unknown", id: "dynamic-predicate" });
      runs++;
      return computed;
    },
  });
  const first = createDerivedViewRegistry({ cache: () => storage });
  first.register(view);
  assert.equal(await first.resolve(view, null), "first");

  computed = "second";
  const second = createDerivedViewRegistry({ cache: () => storage });
  second.register(view);
  assert.equal(await second.resolve(view, null), "second");
  assert.equal(runs, 2);
});

test("derived view inspection records failures without requiring a cache", async () => {
  const registry = createDerivedViewRegistry({
    cache: () => {
      throw new Error("cache unavailable");
    },
  });
  const failed = defineDerivedView<undefined, undefined>({
    id: "test.inspection-failure",
    version: "1",
    compute: () => {
      throw new Error("failed");
    },
  });
  registry.register(failed);
  assert.deepEqual(registry.inspect(), [
    {
      id: "test.inspection-failure",
      version: "1",
      dependencies: [],
      cache: "not-run",
      durationMs: 0,
    },
  ]);
  await assert.rejects(registry.resolve(failed, undefined), /failed/);
  const execution = registry.inspect()[0];
  assert.equal(execution?.id, "test.inspection-failure");
  assert.equal(execution?.cache, "bypass");
  assert.equal(execution?.recomputeReason, "cache-disabled");
  assert.equal(execution?.error, "failed");
  assert.equal(typeof execution?.durationMs, "number");
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

test("derived view resolutions retain child dependencies across cache hits", async () => {
  const cache = memoryCache();
  const fingerprints = new Map([["note", "one"]]);
  let childCalls = 0;
  let parentCalls = 0;
  const child = defineDerivedView<string, string>({
    id: "test.child-dependencies",
    version: "1",
    compute: (value, context) => {
      childCalls++;
      context.track({
        type: "content",
        id: "note",
      });
      return value;
    },
  });
  const parent = defineDerivedView<string, string>({
    id: "test.parent-dependencies",
    version: "1",
    compute: async (value, context) => {
      parentCalls++;
      return await context.resolve(child, value);
    },
  });
  const createRegistry = () =>
    createDerivedViewRegistry({
      cache: () => cache,
      dependencyFingerprint: (dependency) => fingerprints.get(dependency.id),
    });
  const first = createRegistry();
  first.register(child);
  first.register(parent);

  const resolved = await first.resolveWithDependencies(parent, "ready");
  assert.equal(resolved.value, "ready");
  assert.deepEqual(
    derivedDependenciesToOutputDependencies(resolved.dependencies),
    [{ slug: "note", type: "content" }],
  );
  assert.deepEqual(resolved.viewIds, [
    "test.child-dependencies",
    "test.parent-dependencies",
  ]);
  assert.equal(childCalls, 1);
  assert.equal(parentCalls, 1);

  const second = createRegistry();
  second.register(child);
  second.register(parent);
  const cached = await second.resolveWithDependencies(parent, "ready");
  assert.deepEqual(cached.dependencies, resolved.dependencies);
  assert.deepEqual(cached.viewIds, resolved.viewIds);
  assert.equal(childCalls, 1);
  assert.equal(parentCalls, 1);
});

test("a child view version invalidates a cached parent resolution", async () => {
  const cache = memoryCache();
  let parentCalls = 0;
  const parent = defineDerivedView<string, string>({
    id: "test.parent-version",
    version: "1",
    compute: async (value, context) => {
      parentCalls++;
      return await context.resolve<string>("test.child-version", value);
    },
  });
  const child = (version: string) =>
    defineDerivedView<string, string>({
      id: "test.child-version",
      version,
      compute: (value) => `${version}:${value}`,
    });
  const first = createDerivedViewRegistry({ cache: () => cache });
  first.register(child("1"));
  first.register(parent);
  assert.equal(await first.resolve(parent, "ready"), "1:ready");

  const second = createDerivedViewRegistry({ cache: () => cache });
  second.register(child("2"));
  second.register(parent);
  assert.equal(await second.resolve(parent, "ready"), "2:ready");
  assert.equal(parentCalls, 2);
});

test("a removed child view invalidates a cached parent resolution", async () => {
  const cache = memoryCache();
  let parentCalls = 0;
  const parent = defineDerivedView<string, string>({
    id: "test.parent-removal",
    version: "1",
    compute: async (value, context) => {
      parentCalls++;
      return await context.resolve<string>("test.child-removal", value);
    },
  });
  const child = defineDerivedView<string, string>({
    id: "test.child-removal",
    version: "1",
    compute: (value) => `child:${value}`,
  });
  const first = createDerivedViewRegistry({ cache: () => cache });
  first.register(child);
  first.register(parent);
  assert.equal(await first.resolve(parent, "ready"), "child:ready");

  const second = createDerivedViewRegistry({ cache: () => cache });
  second.register(parent);
  await assert.rejects(second.resolve(parent, "ready"), /not registered/);
  assert.equal(parentCalls, 2);
});

test("derived dependency output mapping retains query and unknown safety", () => {
  const query = {
    filter: { tags: { any: ["release"] } },
    sort: { field: "date", order: "desc" as const },
  };
  assert.deepEqual(
    derivedDependenciesToOutputDependencies([
      { type: "frontmatter", id: "note", property: "date" },
      { type: "query", id: "recent", query, fingerprint: "query-fingerprint" },
      { type: "query", id: "unqualified" },
      { type: "unknown", id: "custom" },
    ]),
    [
      { slug: "note", type: "content" },
      {
        type: "derived-query",
        id: "recent",
        fingerprint: "query-fingerprint",
      },
      { type: "unknown" },
    ],
  );
});

test("content queries fingerprint their complete result and refuse dynamic predicates", async () => {
  const cache = memoryCache();
  let entries = [
    manifestEntry("a", "Alpha", ["x"]),
    manifestEntry("b", "Beta", ["y"]),
  ];
  let calls = 0;
  const view = defineDerivedView<null, string>({
    id: "test.query-cache",
    version: "1",
    compute(_input, context) {
      calls++;
      const result = context.query("selected", {
        filter: { tags: { any: ["x"] } },
      });
      return result.map((entry) => entry.title).join(",");
    },
  });
  const create = () => {
    const registry = createDerivedViewRegistry({
      cache: () => cache,
      queryEntries: () => entries,
    });
    registry.register(view);
    return registry;
  };

  assert.equal(await create().resolve(view, null), "Alpha");
  assert.equal(await create().resolve(view, null), "Alpha");
  assert.equal(calls, 1);

  entries = [
    manifestEntry("a", "Alpha", ["x"]),
    manifestEntry("b", "Beta", ["x"]),
  ];
  assert.equal(await create().resolve(view, null), "Alpha,Beta");
  assert.equal(await create().resolve(view, null), "Alpha,Beta");
  assert.equal(calls, 2);

  let dynamicCalls = 0;
  const dynamicView = defineDerivedView<null, string>({
    id: "test.query-cache",
    version: "2",
    compute(_input, context) {
      dynamicCalls++;
      return context
        .query(
          "selected",
          { filter: { tags: { any: ["x"] } } },
          { where: () => true },
        )
        .map((entry) => entry.title)
        .join(",");
    },
  });
  const dynamicRegistry = createDerivedViewRegistry({
    cache: () => cache,
    queryEntries: () => entries,
  });
  dynamicRegistry.register(dynamicView);
  assert.equal(await dynamicRegistry.resolve(dynamicView, null), "Alpha,Beta");
  assert.equal(await dynamicRegistry.resolve(dynamicView, null), "Alpha,Beta");
  assert.equal(dynamicCalls, 2);

  const unavailable = createDerivedViewRegistry();
  unavailable.register(view);
  await assert.rejects(unavailable.resolve(view, null), /outside a build plan/);
});

function manifestEntry(
  slug: string,
  title: string,
  tags: readonly string[],
): ContentManifestEntry {
  return {
    slug,
    permalink: `/${slug}`,
    publicLocation: { permalink: `/${slug}` },
    title,
    frontmatter: { title, tags: [...tags] },
    publishing: {
      status: "public",
      routable: true,
      discoverable: true,
    },
    html: `<p>${title}</p>`,
    tags: [...tags],
    links: [],
    backlinks: [],
    assets: [],
  } as unknown as ContentManifestEntry;
}

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

test("derived view failure and disposal release every caller", async () => {
  let reject: ((reason?: unknown) => void) | undefined;
  const failing = defineDerivedView<string, number>({
    id: "test.failure",
    version: "1",
    compute: () =>
      new Promise<number>((_resolve, rejectCompute) => {
        reject = rejectCompute;
      }),
  });
  const registry = createDerivedViewRegistry();
  registry.register(failing);
  const first = registry.resolve(failing, "same");
  const second = registry.resolve(failing, "same");
  await waitFor(() => reject !== undefined);
  reject?.(new Error("failed"));
  await assert.rejects(first, /failed/);
  await assert.rejects(second, /failed/);

  const ignoringAbort = defineDerivedView<string, number>({
    id: "test.dispose",
    version: "1",
    compute: () => new Promise<number>(() => {}),
  });
  registry.register(ignoringAbort);
  const pending = registry.resolve(ignoringAbort, "same");
  registry.dispose();
  await assert.rejects(pending, /disposed/);
});

async function waitFor(predicate: () => boolean): Promise<void> {
  while (!predicate())
    await new Promise<void>((resolve) => queueMicrotask(resolve));
}
