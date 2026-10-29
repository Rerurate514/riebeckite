import assert from "node:assert/strict";
import test from "node:test";
import { ClientLifecycle } from "../src/client_lifecycle.js";

test("mounts an initializer once for the same scope, name, and root", async () => {
  const lifecycle = new ClientLifecycle<object>();
  const root = {};
  let calls = 0;
  const mount = {
    scope: "page" as const,
    name: "example",
    root,
    config: undefined,
    initialize: () => {
      calls += 1;
      return undefined;
    },
  };

  await lifecycle.mount(mount);
  await lifecycle.mount(mount);

  assert.equal(calls, 1);
});

test("aborts before cleaning up an initializer", async () => {
  const lifecycle = new ClientLifecycle<object>();
  let aborted = false;
  let cleaned = false;

  await lifecycle.mount({
    scope: "page",
    name: "example",
    root: {},
    config: undefined,
    initialize: ({ signal }) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      return () => {
        cleaned = true;
      };
    },
  });
  await lifecycle.unmount("page");

  assert.equal(aborted, true);
  assert.equal(cleaned, true);
});

test("cleans up an initializer that completes after unmount", async () => {
  const lifecycle = new ClientLifecycle<object>();
  let resolveInitializer: (() => void) | undefined;
  let cleaned = false;
  const mounted = lifecycle.mount({
    scope: "page",
    name: "example",
    root: {},
    config: undefined,
    initialize: () =>
      new Promise<() => void>((resolve) => {
        resolveInitializer = () =>
          resolve(() => {
            cleaned = true;
          });
      }),
  });
  const unmounted = lifecycle.unmount("page");

  resolveInitializer?.();
  await Promise.all([mounted, unmounted]);

  assert.equal(cleaned, true);
});

test("isolates initializer and cleanup errors", async () => {
  const failures: string[] = [];
  const lifecycle = new ClientLifecycle<object>({
    onError: (_error, context) => failures.push(context.phase),
  });

  await lifecycle.mount({
    scope: "app",
    name: "initialization",
    root: {},
    config: undefined,
    initialize: () => {
      throw new Error("initialization");
    },
  });
  await lifecycle.mount({
    scope: "app",
    name: "cleanup",
    root: {},
    config: undefined,
    initialize: () => () => {
      throw new Error("cleanup");
    },
  });
  await lifecycle.unmount("app");

  assert.deepEqual(failures, ["initialize", "cleanup"]);
});

test("shares one signal across all page initializers", async () => {
  const lifecycle = new ClientLifecycle<object>();
  const signals: AbortSignal[] = [];
  const mount = (name: string) =>
    lifecycle.mount({
      scope: "page",
      name,
      root: {},
      config: undefined,
      initialize: ({ signal }) => {
        signals.push(signal);
        return undefined;
      },
    });

  await Promise.all([mount("one"), mount("two")]);
  assert.equal(signals[0], signals[1]);
  assert.equal(signals[0]?.aborted, false);

  await lifecycle.unmount("page");
  assert.equal(signals[0]?.aborted, true);
});

test("disposes listeners, timers, intervals, and cleanups registered on the scope", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "setTimeout"] });
  const lifecycle = new ClientLifecycle<object>();
  const target = new EventTarget();
  let clicks = 0;
  let timeouts = 0;
  let intervals = 0;
  let cleanups = 0;

  await lifecycle.mount({
    scope: "page",
    name: "resources",
    root: {},
    config: undefined,
    initialize: ({ scope }) => {
      scope.on(target, "click", () => {
        clicks += 1;
      });
      scope.timeout(() => {
        timeouts += 1;
      }, 5);
      scope.interval(() => {
        intervals += 1;
      }, 5);
      scope.cleanup(() => {
        cleanups += 1;
      });
      return undefined;
    },
  });

  await lifecycle.unmount("page");
  await lifecycle.unmount("page");
  target.dispatchEvent(new Event("click"));
  t.mock.timers.tick(20);

  assert.equal(clicks, 0);
  assert.equal(timeouts, 0);
  assert.equal(intervals, 0);
  assert.equal(cleanups, 1);
});

test("cleans registrations made before an initializer fails", async () => {
  const failures: string[] = [];
  const lifecycle = new ClientLifecycle<object>({
    onError: (_error, context) => failures.push(context.phase),
  });
  const target = new EventTarget();
  let clicks = 0;
  let cleaned = false;

  await lifecycle.mount({
    scope: "page",
    name: "failing",
    root: {},
    config: undefined,
    initialize: ({ scope }) => {
      scope.on(target, "click", () => {
        clicks += 1;
      });
      scope.cleanup(() => {
        cleaned = true;
      });
      throw new Error("initialization");
    },
  });
  target.dispatchEvent(new Event("click"));

  assert.equal(clicks, 0);
  assert.equal(cleaned, true);
  assert.deepEqual(failures, ["initialize"]);
});

test("runs an initializer cleanup once when unmounted twice", async () => {
  const lifecycle = new ClientLifecycle<object>();
  let cleanups = 0;

  await lifecycle.mount({
    scope: "page",
    name: "example",
    root: {},
    config: undefined,
    initialize: () => () => {
      cleanups += 1;
    },
  });
  await lifecycle.unmount("page");
  await lifecycle.unmount("page");

  assert.equal(cleanups, 1);
});
