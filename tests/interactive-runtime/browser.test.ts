import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";
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
    unmountPage(): Promise<void>;
    crashWorker(): Promise<void>;
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
  fixture = await createRuntimeFixture(bundle, {
    "/runtime-worker.js": {
      body: workerBundle,
      contentType: "text/javascript; charset=utf-8",
    },
  });
  browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
      test.workerResults.length === 4
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
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 3,
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

test("a fresh page mount owns a fresh runtime host", async () => {
  const { page, errors } = await open("/b");
  try {
    await page.click('a[href="/c"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/c" &&
        (window as RuntimeTestWindow).__runtimeTest?.instances.at(-1)?.signal
          .aborted === false &&
        (window as RuntimeTestWindow).__runtimeTest?.workerReady === 2,
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
