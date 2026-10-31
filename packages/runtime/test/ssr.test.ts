import assert from "node:assert/strict";
import test from "node:test";
import {
  createClientRuntimeHost,
  createIframeRuntime,
  createRuntimeFallback,
  createWorkerRuntime,
  InteractiveRuntimeRegistry,
  RuntimeUnsupportedError,
} from "../client.js";

test("runtime definitions stay inert without a browser", () => {
  let workers = 0;
  const registry = new InteractiveRuntimeRegistry();
  registry.register(
    createWorkerRuntime({
      id: "ssr-worker",
      createWorker: () => {
        workers += 1;
        throw new Error("The worker must not start during SSR.");
      },
    }),
  );
  registry.register(
    createIframeRuntime({
      id: "ssr-iframe",
      html: "<p>Static fallback</p>",
    }),
  );

  const host = createClientRuntimeHost({ registry });
  const worker = host.create("ssr-worker");
  const iframe = host.create("ssr-iframe");

  assert.equal(workers, 0);
  assert.equal(worker.state, "created");
  assert.equal(iframe.state, "created");
  assert.deepEqual(host.ids(), ["ssr-worker", "ssr-iframe"]);
});

test("the DOM fallback helper refuses to run during SSR", () => {
  assert.throws(
    () => createRuntimeFallback({} as Element),
    RuntimeUnsupportedError,
  );
});
