import { ClientLifecycle } from "../../packages/core/client.js";
import {
  type ClientRuntime,
  createClientRuntimeHost,
  createWasmWorkerRuntime,
  createWorkerRuntime,
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
} from "../../packages/runtime/client.js";
import { startSpaNavigation } from "../../packages/spa/index.js";

type WorkerInput = {
  readonly value: number;
  readonly delay?: number;
  readonly crash?: boolean;
};

type TestWindow = Window & {
  __runtimeTest?: {
    instances: ClientRuntime<number>[];
    workerInstances: ClientRuntime<number>[];
    errors: string[];
    clicks: number;
    workerReady: number;
    workerResults: number[];
    workerBackpressure: string | null;
    workerAbort: string | null;
    workerPending: string | null;
    workerCrash: string | null;
    wasmInstances: ClientRuntime<number>[];
    wasmReady: number;
    wasmResults: number[];
    wasmTrap: string | null;
    wasmTrapFlag: boolean;
    wasmMissing: string | null;
    wasmMissingMessage: string | null;
    unmountPage(): Promise<void>;
    crashWorker(): Promise<void>;
    testWasmTrap(): Promise<void>;
    testWasmMissing(): Promise<void>;
  };
};

const registry = new InteractiveRuntimeRegistry();
registry.register(
  defineInteractiveRuntime<{ value: number }, number>({
    id: "dom",
    kind: "main",
    capabilities: ["dom"],
    create: ({ root, signal }) => {
      let output: HTMLElement | undefined;
      const onClick = () => {
        const test = testWindow().__runtimeTest;
        if (test) test.clicks += 1;
      };
      window.addEventListener("click", onClick, { signal });
      return {
        start() {
          if (!(root instanceof Element)) {
            throw new Error("The DOM runtime requires an element root.");
          }
          output = document.createElement("p");
          output.dataset.runtimeOutput = "";
          output.textContent = "runtime ready";
          root.append(output);
        },
        invoke(input) {
          if (!output) throw new Error("The DOM runtime is not mounted.");
          output.textContent = String(input.value * 2);
          return input.value * 2;
        },
        stop() {
          window.removeEventListener("click", onClick);
          output?.remove();
          output = undefined;
        },
      };
    },
  }),
);

registry.register(
  createWorkerRuntime<WorkerInput, number>({
    id: "worker",
    limits: { maxConcurrent: 4, invokeTimeoutMs: 5_000 },
    createWorker: () => new Worker("/runtime-worker.js", { type: "module" }),
  }),
);

const wasmWorker = () => new Worker("/wasm-worker.js", { type: "module" });

registry.register(
  createWasmWorkerRuntime<readonly [number, number], number>({
    id: "wasm",
    wasmUrl: "/add.wasm",
    exportName: "add",
    limits: { invokeTimeoutMs: 5_000 },
    createWorker: wasmWorker,
  }),
);
registry.register(
  createWasmWorkerRuntime<readonly [], never>({
    id: "wasm-trap",
    wasmUrl: "/add.wasm",
    exportName: "trap",
    limits: { invokeTimeoutMs: 5_000 },
    createWorker: wasmWorker,
  }),
);
registry.register(
  createWasmWorkerRuntime<readonly [], never>({
    id: "wasm-missing",
    wasmUrl: "/add.wasm",
    exportName: "missing",
    createWorker: wasmWorker,
  }),
);

const lifecycle = new ClientLifecycle({
  onError(error, context) {
    testWindow().__runtimeTest?.errors.push(
      `${context.phase}: ${String(error)}`,
    );
  },
});

function testWindow(): TestWindow {
  return window as TestWindow;
}

