import assert from "node:assert/strict";
import test from "node:test";
import {
  createInteractiveRuntime,
  RuntimeAbortError,
  RuntimeFailureError,
  RuntimeTimeoutError,
  transferOutput,
} from "../index.js";
import { createWorkerRuntime } from "../src/client/worker.js";
import { serveWorkerRuntime } from "../worker.js";
import { createFakeWorker } from "./helpers/fake_worker.js";

function echoWorker(): {
  factory: ReturnType<typeof createFakeWorker>;
  runtime: ReturnType<typeof createWorkerRuntime<number, number>>;
} {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<number, number>(scope, {
      invoke: (input) => input * 2,
    }),
  );
  return {
    factory,
    runtime: createWorkerRuntime<number, number>({
      id: "worker.echo",
      createWorker: () => factory.worker,
    }),
  };
}

test("worker runtime mounts and invokes over the typed protocol", async () => {
  const { factory, runtime } = echoWorker();
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  assert.equal(await instance.invoke(21), 42);
  await instance.dispose();
  assert.equal(instance.state, "disposed");
  assert.equal(factory.terminations, 1);
});

test("concurrent responses are routed to their own requests", async () => {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<{ id: number; delay: number }, number>(scope, {
      async invoke(input) {
        await new Promise((resolve) => setTimeout(resolve, input.delay));
        return input.id;
      },
    }),
  );
  const runtime = createWorkerRuntime<{ id: number; delay: number }, number>({
    id: "worker.concurrent",
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  const results = await Promise.all([
    instance.invoke({ id: 1, delay: 20 }),
    instance.invoke({ id: 2, delay: 5 }),
    instance.invoke({ id: 3, delay: 10 }),
  ]);
  assert.deepEqual(results, [1, 2, 3]);
  await instance.dispose();
});

test("abort rejects promptly and tells the worker to cancel", async () => {
  let workerSignal: AbortSignal | undefined;
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<number, number>(scope, {
      invoke: (_input, context) =>
        new Promise<number>((_resolve, reject) => {
          workerSignal = context.signal;
          context.signal.addEventListener("abort", () =>
            reject(new RuntimeAbortError()),
          );
        }),
    }),
  );
  const runtime = createWorkerRuntime<number, number>({
    id: "worker.abort",
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  const controller = new AbortController();
  const pending = instance.invoke(1, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, RuntimeAbortError);
  assert.equal(instance.state, "ready");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(workerSignal?.aborted, true);
  await instance.dispose();
});

test("timeouts abort the request and keep the runtime usable", async () => {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<number, number>(scope, {
      invoke: () => new Promise<number>(() => {}),
    }),
  );
  const runtime = createWorkerRuntime<number, number>({
    id: "worker.timeout",
    limits: { invokeTimeoutMs: 10 },
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  await assert.rejects(instance.invoke(1), RuntimeTimeoutError);
  assert.equal(instance.state, "ready");
  await instance.dispose();
});

test("a worker crash fails pending requests and the runtime", async () => {
  const { factory, runtime } = echoWorker();
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  factory.emitError(new Error("segfault"));
  await assert.rejects(instance.invoke(1), RuntimeFailureError);
  assert.equal(instance.state, "failed");
  await instance.dispose();
  assert.equal(factory.terminations, 1);
});

test("malformed and foreign messages are ignored", async () => {
  const { factory, runtime } = echoWorker();
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  factory.emitMessage({ hello: "world" });
  factory.emitMessage({
    protocol: "riebeckite:runtime",
    version: 1,
    instanceId: "someone-else",
    kind: "result",
    requestId: 1,
    payload: 999,
  });
  assert.equal(await instance.invoke(3), 6);
  await instance.dispose();
});

test("disposing terminates the worker and rejects in-flight requests", async () => {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<number, number>(scope, {
      invoke: () => new Promise<number>(() => {}),
    }),
  );
  const runtime = createWorkerRuntime<number, number>({
    id: "worker.dispose",
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  const pending = instance.invoke(1);
  await instance.dispose();
  await assert.rejects(pending, RuntimeAbortError);
  assert.equal(factory.terminations, 1);
});

test("transferable inputs and outputs cross without copying", async () => {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<ArrayBuffer, ArrayBuffer>(scope, {
      invoke(input) {
        const view = new Uint8Array(input);
        view[0] = view[0] + 1;
        return transferOutput(input, [input]);
      },
    }),
  );
  const runtime = createWorkerRuntime<ArrayBuffer, ArrayBuffer>({
    id: "worker.transfer",
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  const buffer = new Uint8Array([1, 2, 3]).buffer;
  const result = await instance.invoke(buffer as ArrayBuffer, {
    transfer: [buffer],
  });
  assert.equal(buffer.byteLength, 0);
  assert.deepEqual([...new Uint8Array(result)], [2, 2, 3]);
  await instance.dispose();
});

test("worker initialization failures fail the mount", async () => {
  const factory = createFakeWorker((scope) =>
    serveWorkerRuntime<number, number>(scope, {
      initialize() {
        throw new Error("init exploded");
      },
      invoke: (input) => input,
    }),
  );
  const runtime = createWorkerRuntime<number, number>({
    id: "worker.init-failure",
    createWorker: () => factory.worker,
  });
  const instance = createInteractiveRuntime(runtime);
  await assert.rejects(instance.mount(), /init exploded/);
  assert.equal(instance.state, "failed");
  await instance.dispose();
});
