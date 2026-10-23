import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { createSpaFixture, type SpaFixture } from "./fixture.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

let browser: Browser;
let fixture: SpaFixture;

before(async () => {
  const result = await build({
    entryPoints: [path.join(repositoryRoot, "packages/spa/index.ts")],
    bundle: true,
    format: "iife",
    globalName: "RiebeckiteSpa",
    platform: "browser",
    target: "es2022",
    write: false,
  });
  const bundle = result.outputFiles?.[0]?.text;
  assert.ok(bundle);
  fixture = await createSpaFixture(bundle);
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
      typeof (window as Window & { stopSpa?: unknown }).stopSpa === "function",
  );
  return { page, errors };
}

async function waitForMarker(page: Page, marker: string): Promise<void> {
  await page.waitForFunction(
    (expected) =>
      document.querySelector("#main-content")?.textContent?.includes(expected),
    {},
    marker,
  );
}

type SpaState = {
  path: string;
  title: string;
  commits: string[];
  unmounts: number;
  bootCount: number;
  headScriptRuns: number;
  abortedBefore: boolean;
  abortedAfter: boolean;
  activeElement: string;
};

async function spaState(page: Page): Promise<SpaState> {
  return page.evaluate(() => {
    const spa = window as Window & {
      __pageCommits?: string[];
      __pageUnmounts?: number;
      __spaBootCount?: number;
      __abortedBeforeCommit?: boolean;
      __abortedAfterCommit?: boolean;
      headScriptRuns?: number;
    };
    return {
      path: window.location.pathname,
      title: document.title,
      commits: spa.__pageCommits ?? [],
      unmounts: spa.__pageUnmounts ?? 0,
      bootCount: spa.__spaBootCount ?? 0,
      headScriptRuns: spa.headScriptRuns ?? 0,
      abortedBefore: spa.__abortedBeforeCommit ?? false,
      abortedAfter: spa.__abortedAfterCommit ?? false,
      activeElement: document.activeElement?.id ?? "",
    };
  });
}

