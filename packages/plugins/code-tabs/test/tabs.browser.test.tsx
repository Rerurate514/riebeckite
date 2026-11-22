/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { CodeTabsGroup } from "../src/tabs.tsx";

declare global {
  var RiebeckiteCodeTabs: typeof import("../client.tsx");
}

const LABELS = ["Alpha", "Beta", "Gamma"] as const;

type GroupSelection = {
  selected: Array<string | null>;
  tabindex: Array<string | null>;
  hidden: boolean[];
  active: Array<string | null>;
};

function selection(index: number): GroupSelection {
  return {
    selected: LABELS.map((_, i) => (i === index ? "true" : "false")),
    tabindex: LABELS.map((_, i) => (i === index ? "0" : "-1")),
    hidden: LABELS.map((_, i) => i !== index),
    active: LABELS.map((_, i) => (i === index ? "true" : "false")),
  };
}

function renderGroup(groupId: string, sync: boolean): string {
  const tabs = LABELS.map((label) => ({
    label,
    html: `<pre><code>${label} sample</code></pre>`,
  }));
  const island = { groupId, sync, labels: [...LABELS] };
  return renderToString(
    <div
      class="rr-code-tabs"
      data-code-tabs="true"
      data-code-tabs-sync={sync ? "true" : undefined}
      data-code-tabs-props={JSON.stringify(island)}
    >
      <CodeTabsGroup groupId={groupId} sync={sync} tabs={tabs} />
    </div>,
  );
}

const pageMarkup = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Code tabs</title></head>
<body>
<main>
${renderGroup("rr-tabs-a", true)}
${renderGroup("rr-tabs-b", true)}
${renderGroup("rr-tabs-c", false)}
</main>
</body>
</html>`;

const clientJs = await build({
  entryPoints: [fileURLToPath(new URL("../client.tsx", import.meta.url))],
  bundle: true,
  format: "iife",
  globalName: "RiebeckiteCodeTabs",
  jsx: "automatic",
  jsxImportSource: "hono/jsx",
  platform: "browser",
  target: "esnext",
  write: false,
}).then((result) => result.outputFiles[0]?.text ?? "");

let browser: Browser | null = null;

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => browser?.close());

async function openPage(): Promise<Page> {
  if (!browser) throw new Error("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 900 });
  await page.setContent(pageMarkup);
  await page.addScriptTag({ content: clientJs });
  await page.evaluate(async () => {
    RiebeckiteCodeTabs.initCodeTabs();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
  return page;
}

async function readGroup(page: Page, groupId: string): Promise<GroupSelection> {
  return page.evaluate((id) => {
    const root = document
      .getElementById(`${id}-tab-0`)
      ?.closest<HTMLElement>("[data-code-tabs='true']");
    if (!root) throw new Error(`Missing code tabs group ${id}`);
    const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
    const panels = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    return {
      selected: tabs.map((tab) => tab.getAttribute("aria-selected")),
      tabindex: tabs.map((tab) => tab.getAttribute("tabindex")),
      hidden: panels.map((panel) => panel.hidden),
      active: panels.map((panel) => panel.getAttribute("data-active")),
    };
  }, groupId);
}

async function readFocus(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.id ?? null);
}

test("clicking a tab syncs every group that opts in", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage();
  assert.deepEqual(await readGroup(page, "rr-tabs-a"), selection(0));

  await page.click("#rr-tabs-a-tab-1");
  assert.deepEqual(await readGroup(page, "rr-tabs-a"), selection(1));
  assert.deepEqual(await readGroup(page, "rr-tabs-b"), selection(1));
  assert.equal(await readFocus(page), "rr-tabs-a-tab-1");
  assert.deepEqual(await readGroup(page, "rr-tabs-c"), selection(0));
  await page.close();
});

test("keyboard navigation wraps and stays in sync", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage();
  await page.click("#rr-tabs-a-tab-0");

  const steps = [
    { key: "ArrowRight", index: 1 },
    { key: "ArrowRight", index: 2 },
    { key: "ArrowRight", index: 0 },
    { key: "ArrowLeft", index: 2 },
    { key: "Home", index: 0 },
    { key: "End", index: 2 },
  ];
  for (const step of steps) {
    await page.keyboard.press(step.key);
    assert.deepEqual(
      await readGroup(page, "rr-tabs-a"),
      selection(step.index),
      step.key,
    );
    assert.deepEqual(
      await readGroup(page, "rr-tabs-b"),
      selection(step.index),
      step.key,
    );
    assert.equal(
      await readFocus(page),
      `rr-tabs-a-tab-${step.index}`,
      step.key,
    );
  }
  assert.deepEqual(await readGroup(page, "rr-tabs-c"), selection(0));
  await page.close();
});

test("a group without sync keeps its own selection", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await openPage();
  await page.click("#rr-tabs-c-tab-2");
  assert.deepEqual(await readGroup(page, "rr-tabs-c"), selection(2));
  assert.equal(await readFocus(page), "rr-tabs-c-tab-2");
  assert.deepEqual(await readGroup(page, "rr-tabs-a"), selection(0));
  assert.deepEqual(await readGroup(page, "rr-tabs-b"), selection(0));

  await page.keyboard.press("Home");
  assert.deepEqual(await readGroup(page, "rr-tabs-c"), selection(0));
  assert.deepEqual(await readGroup(page, "rr-tabs-a"), selection(0));
  assert.deepEqual(await readGroup(page, "rr-tabs-b"), selection(0));
  await page.close();
});
