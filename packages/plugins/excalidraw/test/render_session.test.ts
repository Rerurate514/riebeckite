import assert from "node:assert/strict";
import { test } from "node:test";
import type { Browser } from "puppeteer";
import { createExcalidrawRenderSession } from "../src/render-static.js";
import type { ExcalidrawScene } from "../src/types.js";

type FakeBrowser = {
  browser: Browser;
  counts: {
    launch: number;
    bundle: number;
    newPage: number;
    setContent: number;
    addScriptTag: number;
    evaluate: number;
    browserClose: number;
  };
  evaluateCalls: ExcalidrawScene[];
  setBehavior: (behavior: () => unknown | Promise<unknown>) => void;
};

function createFakeBrowser(): FakeBrowser {
  const counts = {
    launch: 0,
    bundle: 0,
    newPage: 0,
    setContent: 0,
    addScriptTag: 0,
    evaluate: 0,
    browserClose: 0,
  };
  const evaluateCalls: ExcalidrawScene[] = [];
  let behavior: (() => unknown | Promise<unknown>) | null = null;

  const page = {
    setDefaultTimeout() {},
    async setContent() {
      counts.setContent += 1;
    },
    async addScriptTag() {
      counts.addScriptTag += 1;
    },
    async evaluate(_fn: unknown, scene: ExcalidrawScene): Promise<unknown> {
      counts.evaluate += 1;
      evaluateCalls.push(scene);
      if (!behavior) return { ok: true, svg: "<svg></svg>" };
      return behavior();
    },
  };

  const browser = {
    async newPage() {
      counts.newPage += 1;
      return page;
    },
    async close() {
      counts.browserClose += 1;
    },
    process() {
      return null;
    },
  };

  return {
    browser: browser as unknown as Browser,
    counts,
    evaluateCalls,
    setBehavior(next) {
      behavior = next;
    },
  };
}

function createSession(fake: FakeBrowser, timeoutMs?: number) {
  return createExcalidrawRenderSession({
    launch: async () => {
      fake.counts.launch += 1;
      return fake.browser;
    },
    createBundle: async () => {
      fake.counts.bundle += 1;
      return "window.__excalidraw = {};";
    },
    timeoutMs,
  });
}

function scene(text: string): ExcalidrawScene {
  return {
    elements: [{ type: "text", text }],
    appState: {},
    files: {},
  };
}

test("reuses one browser, page, bundle, and script injection across renders", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);

  const results = await Promise.all([
    session.render(scene("first")),
    session.render(scene("second")),
  ]);

  assert.deepEqual(results, ["<svg></svg>", "<svg></svg>"]);
  assert.equal(fake.counts.launch, 1);
  assert.equal(fake.counts.bundle, 1);
  assert.equal(fake.counts.newPage, 1);
  assert.equal(fake.counts.setContent, 1);
  assert.equal(fake.counts.addScriptTag, 1);
  assert.equal(fake.counts.evaluate, 2);
  assert.deepEqual(
    fake.evaluateCalls.map((call) => call.elements[0]?.text),
    ["first", "second"],
  );

  await session.dispose();
  assert.equal(fake.counts.browserClose, 1);
  await session.dispose();
  assert.equal(fake.counts.browserClose, 1);
});

test("dispose without any render never launches a browser", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);

  await session.dispose();

  assert.equal(fake.counts.launch, 0);
  assert.equal(fake.counts.browserClose, 0);
});

test("a renderer failure closes the session and rethrows", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);
  fake.setBehavior(() => ({ ok: false, message: "Bad scene" }));

  await assert.rejects(session.render(scene("broken")), /Bad scene/);

  assert.equal(fake.counts.browserClose, 1);

  fake.setBehavior(() => ({ ok: true, svg: "<svg></svg>" }));
  assert.equal(await session.render(scene("next")), "<svg></svg>");
  assert.equal(fake.counts.launch, 2);
  assert.equal(fake.counts.newPage, 2);

  await session.dispose();
  assert.equal(fake.counts.browserClose, 2);
});

test("dispose waits for a pending render", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);
  let release: (() => void) | null = null;
  let started: (() => void) | null = null;
  const evaluateStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  fake.setBehavior(
    () =>
      new Promise((resolve) => {
        release = () => resolve({ ok: true, svg: "<svg></svg>" });
        started?.();
      }),
  );

  const pending = session.render(scene("slow"));
  await evaluateStarted;

  const disposing = session.dispose();
  assert.equal(fake.counts.browserClose, 0);

  release?.();
  assert.equal(await pending, "<svg></svg>");
  await disposing;
  assert.equal(fake.counts.browserClose, 1);
});
