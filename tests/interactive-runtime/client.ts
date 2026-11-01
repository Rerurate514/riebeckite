import { ClientLifecycle } from "../../packages/core/client.js";
import {
  type ClientRuntime,
  createClientRuntimeHost,
  createIframeRuntime,
  createRuntimeFallback,
  createWasmWorkerRuntime,
  createWorkerRuntime,
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
  type RuntimeFallback,
} from "../../packages/runtime/client.js";
import { startSpaNavigation } from "../../packages/spa/index.js";

type WorkerInput = {
  readonly value: number;
  readonly delay?: number;
  readonly crash?: boolean;
};

const IFRAME_HTML = `<output id="out"></output><script>
window.parent.postMessage({protocol:"riebeckite:iframe",version:1,sessionId:"forged",kind:"result",requestId:1,payload:999},"*");
window.addEventListener("riebeckite:iframe-invoke",function(event){
var detail=event.detail;
if(detail.payload.crash){window.riebeckiteIframe.error(detail.requestId,new Error("guest failure"));return;}
setTimeout(function(){
document.getElementById("out").textContent=String(detail.payload.value*4);
window.riebeckiteIframe.result(detail.requestId,detail.payload.value*4);
},detail.payload.delay||0);
});
</script>`;

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
    iframeInstances: ClientRuntime<number>[];
    iframeReady: number;
    iframeResults: number[];
    iframeAbort: string | null;
    iframeBadSandbox: string | null;
    iframeOrigin: string | null;
    iframeNavigation: string | null;
    iframeAfterNavigation: number | null;
    unmountPage(): Promise<void>;
    crashWorker(): Promise<void>;
    testWasmTrap(): Promise<void>;
    testWasmMissing(): Promise<void>;
    testIframeBadSandbox(): Promise<void>;
    testIframeOrigin(): Promise<void>;
    testIframeNavigation(): Promise<void>;
    testFallbackError(): void;
    measureRuntimePerformance(): Promise<Record<string, number>>;
    churnRuntime(count?: number): Promise<void>;
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

registry.register(
  createIframeRuntime<WorkerInput, number>({
    id: "iframe",
    html: IFRAME_HTML,
    title: "Interactive fixture",
    limits: { invokeTimeoutMs: 5_000 },
  }),
);
registry.register(
  createIframeRuntime<WorkerInput, number>({
    id: "iframe-bad",
    html: IFRAME_HTML,
    sandbox: ["allow-scripts", "allow-same-origin"],
  }),
);
registry.register(
  createIframeRuntime<WorkerInput, number>({
    id: "iframe-origin",
    html: IFRAME_HTML,
    expectedOrigin: "https://example.com",
    limits: { startTimeoutMs: 300, invokeTimeoutMs: 300 },
  }),
);

const lifecycle = new ClientLifecycle({
  onError(error, context) {
    pageFallback?.showError(error);
    testWindow().__runtimeTest?.errors.push(
      `${context.phase}: ${String(error)}`,
    );
  },
});

let pageFallback: RuntimeFallback | undefined;

function testWindow(): TestWindow {
  return window as TestWindow;
}

async function mountPage(root: Element): Promise<void> {
  const host = createClientRuntimeHost({ registry, root });
  const fallbackRoot = root.querySelector("[data-runtime-fallback-root]");
  const fallback = fallbackRoot
    ? createRuntimeFallback(fallbackRoot)
    : undefined;
  pageFallback = fallback;
  fallback?.showLoading();
  try {
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

        const frame = context.runtimes?.create<number>("iframe");
        if (!frame)
          throw new Error("The lifecycle did not provide a runtime host.");
        test.iframeInstances.push(frame);
        await frame.mount();
        test.iframeResults.push(await frame.invoke({ value: 3 }));

        const controller = new AbortController();
        const aborted = frame
          .invoke({ value: 6, delay: 2_000 }, { signal: controller.signal })
          .then(
            () => "resolved",
            (error: Error) => error.name,
          );
        setTimeout(() => controller.abort(), 10);
        test.iframeAbort = await aborted;
        test.iframeReady += 1;
        fallback?.showReady();
      },
    });
  } catch (error) {
    fallback?.showError(error);
    throw error;
  }
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

