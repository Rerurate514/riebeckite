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
