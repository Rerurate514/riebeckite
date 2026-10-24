import assert from "node:assert/strict";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let browser: Browser;

before(async () => {
  browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
});

async function open(): Promise<Page> {
  const bundle = await build({
    entryPoints: [path.join(packageRoot, "client.ts")],
    bundle: true,
    format: "iife",
    globalName: "MetaBind",
    platform: "browser",
    target: "es2022",
    alias: {
      "@riebeckite/core": path.join(packageRoot, "test", "core-shim.ts"),
    },
    write: false,
  });
  const page = await browser.newPage();
  await page.setContent(`
    <main>
      <span data-meta-bind="input" data-meta-bind-target="progress" data-meta-bind-value="2"><input class="rb-meta-bind__control" type="range" value="2"></span>
      <span data-meta-bind="input" data-meta-bind-target="progress" data-meta-bind-value="2"><input class="rb-meta-bind__control" type="text" value="2"></span>
      <span data-meta-bind="input" data-meta-bind-target="done" data-meta-bind-value="false"><input class="rb-meta-bind__control" type="checkbox"></span>
      <output data-meta-bind="view" data-meta-bind-source="{progress} * 2" data-meta-bind-values="{&quot;progress&quot;:2}">4</output>
      <output data-meta-bind="view" data-meta-bind-source="{done}" data-meta-bind-values="{&quot;done&quot;:false}">false</output>
    </main>
  `);
  await page.addScriptTag({ content: bundle.outputFiles?.[0]?.text });
  return page;
}

test("browser runtime updates views and duplicate controls, then cleans up", async () => {
  const page = await open();
  try {
    const result = await page.evaluate(() => {
      const controller = new AbortController();
      const root = document.querySelector("main");
      if (!root) throw new Error("missing root");
      const runtime = (
        window as unknown as {
          MetaBind: { initMetaBind(context: never): void };
        }
      ).MetaBind;
      runtime.initMetaBind({
        root,
        signal: controller.signal,
        config: undefined,
        scope: {
          signal: controller.signal,
          on(target, type, listener, options) {
            target.addEventListener(type, listener, {
              ...options,
              signal: controller.signal,
            });
          },
          timeout() {},
          interval() {},
          cleanup() {},
        },
      } as never);
      const controls = root.querySelectorAll<HTMLInputElement>(
        ".rb-meta-bind__control",
      );
      controls[0].value = "4";
      controls[0].dispatchEvent(new Event("input", { bubbles: true }));
      const views = root.querySelectorAll("output");
      const afterSlider = [controls[1].value, views[0].textContent];
      controls[2].checked = true;
      controls[2].dispatchEvent(new Event("change", { bubbles: true }));
      const afterToggle = views[1].textContent;
      controller.abort();
      controls[0].value = "3";
      controls[0].dispatchEvent(new Event("input", { bubbles: true }));
      return { afterSlider, afterToggle, afterCleanup: views[0].textContent };
    });
    assert.deepEqual(result, {
      afterSlider: ["4", "8"],
      afterToggle: "true",
      afterCleanup: "8",
    });
  } finally {
    await page.close();
  }
});
