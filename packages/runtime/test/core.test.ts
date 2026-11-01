import assert from "node:assert/strict";
import test from "node:test";
import {
  createInteractiveRuntime,
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimePayloadError,
  RuntimeStateError,
} from "../index.js";
import { createMainRuntime } from "../src/client/main.js";

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("mounts once and reports every state transition", async () => {
  const start = deferred<void>();
  const runtime = createMainRuntime<number, number>({
    id: "main.add",
    start: () => start.promise,
    invoke: (input) => input + 1,
  });
  const instance = createInteractiveRuntime(runtime);
  const states: string[] = [];
  instance.onStateChange((change) => states.push(change.state));

  assert.equal(instance.state, "created");
  const mounting = instance.mount();
  assert.equal(instance.state, "starting");
  assert.equal(instance.mount(), mounting);
  start.resolve();
  await mounting;
  assert.equal(instance.state, "ready");

  assert.equal(await instance.invoke(1), 2);
  assert.equal(instance.state, "ready");
  assert.deepEqual(states, ["starting", "ready", "running", "ready"]);
  await instance.dispose();
  assert.equal(instance.state, "disposed");
});

test("double dispose is safe and aborts pending invocations", async () => {
  const runtime = defineInteractiveRuntime<number, number>({
    id: "main.pending",
    kind: "main",
    create: () => ({
      start: () => {},
      invoke: (_input, context) =>
        new Promise<number>((_resolve, reject) => {
          context.signal.addEventListener("abort", () =>
            reject(new RuntimeAbortError()),
          );
        }),
      stop: () => {},
    }),
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  const pending = instance.invoke(1);
  const first = instance.dispose();
  assert.equal(instance.dispose(), first);
  await first;
  await assert.rejects(pending, RuntimeAbortError);
  await instance.dispose();
  assert.equal(instance.state, "disposed");
  await assert.rejects(instance.mount(), RuntimeAbortError);
});

test("start failure is terminal and reported", async () => {
  const reported: string[] = [];
  const runtime = createMainRuntime<number, number>({
    id: "main.fail",
    start: () => {
      throw new Error("boom");
    },
    invoke: (input) => input,
  });
  const instance = createInteractiveRuntime(runtime, {
    onError: (error, phase) => reported.push(`${phase}:${String(error)}`),
  });
  await assert.rejects(instance.mount(), /boom/);
  assert.equal(instance.state, "failed");
  await assert.rejects(instance.invoke(1), RuntimeFailureError);
  assert.equal(reported.length, 1);
  await instance.dispose();
});

test("business errors keep the runtime reusable; fatal errors do not", async () => {
  let fatal = false;
  const runtime = createMainRuntime<number, number>({
    id: "main.reusable",
    invoke: (input) => {
      if (input === 0) throw new Error("invalid input");
      if (fatal) throw new RuntimeFailureError("fatal");
      return input * 2;
    },
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  await assert.rejects(instance.invoke(0), /invalid input/);
  assert.equal(instance.state, "ready");
  assert.equal(await instance.invoke(2), 4);

  fatal = true;
  await assert.rejects(instance.invoke(1), RuntimeFailureError);
  assert.equal(instance.state, "failed");
  await assert.rejects(instance.invoke(1), RuntimeFailureError);
  await instance.dispose();
});

test("payload size and concurrency limits are enforced", async () => {
  const runtime = createMainRuntime<string, string>({
    id: "main.limits",
    limits: { maxInputBytes: 8, maxConcurrent: 1 },
    invoke: (input) => input,
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  await assert.rejects(instance.invoke("too long!"), RuntimePayloadError);

  const blocker = deferred<string>();
  const slow = defineInteractiveRuntime<string, string>({
    id: "main.slow",
    kind: "main",
    limits: { maxConcurrent: 1 },
    create: () => ({
      start: () => {},
      invoke: () => blocker.promise,
      stop: () => {},
    }),
  });
  const slowInstance = createInteractiveRuntime(slow);
  await slowInstance.mount();
  const first = slowInstance.invoke("first");
  await assert.rejects(slowInstance.invoke("second"), RuntimeConcurrencyError);
  blocker.resolve("done");
  assert.equal(await first, "done");
  await slowInstance.dispose();
});

test("undeclared capabilities are rejected before invoking the driver", async () => {
  let invoked = 0;
  const runtime = createMainRuntime<number, number>({
    id: "main.capability",
    capabilities: ["dom"],
    invoke: (input) => {
      invoked += 1;
      return input;
    },
  });
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  await assert.rejects(
    instance.invoke(1, { capability: "network" }),
    RuntimeStateError,
  );
  assert.equal(invoked, 0);
  await instance.dispose();
});

test("an external signal disposes the instance and aborts invocations", async () => {
  const runtime = createMainRuntime<number, number>({
    id: "main.signal",
    invoke: (_input, context) =>
      new Promise<number>((_resolve, reject) => {
        context.signal.addEventListener("abort", () =>
          reject(new RuntimeAbortError()),
        );
      }),
  });
  const controller = new AbortController();
  const instance = createInteractiveRuntime(runtime, {
    signal: controller.signal,
  });
  await instance.mount();
  const pending = instance.invoke(1);
  controller.abort();
  await assert.rejects(pending, RuntimeAbortError);
  await instance.dispose();
  assert.equal(instance.state, "disposed");
});

test("the registry rejects duplicate and unknown runtimes", () => {
  const registry = new InteractiveRuntimeRegistry();
  registry.register(createMainRuntime({ id: "a", invoke: () => 1 }));
  assert.throws(
    () => registry.register(createMainRuntime({ id: "a", invoke: () => 1 })),
    RuntimeStateError,
  );
  assert.throws(() => registry.get("missing"), RuntimeStateError);
  assert.deepEqual(registry.ids, ["a"]);
  assert.equal(registry.has("a"), true);
});
