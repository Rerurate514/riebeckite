import assert from "node:assert/strict";
import { test } from "node:test";
import type { Browser } from "puppeteer";
import { createMermaidRenderSession } from "../src/render-static.js";

type EvaluateCall = { id: string; source: string; theme: string };

type FakeBrowser = {
  browser: Browser;
  counts: {
    launch: number;
    newPage: number;
    setContent: number;
    addScriptTag: number;
    evaluate: number;
    browserClose: number;
  };
  evaluateCalls: EvaluateCall[];
  setBehavior: (
    behavior: (call: EvaluateCall) => unknown | Promise<unknown>,
  ) => void;
};

function createFakeBrowser(): FakeBrowser {
  const counts = {
    launch: 0,
    newPage: 0,
    setContent: 0,
    addScriptTag: 0,
    evaluate: 0,
    browserClose: 0,
  };
  const evaluateCalls: EvaluateCall[] = [];
  let behavior: ((call: EvaluateCall) => unknown | Promise<unknown>) | null =
    null;

  const page = {
    setDefaultTimeout() {},
    async setContent() {
      counts.setContent += 1;
    },
    async addScriptTag() {
      counts.addScriptTag += 1;
    },
    async evaluate(
      _fn: unknown,
      id: string,
      source: string,
      theme: string,
    ): Promise<unknown> {
      counts.evaluate += 1;
      const call = { id, source, theme };
      evaluateCalls.push(call);
      if (!behavior) return { ok: true, svg: "<svg>ok</svg>" };
      return behavior(call);
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

function createSession(fake: FakeBrowser) {
  return createMermaidRenderSession({
    launch: async () => {
      fake.counts.launch += 1;
      return fake.browser;
    },
  });
}

test("reuses one browser, one page, and one script injection across renders", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);

  const results = await Promise.all([
    session.render("rr-1", "graph TD;A", "default"),
    session.render("rr-2", "graph TD;B", "dark"),
    session.render("rr-3", "sequenceDiagram;A->B:hi", "default"),
  ]);

  for (const result of results) {
    assert.equal(result.ok, true);
  }

  assert.equal(fake.counts.launch, 1);
  assert.equal(fake.counts.newPage, 1);
  assert.equal(fake.counts.setContent, 1);
  assert.equal(fake.counts.addScriptTag, 1);
  assert.equal(fake.counts.evaluate, 3);
  assert.deepEqual(
    fake.evaluateCalls.map((call) => call.theme),
    ["default", "dark", "default"],
  );

  await session.dispose();
  assert.equal(fake.counts.browserClose, 1);

  // dispose is idempotent.
  await session.dispose();
  assert.equal(fake.counts.browserClose, 1);
});

test("dispose without any render never launches a browser", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);

  await session.dispose();
  await session.dispose();

  assert.equal(fake.counts.launch, 0);
  assert.equal(fake.counts.browserClose, 0);
});

test("invalid diagram result keeps the session alive", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);
  fake.setBehavior(({ source }) =>
    source.includes("INVALID")
      ? { ok: false, kind: "invalid-diagram", message: "Parse error" }
      : { ok: true, svg: "<svg>ok</svg>" },
  );

  const invalid = await session.render("rr-1", "INVALID", "default");
  assert.equal(invalid.ok, false);
  if (invalid.ok === false) {
    assert.equal(invalid.kind, "invalid-diagram");
  }

  const valid = await session.render("rr-2", "graph TD;A", "default");
  assert.equal(valid.ok, true);

  // The browser/page/script survived the invalid diagram.
  assert.equal(fake.counts.launch, 1);
  assert.equal(fake.counts.newPage, 1);
  assert.equal(fake.counts.addScriptTag, 1);
  assert.equal(fake.counts.evaluate, 2);

  await session.dispose();
  assert.equal(fake.counts.browserClose, 1);
});

test("transport failure resets the session and retries once", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);
  let calls = 0;
  fake.setBehavior(() => {
    calls += 1;
    if (calls === 1) throw new Error("Target closed.");
    return { ok: true, svg: "<svg>ok</svg>" };
  });

  const result = await session.render("rr-1", "graph TD;A", "default");
  assert.equal(result.ok, true);

  // First browser died and was closed, a fresh one rendered the diagram.
  assert.equal(fake.counts.launch, 2);
  assert.equal(fake.counts.newPage, 2);
  assert.equal(fake.counts.addScriptTag, 2);
  assert.equal(fake.counts.evaluate, 2);
  assert.equal(fake.counts.browserClose, 1);

  await session.dispose();
  assert.equal(fake.counts.browserClose, 2);
});

test("persistent transport failure returns renderer-error and closes resources", async () => {
  const fake = createFakeBrowser();
  const session = createSession(fake);
  fake.setBehavior(() => {
    throw new Error("Target closed.");
  });

  const result = await session.render("rr-1", "graph TD;A", "default");
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.equal(result.kind, "renderer-error");
    assert.equal(result.message, "Target closed.");
  }

  // Initial attempt + one retry, both torn down.
  assert.equal(fake.counts.launch, 2);
  assert.equal(fake.counts.browserClose, 2);

  await session.dispose();
  assert.equal(fake.counts.browserClose, 2);
});

test("launch failure is reported without retry", async () => {
  let launches = 0;
  const session = createMermaidRenderSession({
    launch: async () => {
      launches += 1;
      throw new Error("spawn ENOENT");
    },
  });

  const result = await session.render("rr-1", "graph TD;A", "default");
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.equal(result.kind, "renderer-error");
    assert.equal(result.message, "spawn ENOENT");
  }
  assert.equal(launches, 1);

  await session.dispose();
});

test("sessions are independent resources", async () => {
  const first = createFakeBrowser();
  const second = createFakeBrowser();
  const firstSession = createSession(first);
  const secondSession = createSession(second);

  const results = await Promise.all([
    firstSession.render("rr-1", "graph TD;A", "default"),
    secondSession.render("rr-2", "graph TD;B", "default"),
  ]);
  for (const result of results) assert.equal(result.ok, true);

  assert.equal(first.counts.launch, 1);
  assert.equal(second.counts.launch, 1);

  await firstSession.dispose();
  await secondSession.dispose();
  assert.equal(first.counts.browserClose, 1);
  assert.equal(second.counts.browserClose, 1);
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
        release = () => resolve({ ok: true, svg: "<svg>ok</svg>" });
        started?.();
      }),
  );

  const pending = session.render("rr-1", "graph TD;A", "default");
  await evaluateStarted;

  const disposing = session.dispose();
  assert.equal(fake.counts.browserClose, 0);

  release?.();
  const result = await pending;
  assert.equal(result.ok, true);
  await disposing;
  assert.equal(fake.counts.browserClose, 1);
});
