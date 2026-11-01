import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { createAddWasm } from "../../packages/runtime/test/helpers/fake_worker.js";
import { createRuntimeFixture, type RuntimeFixture } from "./fixture.js";

type RuntimeTestWindow = Window & {
  __runtimeTest?: {
    instances: Array<{
      signal: AbortSignal;
      invoke(input: unknown): Promise<void>;
    }>;
    workerInstances: Array<{
      signal: AbortSignal;
      invoke(input: unknown): Promise<number>;
    }>;
    errors: string[];
    clicks: number;
    workerReady: number;
    workerResults: number[];
    workerBackpressure: string | null;
    workerAbort: string | null;
    workerPending: string | null;
    workerCrash: string | null;
    wasmInstances: Array<{
      signal: AbortSignal;
      invoke(input: readonly number[]): Promise<number>;
    }>;
    wasmReady: number;
    wasmResults: number[];
    wasmTrap: string | null;
    wasmTrapFlag: boolean;
    wasmMissing: string | null;
    wasmMissingMessage: string | null;
    iframeInstances: Array<{
      signal: AbortSignal;
      invoke(input: unknown): Promise<number>;
    }>;
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

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

let browser: Browser;
let fixture: RuntimeFixture;

before(async () => {
  const result = await build({
    entryPoints: [
      path.join(repositoryRoot, "tests/interactive-runtime/client.ts"),
    ],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const bundle = result.outputFiles?.[0]?.text;
  assert.ok(bundle);
  const workerResult = await build({
    entryPoints: [
      path.join(repositoryRoot, "tests/interactive-runtime/worker.ts"),
    ],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const workerBundle = workerResult.outputFiles?.[0]?.text;
  assert.ok(workerBundle);
  const wasmResult = await build({
    entryPoints: [
      path.join(repositoryRoot, "tests/interactive-runtime/wasm-worker.ts"),
    ],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const wasmWorkerBundle = wasmResult.outputFiles?.[0]?.text;
  assert.ok(wasmWorkerBundle);
  fixture = await createRuntimeFixture(bundle, {
    "/runtime-worker.js": {
      body: workerBundle,
      contentType: "text/javascript; charset=utf-8",
    },
    "/wasm-worker.js": {
      body: wasmWorkerBundle,
      contentType: "text/javascript; charset=utf-8",
    },
    "/add.wasm": {
      body: createAddWasm(),
      contentType: "application/wasm",
    },
  });
  browser = await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--enable-precise-memory-info",
    ],
  });
});

after(async () => {
  await browser?.close();
  await fixture?.close();
});

async function open(pathname = "/a"): Promise<{
  page: Page;
  errors: string[];
}> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${fixture.url}${pathname}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => {
    const test = (window as RuntimeTestWindow).__runtimeTest;
    return (
      test?.instances.at(-1)?.signal.aborted === false &&
      test.workerInstances.at(-1)?.signal.aborted === false &&
      test.workerReady === 1 &&
      test.workerResults.length === 4 &&
      test.wasmReady === 1 &&
      test.wasmResults.length === 1 &&
      test.iframeReady === 1 &&
      test.iframeResults.length === 1
    );
  });
  return { page, errors };
}

type RuntimeState = {
  path: string;
  instances: number;
  active: number;
  output: string | null;
  clicks: number;
  errors: string[];
};

async function runtimeState(page: Page): Promise<RuntimeState> {
  return page.evaluate(() => {
    const test = (window as RuntimeTestWindow).__runtimeTest;
    return {
      path: window.location.pathname,
      instances: test?.instances.length ?? 0,
      active:
        test?.instances.filter((runtime) => !runtime.signal.aborted).length ??
        0,
      output:
        document.querySelector<HTMLElement>("[data-runtime-output]")
          ?.textContent ?? null,
      clicks: test?.clicks ?? 0,
      errors: test?.errors ?? [],
    };
  });
}

test("page runtimes are disposed on navigation and recreated on return", async () => {
  const { page, errors } = await open();
  try {
    const initial = await runtimeState(page);
    assert.equal(initial.instances, 1);
    assert.equal(initial.active, 1);
    assert.equal(initial.output, "4");

    await page.click('a[href="/b"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/b" &&
        (window as RuntimeTestWindow).__runtimeTest?.instances.at(-1)?.signal
          .aborted === false &&
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.wasmReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 2 &&
        document.querySelector("h1")?.textContent === "PAGE_B",
    );
    const second = await runtimeState(page);
    assert.equal(second.instances, 2);
    assert.equal(second.active, 1);
    assert.equal(second.output, "4");

    await page.goBack();
    await page.waitForFunction(
      () =>
        window.location.pathname === "/a" &&
        (window as RuntimeTestWindow).__runtimeTest?.instances.length === 3 &&
        (window as RuntimeTestWindow).__runtimeTest?.instances.at(-1)?.signal
          .aborted === false &&
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 3 &&
        (window as RuntimeTestWindow).__runtimeTest?.wasmReady === 3 &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 3,
    );
    const back = await runtimeState(page);
    assert.equal(back.instances, 3);
    assert.equal(back.active, 1);
    assert.equal(back.output, "4");
    assert.deepEqual(back.errors, []);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.unmountPage(),
    );
    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.unmountPage(),
    );
    const clicksBefore = (await runtimeState(page)).clicks;
    await page.evaluate(() => {
      document.body.dispatchEvent(new Event("click", { bubbles: true }));
    });
    const unmounted = await runtimeState(page);
    assert.equal(unmounted.active, 0);
    assert.equal(unmounted.output, null);
    assert.equal(unmounted.clicks, clicksBefore);
    assert.deepEqual(unmounted.errors, []);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("worker runtimes isolate requests, cancel, crash and dispose", async () => {
  const { page, errors } = await open();
  try {
    await page.waitForFunction(
      () => (window as RuntimeTestWindow).__runtimeTest?.workerAbort !== null,
    );
    const worker = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return {
        results: test?.workerResults,
        backpressure: test?.workerBackpressure,
        abort: test?.workerAbort,
        instances: test?.workerInstances.length,
      };
    });
    assert.deepEqual(worker.results, [3, 6, 9, 12]);
    assert.equal(worker.backpressure, "RuntimeConcurrencyError");
    assert.equal(worker.abort, "RuntimeAbortError");
    assert.equal(worker.instances, 1);

    await page.click('a[href="/b"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/b" &&
        (window as RuntimeTestWindow).__runtimeTest?.workerPending !== null &&
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.wasmReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.workerInstances.at(-1)
          ?.signal.aborted === false,
    );
    const afterNavigation = await page.evaluate(async () => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      const previous = test?.workerInstances.at(-2);
      let staleInvoke = "resolved";
      try {
        await previous?.invoke({ value: 1 });
      } catch (error) {
        staleInvoke = (error as Error).name;
      }
      return {
        pending: test?.workerPending,
        active: test?.workerInstances.filter(
          (runtime) => !runtime.signal.aborted,
        ).length,
        previousAborted: previous?.signal.aborted,
        staleInvoke,
        results: test?.workerResults,
      };
    });
    assert.equal(afterNavigation.pending, "RuntimeAbortError");
    assert.equal(afterNavigation.active, 1);
    assert.equal(afterNavigation.previousAborted, true);
    assert.equal(afterNavigation.staleInvoke, "RuntimeStateError");
    assert.deepEqual(afterNavigation.results, [3, 6, 9, 12]);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.crashWorker(),
    );
    const crashed = await page.evaluate(
      () => (window as RuntimeTestWindow).__runtimeTest?.workerCrash,
    );
    assert.equal(crashed, "RuntimeFailureError");

    const stillWorks = await page.evaluate(async () => {
      const runtime = (
        window as RuntimeTestWindow
      ).__runtimeTest?.workerInstances.at(-1);
      return runtime?.invoke({ value: 10 });
    });
    assert.equal(stillWorks, 30);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("WASM runtimes execute, trap, fail initialization and dispose", async () => {
  const { page, errors } = await open();
  try {
    const initial = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return {
        results: test?.wasmResults,
        instances: test?.wasmInstances.length,
      };
    });
    assert.deepEqual(initial.results, [5]);
    assert.equal(initial.instances, 1);

    await page.click('a[href="/b"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/b" &&
        (window as RuntimeTestWindow).__runtimeTest?.wasmReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 2,
    );
    const navigated = await page.evaluate(async () => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      const previous = test?.wasmInstances.at(-2);
      const current = test?.wasmInstances.at(-1);
      let stale = "resolved";
      try {
        await previous?.invoke([1, 1]);
      } catch (error) {
        stale = (error as Error).name;
      }
      return {
        previousAborted: previous?.signal.aborted,
        stale,
        current: await current?.invoke([4, 5]),
        active: test?.wasmInstances.filter((runtime) => !runtime.signal.aborted)
          .length,
      };
    });
    assert.equal(navigated.previousAborted, true);
    assert.equal(navigated.stale, "RuntimeStateError");
    assert.equal(navigated.current, 9);
    assert.equal(navigated.active, 1);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testWasmTrap(),
    );
    const trapped = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return { name: test?.wasmTrap, trap: test?.wasmTrapFlag };
    });
    assert.equal(trapped.name, "RuntimeWasmError");
    assert.equal(trapped.trap, true);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testWasmMissing(),
    );
    const missing = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return { name: test?.wasmMissing, message: test?.wasmMissingMessage };
    });
    assert.equal(missing.name, "RuntimeWasmError");
    assert.match(missing.message ?? "", /missing/);

    const afterFailures = await page.evaluate(async () => {
      const runtime = (
        window as RuntimeTestWindow
      ).__runtimeTest?.wasmInstances.at(-1);
      return runtime?.invoke([6, 7]);
    });
    assert.equal(afterFailures, 13);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("iframe runtimes sandbox guests and reject malformed or foreign messages", async () => {
  const { page, errors } = await open();
  try {
    const initial = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return {
        results: test?.iframeResults,
        abort: test?.iframeAbort,
        instances: test?.iframeInstances.length,
        frames: document.querySelectorAll("iframe").length,
        sandbox: document.querySelector("iframe")?.getAttribute("sandbox"),
        csp: document
          .querySelector("iframe")
          ?.getAttribute("srcdoc")
          ?.includes("default-src 'none'"),
      };
    });
    assert.deepEqual(initial.results, [12]);
    assert.equal(initial.abort, "RuntimeAbortError");
    assert.equal(initial.instances, 1);
    assert.equal(initial.frames, 1);
    assert.equal(initial.sandbox, "allow-scripts");
    assert.equal(initial.csp, true);

    await page.click('a[href="/b"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/b" &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 2,
    );
    const navigated = await page.evaluate(async () => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      const previous = test?.iframeInstances.at(-2);
      const current = test?.iframeInstances.at(-1);
      let stale = "resolved";
      try {
        await previous?.invoke({ value: 1 });
      } catch (error) {
        stale = (error as Error).name;
      }
      return {
        previousAborted: previous?.signal.aborted,
        stale,
        current: await current?.invoke({ value: 5 }),
        frames: document.querySelectorAll("iframe").length,
        active: test?.iframeInstances.filter(
          (runtime) => !runtime.signal.aborted,
        ).length,
      };
    });
    assert.equal(navigated.previousAborted, true);
    assert.equal(navigated.stale, "RuntimeStateError");
    assert.equal(navigated.current, 20);
    assert.equal(navigated.frames, 1);
    assert.equal(navigated.active, 1);

    const malformed = await page.evaluate(async () => {
      const rogue = document.createElement("iframe");
      rogue.srcdoc = `<script>parent.postMessage({protocol:"riebeckite:iframe",version:1,sessionId:"forged",kind:"result",requestId:1,payload:999},"*")</script>`;
      document.body.append(rogue);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const runtime = (
        window as RuntimeTestWindow
      ).__runtimeTest?.iframeInstances.at(-1);
      return runtime?.invoke({ value: 2 });
    });
    assert.equal(malformed, 8);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testIframeBadSandbox(),
    );
    assert.equal(
      await page.evaluate(
        () => (window as RuntimeTestWindow).__runtimeTest?.iframeBadSandbox,
      ),
      "RuntimeIframeError",
    );

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testIframeOrigin(),
    );
    assert.equal(
      await page.evaluate(
        () => (window as RuntimeTestWindow).__runtimeTest?.iframeOrigin,
      ),
      "RuntimeTimeoutError",
    );

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testIframeNavigation(),
    );
    const navigation = await page.evaluate(() => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      return {
        outcome: test?.iframeNavigation,
        after: test?.iframeAfterNavigation,
      };
    });
    assert.equal(navigation.outcome, "RuntimeFailureError");
    assert.equal(navigation.after, 8);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("static fallbacks remain readable without JavaScript", async () => {
  const noScript = await browser.newPage();
  try {
    await noScript.setJavaScriptEnabled(false);
    await noScript.goto(`${fixture.url}/a`, { waitUntil: "domcontentloaded" });
    const fallback = await noScript.evaluate(() => {
      const root = document.querySelector("[data-runtime-fallback-root]");
      const fallbackElement = root?.querySelector<HTMLElement>(
        "[data-runtime-fallback]",
      );
      const loading = root?.querySelector<HTMLElement>(
        "[data-runtime-loading]",
      );
      const error = root?.querySelector<HTMLElement>("[data-runtime-error]");
      return {
        heading: document.querySelector("h1")?.textContent,
        links: document.querySelectorAll("a[href]").length,
        text: fallbackElement?.textContent,
        fallbackHidden: fallbackElement?.hidden,
        loadingHidden: loading?.hidden,
        errorHidden: error?.hidden,
      };
    });
    assert.equal(fallback.heading, "PAGE_A");
    assert.equal(fallback.links, 3);
    assert.equal(fallback.text, "Static result: 4");
    assert.equal(fallback.fallbackHidden, false);
    assert.equal(fallback.loadingHidden, true);
    assert.equal(fallback.errorHidden, true);
  } finally {
    await noScript.close();
  }
});