test("only the latest navigation commits, updates head, and owns history", async () => {
  const { page, errors } = await open();
  try {
    await page.evaluate(() => window.scrollTo(0, 400));
    await new Promise((resolve) => setTimeout(resolve, 150));
    await page.evaluate(() => {
      document.querySelector<HTMLAnchorElement>('a[href="/b-slow"]')?.click();
      document.querySelector<HTMLAnchorElement>('a[href="/c-fast"]')?.click();
    });
    await waitForMarker(page, "PAGE_C");
    await page.waitForFunction(
      () =>
        window.location.pathname === "/c-fast" &&
        document.activeElement?.id === "main-content",
    );
    await new Promise((resolve) => setTimeout(resolve, 300));

    const state = await spaState(page);
    assert.equal(state.path, "/c-fast");
    assert.equal(state.title, "Page C");
    assert.deepEqual(state.commits, ["PAGE_C"]);
    assert.equal(state.unmounts, 1);
    assert.equal(state.bootCount, 1);
    assert.equal(state.headScriptRuns, 1);
    assert.equal(state.abortedBefore, false);
    assert.equal(state.abortedAfter, false);
    assert.equal(state.activeElement, "main-content");

    const head = await page.evaluate(() => ({
      descriptions: document.querySelectorAll('meta[name="description"]').length,
      description: document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
      canonicals: document.querySelectorAll('link[rel="canonical"]').length,
      canonical: document
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href"),
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]')
        .length,
      jsonLdText: document.querySelector('script[type="application/ld+json"]')
        ?.textContent,
      viewport: document.querySelectorAll('meta[name="viewport"]').length,
      themeColor: document.querySelectorAll('meta[name="theme-color"]').length,
      runtimeMarker: document.querySelectorAll('meta[name="runtime-marker"]')
        .length,
      feeds: document.querySelectorAll('link[href="/feed.xml"]').length,
      stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
      shell: document.querySelectorAll('[data-shell-marker="preserved"]')
        .length,
      skipLink: document.querySelectorAll(".skip-link").length,
    }));
    assert.equal(head.descriptions, 1);
    assert.equal(head.description, "Page C description");
    assert.equal(head.canonicals, 1);
    assert.equal(head.canonical, "https://example.test/c-fast");
    assert.equal(head.jsonLd, 1);
    assert.equal(head.jsonLdText, '{"page":"Page C"}');
    assert.equal(head.viewport, 1);
    assert.equal(head.themeColor, 1);
    assert.equal(head.runtimeMarker, 1);
    assert.equal(head.feeds, 1);
    assert.equal(head.stylesheets, 1);
    assert.equal(head.shell, 1);
    assert.equal(head.skipLink, 1);

    await page.goBack();
    await waitForMarker(page, "PAGE_A");
    await page.waitForFunction(() => Math.abs(window.scrollY - 400) < 2);
    const back = await spaState(page);
    assert.equal(back.path, "/a");
    assert.equal(back.bootCount, 1);
    assert.equal(back.headScriptRuns, 1);
    assert.equal(back.activeElement, "main-content");

    await page.goForward();
    await waitForMarker(page, "PAGE_C");
    const forward = await spaState(page);
    assert.equal(forward.path, "/c-fast");
    assert.equal(forward.bootCount, 1);
    assert.equal(forward.headScriptRuns, 1);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("same-page hash history does not refetch and focuses the target", async () => {
  fixture.resetRequests();
  const { page, errors } = await open("/c-fast");
  try {
    await page.click('a[href="#section"]');
    await page.waitForFunction(() => window.location.hash === "#section");
    assert.equal(fixture.requests("/c-fast"), 1);

    await page.goBack();
    await waitForMarker(page, "PAGE_C");
    await page.waitForFunction(
      () => document.activeElement?.id === "main-content",
    );
    assert.equal(windowHash(await page.url()), "");
    assert.equal(fixture.requests("/c-fast"), 1);

    await page.goForward();
    await page.waitForFunction(
      () => document.activeElement?.id === "section",
    );
    assert.equal(windowHash(await page.url()), "#section");
    assert.equal(fixture.requests("/c-fast"), 1);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("fetch failures fall back to a document navigation", async () => {
  for (const [pathname, marker] of [
    ["/missing", "404 fallback"],
    ["/error", "500 fallback"],
    ["/no-main", "no main fallback"],
  ] as const) {
    const { page, errors } = await open();
    try {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.click(`a[href="${pathname}"]`),
      ]);
      await page.waitForFunction(
        (expected) => document.body.textContent?.includes(expected),
        {},
        marker,
      );
      assert.equal(new URL(page.url()).pathname, pathname);
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  }
});

test("a same-origin redirect commits the final URL", async () => {
  const { page, errors } = await open();
  try {
    await page.click('a[href="/redirect"]');
    await page.waitForFunction(
      () =>
        window.location.pathname === "/c-fast" &&
        document.querySelector("#main-content")?.textContent?.includes("PAGE_C"),
    );
    const state = await spaState(page);
    assert.equal(state.path, "/c-fast");
    assert.deepEqual(state.commits, ["PAGE_C"]);
    assert.equal(state.bootCount, 1);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test("a prefetched page is reused by navigation", async () => {
  fixture.resetRequests();
  const { page, errors } = await open();
  try {
    await page.hover('a[href="/c-fast"]');
    await waitForRequest(fixture, "/c-fast");
    assert.equal(fixture.requests("/c-fast"), 1);

    await page.click('a[href="/c-fast"]');
    await waitForMarker(page, "PAGE_C");
    assert.equal(fixture.requests("/c-fast"), 1);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

async function waitForRequest(
  spaFixture: SpaFixture,
  pathname: string,
): Promise<void> {
  const deadline = Date.now() + 5000;
  while (spaFixture.requests(pathname) === 0) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${pathname}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function windowHash(url: string): string {
  return new URL(url).hash;
}
