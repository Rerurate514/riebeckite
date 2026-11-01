import assert from "node:assert/strict";
import test from "node:test";
import { createInteractiveRuntime, RuntimeWasmError } from "../index.js";
import { createWasmWorkerRuntime } from "../src/client/wasm_worker.js";
import { serveWasmWorkerRuntime } from "../worker.js";
import { createAddWasm, createFakeWorker } from "./helpers/fake_worker.js";

function wasmWorker(exportName: string) {
  const factory = createFakeWorker((scope) =>
    serveWasmWorkerRuntime(scope, {
      fetch: async () =>
        new Response(createAddWasm() as unknown as BodyInit, {
          status: 200,
          headers: { "content-type": "application/wasm" },
        }),
    }),
  );
  return {
    factory,
    runtime: createWasmWorkerRuntime<readonly number[], number>({
      id: `wasm.${exportName}`,
      createWorker: () => factory.worker,
      wasmUrl: "/add.wasm",
      exportName,
    }),
  };
}

test("runs a real WASM module inside the worker adapter", async () => {
  const { runtime } = wasmWorker("add");
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  assert.equal(await instance.invoke([2, 3]), 5);
  assert.equal(await instance.invoke([-4, 1]), -3);
  await instance.dispose();
});

test("WASM traps surface as RuntimeWasmError and keep the module usable", async () => {
  const { runtime } = wasmWorker("trap");
  const instance = createInteractiveRuntime(runtime);
  await instance.mount();
  await assert.rejects(instance.invoke([]), (error: unknown) => {
    assert.ok(error instanceof RuntimeWasmError);
    assert.equal(error.trap, true);
    return true;
  });
  assert.equal(instance.state, "ready");
  await assert.rejects(instance.invoke([]), RuntimeWasmError);
  await instance.dispose();
});

test("a missing WASM export fails initialization", async () => {
  const { runtime } = wasmWorker("missing");
  const instance = createInteractiveRuntime(runtime);
  await assert.rejects(instance.mount(), RuntimeWasmError);
  assert.equal(instance.state, "failed");
  await instance.dispose();
});

test("missing WASM assets fail initialization", async () => {
  const factory = createFakeWorker((scope) =>
    serveWasmWorkerRuntime(scope, {
      fetch: async () => new Response("not found", { status: 404 }),
    }),
  );
  const runtime = createWasmWorkerRuntime<readonly number[], number>({
    id: "wasm.404",
    createWorker: () => factory.worker,
    wasmUrl: "/missing.wasm",
    exportName: "add",
  });
  const instance = createInteractiveRuntime(runtime);
  await assert.rejects(instance.mount(), RuntimeWasmError);
  await instance.dispose();
});

test("cross-origin WASM assets are rejected by default", async () => {
  const factory = createFakeWorker((scope) => serveWasmWorkerRuntime(scope));
  const runtime = createWasmWorkerRuntime<readonly number[], number>({
    id: "wasm.cross-origin",
    createWorker: () => factory.worker,
    wasmUrl: "https://example.com/add.wasm",
    exportName: "add",
  });
  const instance = createInteractiveRuntime(runtime);
  await assert.rejects(instance.mount(), /same origin/);
  await instance.dispose();
});