async function testIframeBadSandbox(): Promise<void> {
  const test = testWindow().__runtimeTest;
  if (!test) throw new Error("The browser test state is missing.");
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const runtime = host.create<number>("iframe-bad");
    try {
      await runtime.mount();
      test.iframeBadSandbox = "resolved";
    } catch (error) {
      test.iframeBadSandbox = (error as Error).name;
    }
  } finally {
    await host.dispose();
  }
}

async function testIframeOrigin(): Promise<void> {
  const test = testWindow().__runtimeTest;
  if (!test) throw new Error("The browser test state is missing.");
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const runtime = host.create<number>("iframe-origin");
    try {
      await runtime.mount();
      test.iframeOrigin = "resolved";
    } catch (error) {
      test.iframeOrigin = (error as Error).name;
    }
  } finally {
    await host.dispose();
  }
}

async function testIframeNavigation(): Promise<void> {
  const test = testWindow().__runtimeTest;
  if (!test) throw new Error("The browser test state is missing.");
  const host = createClientRuntimeHost({ registry, onError: () => {} });
  try {
    const existing = new Set(document.querySelectorAll("iframe"));
    const runtime = host.create<number>("iframe");
    await runtime.mount();
    const added = [...document.querySelectorAll("iframe")].find(
      (frame) => !existing.has(frame),
    );
    if (!added) throw new Error("The iframe fixture was not mounted.");
    await new Promise<void>((resolve) => {
      added.addEventListener("load", () => resolve(), { once: true });
      added.srcdoc = "<p>navigated</p>";
    });
    try {
      await runtime.invoke({ value: 1 });
      test.iframeNavigation = "resolved";
    } catch (error) {
      test.iframeNavigation = (error as Error).name;
    }
    const pageFrame = test.iframeInstances.at(-1);
    test.iframeAfterNavigation =
      (await pageFrame?.invoke({ value: 2 })) ?? null;
  } finally {
    await host.dispose();
  }
}

function testFallbackError(): void {
  pageFallback?.showError(new Error("Interactive runtime failed."));
}

async function measureRuntimePerformance(): Promise<Record<string, number>> {
  const root = document.createElement("div");
  document.body.append(root);
  const host = createClientRuntimeHost({
    registry,
    root,
    onError: () => {},
  });
  const timings: Record<string, number> = {};
  try {
    const dom = host.create<number>("dom");
    let started = performance.now();
    await dom.mount();
    timings.mainMountMs = performance.now() - started;
    started = performance.now();
    await dom.invoke({ value: 2 });
    timings.mainInvokeMs = performance.now() - started;

    const worker = host.create<number>("worker");
    started = performance.now();
    await worker.mount();
    timings.workerStartMs = performance.now() - started;
    started = performance.now();
    await worker.invoke({ value: 2 });
    timings.workerRoundtripMs = performance.now() - started;
    started = performance.now();
    for (let index = 0; index < 30; index += 1) {
      await worker.invoke({ value: index });
    }
    timings.workerAverageRoundtripMs = (performance.now() - started) / 30;

    const wasm = host.create<number>("wasm");
    started = performance.now();
    await wasm.mount();
    timings.wasmStartMs = performance.now() - started;
    started = performance.now();
    await wasm.invoke([2, 3]);
    timings.wasmInvokeMs = performance.now() - started;

    const frame = host.create<number>("iframe");
    started = performance.now();
    await frame.mount();
    timings.iframeStartMs = performance.now() - started;
    started = performance.now();
    await frame.invoke({ value: 2 });
    timings.iframeRoundtripMs = performance.now() - started;
  } finally {
    const started = performance.now();
    await host.dispose();
    timings.disposeMs = performance.now() - started;
    root.remove();
  }
  return timings;
}

async function churnRuntime(count = 20): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const host = createClientRuntimeHost({
      registry,
      root: document.createElement("div"),
    });
    const runtime = host.create<number>("dom");
    await runtime.mount();
    await runtime.invoke({ value: index });
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
  iframeInstances: [],
  iframeReady: 0,
  iframeResults: [],
  iframeAbort: null,
  iframeBadSandbox: null,
  iframeOrigin: null,
  iframeNavigation: null,
  iframeAfterNavigation: null,
  unmountPage: () => lifecycle.unmount("page"),
  crashWorker,
  testWasmTrap,
  testWasmMissing,
  testIframeBadSandbox,
  testIframeOrigin,
  testIframeNavigation,
  testFallbackError,
  measureRuntimePerformance,
  churnRuntime,
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
