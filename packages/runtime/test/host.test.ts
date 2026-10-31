import assert from "node:assert/strict";
import test from "node:test";
import {
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
  RuntimeStateError,
} from "../index.js";
import { createClientRuntimeHost } from "../src/client/host.js";

function createRegistry() {
  const registry = new InteractiveRuntimeRegistry();
  let disposed = 0;
  const definition = defineInteractiveRuntime<{ value: number }, number>({
    id: "double",
    kind: "main",
    capabilities: [],
    create: () => ({
      start: async () => {},
      invoke: (input) => input.value * 2,
      stop: () => {
        disposed += 1;
      },
    }),
  });
  registry.register(definition);
  return {
    registry,
    disposed: () => disposed,
  };
}

test("the client runtime host creates and tracks runtime instances", async () => {
  const { registry } = createRegistry();
  const controller = new AbortController();
  const root = {};
  const host = createClientRuntimeHost({
    registry,
    root,
    signal: controller.signal,
  });

  assert.equal(host.has("double"), true);
  assert.deepEqual(host.ids(), ["double"]);

  const runtime = host.create<number>("double");
  await runtime.mount();
  assert.equal(await runtime.invoke({ value: 4 }), 8);

  controller.abort();
  await runtime.dispose();
  assert.equal(runtime.signal.aborted, true);
});

test("disposing the host disposes every instance once", async () => {
  const { registry, disposed } = createRegistry();
  const host = createClientRuntimeHost({ registry });
  const first = host.create("double");
  const second = host.create("double");
  await Promise.all([first.mount(), second.mount()]);

  await host.dispose();
  await host.dispose();

  assert.equal(disposed(), 2);
  assert.throws(() => host.create("double"), RuntimeStateError);
});

test("creating an unknown runtime throws", () => {
  const { registry } = createRegistry();
  const host = createClientRuntimeHost({ registry });
  assert.throws(() => host.create("missing"), RuntimeStateError);
});