test("the hydration fallback switches to loading, ready and error states", async () => {
  const { page, errors } = await open();
  try {
    const ready = await page.evaluate(() => {
      const root = document.querySelector("[data-runtime-fallback-root]");
      return {
        busy: root?.getAttribute("aria-busy"),
        fallbackHidden: root?.querySelector<HTMLElement>(
          "[data-runtime-fallback]",
        )?.hidden,
        loadingHidden: root?.querySelector<HTMLElement>(
          "[data-runtime-loading]",
        )?.hidden,
        errorHidden: root?.querySelector<HTMLElement>("[data-runtime-error]")
          ?.hidden,
      };
    });
    assert.equal(ready.busy, null);
    assert.equal(ready.fallbackHidden, true);
    assert.equal(ready.loadingHidden, true);
    assert.equal(ready.errorHidden, true);

    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.testFallbackError(),
    );
    const failed = await page.evaluate(() => {
      const root = document.querySelector("[data-runtime-fallback-root]");
      const error = root?.querySelector<HTMLElement>("[data-runtime-error]");
      return {
        fallbackHidden: root?.querySelector<HTMLElement>(
          "[data-runtime-fallback]",
        )?.hidden,
        errorHidden: error?.hidden,
        errorRole: error?.getAttribute("role"),
        message: error?.textContent,
      };
    });
    assert.equal(failed.fallbackHidden, false);
    assert.equal(failed.errorHidden, false);
    assert.equal(failed.errorRole, "alert");
    assert.equal(failed.message, "Interactive runtime failed.");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("runtime lifecycle stays bounded under repeated mounts", async () => {
  const { page, errors } = await open();
  try {
    const timings = await page.evaluate(async () => {
      const test = (window as RuntimeTestWindow).__runtimeTest;
      if (!test) throw new Error("The browser test state is missing.");
      return test.measureRuntimePerformance();
    });
    console.log(`[runtime-performance] ${JSON.stringify(timings)}`);
    for (const [name, value] of Object.entries(timings)) {
      assert.equal(Number.isFinite(value), true, name);
      assert.ok(value >= 0, name);
    }
    assert.ok(timings.mainMountMs < 1_000);
    assert.ok(timings.workerStartMs < 5_000);
    assert.ok(timings.workerAverageRoundtripMs < 500);
    assert.ok(timings.wasmStartMs < 5_000);
    assert.ok(timings.iframeStartMs < 5_000);
    assert.ok(timings.disposeMs < 5_000);

    const cdp = await page.createCDPSession();
    await cdp.send("HeapProfiler.enable");
    await cdp.send("HeapProfiler.collectGarbage");
    const before = (await cdp.send("Runtime.getHeapUsage")) as {
      usedSize: number;
    };
    await page.evaluate(() =>
      (window as RuntimeTestWindow).__runtimeTest?.churnRuntime(30),
    );
    await cdp.send("HeapProfiler.collectGarbage");
    const after = (await cdp.send("Runtime.getHeapUsage")) as {
      usedSize: number;
    };
    const growth = after.usedSize - before.usedSize;
    console.log(
      `[runtime-memory] before=${before.usedSize} after=${after.usedSize} growth=${growth}`,
    );
    assert.ok(growth < 8 * 1024 * 1024);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("a fresh page mount owns a fresh runtime host", async () => {
  const { page, errors } = await open("/b");
  try {
    await page.click('a[href="/c"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/c" &&
        (window as RuntimeTestWindow).__runtimeTest?.instances.at(-1)?.signal
          .aborted === false &&
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.wasmReady === 2 &&
        (window as RuntimeTestWindow).__runtimeTest?.iframeReady === 2,
    );
    const state = await runtimeState(page);
    assert.equal(state.instances, 2);
    assert.equal(state.active, 1);
    assert.equal(state.output, "4");
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
