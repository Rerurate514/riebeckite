import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { createRuntimeFixture, type RuntimeFixture } from "./fixture.js";

type RuntimeTestWindow = Window & {
  __runtimeTest?: {
    instances: Array<{ signal: AbortSignal }>;
    errors: string[];
    unmountPage(): Promise<void>;
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
  fixture = await createRuntimeFixture(bundle);
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
  await page.waitForFunction(
    () =>
      (window as RuntimeTestWindow).__runtimeTest?.instances.at(-1)?.signal
        .aborted === false,
  );
  return { page, errors };
}

type RuntimeState = {
  path: string;
  instances: number;
  active: number;
  output: string | null;
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
          .aborted === false,
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
    const unmounted = await runtimeState(page);
    assert.equal(unmounted.active, 0);
    assert.deepEqual(unmounted.errors, []);
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
          .aborted === false,
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