async function mountPage(root: Element): Promise<void> {
  const host = createClientRuntimeHost({ registry, root });
  await lifecycle.mount({
    scope: "page",
    name: "runtime",
    root,
    config: undefined,
    runtimes: host,
    initialize: async (context) => {
      const runtime = context.runtimes?.create<number>("dom");
      if (!runtime)
        throw new Error("The lifecycle did not provide a runtime host.");
      testWindow().__runtimeTest?.instances.push(runtime);
      await runtime.mount();
      await runtime.invoke({ value: 2 });

      const worker = context.runtimes?.create<number>("worker");
      if (!worker)
        throw new Error("The lifecycle did not provide a runtime host.");
      const test = testWindow().__runtimeTest;
      if (!test) throw new Error("The browser test state is missing.");
      test.workerInstances.push(worker);
      await worker.mount();
      test.workerResults = await Promise.all(
        [1, 2, 3, 4].map((value) => worker.invoke({ value })),
      );

      const slow = [1, 2, 3, 4].map((value) =>
        worker.invoke({ value, delay: 50 }),
      );
      try {
        await worker.invoke({ value: 5 });
      } catch (error) {
        test.workerBackpressure = (error as Error).name;
      }
      await Promise.all(slow);

      if (window.location.pathname === "/a") {
        const controller = new AbortController();
        const aborted = worker
          .invoke({ value: 5, delay: 2_000 }, { signal: controller.signal })
          .then(
            () => "resolved",
            (error: Error) => error.name,
          );
        setTimeout(() => controller.abort(), 10);
        test.workerAbort = await aborted;

        const pending = worker.invoke({ value: 7, delay: 5_000 }).then(
          () => "resolved",
          (error: Error) => error.name,
        );
        void pending.then((outcome) => {
          test.workerPending = outcome;
        });
      }
      test.workerReady += 1;

      const wasm = context.runtimes?.create<number>("wasm");
      if (!wasm)
        throw new Error("The lifecycle did not provide a runtime host.");
      test.wasmInstances.push(wasm);
      await wasm.mount();
      test.wasmResults.push(await wasm.invoke([2, 3]));
      test.wasmReady += 1;
    },
  });
}

async function crashWorker(): Promise<void> {
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const runtime = host.create<number>("worker");
    await runtime.mount();
    const outcome = await runtime.invoke({ value: 1, crash: true }).then(
      () => "resolved",
      (error: Error) => error.name,
    );
    const test = testWindow().__runtimeTest;
    if (!test) throw new Error("The browser test state is missing.");
    test.workerCrash = outcome;
  } finally {
    await host.dispose();
  }
}

async function testWasmTrap(): Promise<void> {
  const test = testWindow().__runtimeTest;
  if (!test) throw new Error("The browser test state is missing.");
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const runtime = host.create<never>("wasm-trap");
    await runtime.mount();
    try {
      await runtime.invoke([]);
      test.wasmTrap = "resolved";
    } catch (error) {
      test.wasmTrap = (error as Error).name;
      test.wasmTrapFlag = (error as { trap?: boolean }).trap === true;
    }
  } finally {
    await host.dispose();
  }
}

async function testWasmMissing(): Promise<void> {
  const test = testWindow().__runtimeTest;
  if (!test) throw new Error("The browser test state is missing.");
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const runtime = host.create<never>("wasm-missing");
    try {
      await runtime.mount();
      test.wasmMissing = "resolved";
    } catch (error) {
      test.wasmMissing = (error as Error).name;
      test.wasmMissingMessage = (error as Error).message;
    }
  } finally {
    await host.dispose();
  }
}

testWindow().__runtimeTest = {
  instances: [],
  workerInstances: [],
  errors: [],
  clicks: 0,
  workerReady: 0,
  workerResults: [],
  workerBackpressure: null,
  workerAbort: null,
  workerPending: null,
  workerCrash: null,
  wasmInstances: [],
  wasmReady: 0,
  wasmResults: [],
  wasmTrap: null,
  wasmTrapFlag: false,
  wasmMissing: null,
  wasmMissingMessage: null,
  unmountPage: () => lifecycle.unmount("page"),
  crashWorker,
  testWasmTrap,
  testWasmMissing,
};

const main = document.querySelector("#main-content");
if (main) void mountPage(main);

startSpaNavigation({
  onBeforePageCommit: () => lifecycle.unmount("page"),
  onPageCommit: async ({ root, signal }) => {
    if (signal.aborted || !root.isConnected) return;
    await mountPage(root);
  },
});
