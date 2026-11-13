import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer";

function contentType(file: string): string {
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/html";
}

async function serve(
  directory: string,
): Promise<{ url: string; close(): Promise<void> }> {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const root = path.resolve(directory);
    const relative = pathname.slice(1);
    const candidates =
      pathname === "/"
        ? ["index.html"]
        : [`${relative}.html`, path.join(relative, "index.html"), relative];
    const file = candidates
      .map((candidate) => path.resolve(directory, candidate))
      .find(
        (candidate) =>
          candidate.startsWith(`${root}${path.sep}`) &&
          fs.existsSync(candidate),
      );
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": contentType(file) });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function assertNavigation(
  url: string,
  expectsSpa: boolean,
): Promise<void> {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requests: string[] = [];
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.origin === new URL(url).origin) {
        requests.push(requestUrl.pathname);
      }
    });
    await page.goto(url, { waitUntil: "networkidle0" });
    await assertMarkdownComponent(page);
    const componentChunk = requests.find((pathname) =>
      /copy[-_]component[^/]*\.js$/.test(pathname),
    );
    assert.ok(
      componentChunk,
      `home page did not load the component chunk: ${requests.join(", ")}`,
    );
    requests.length = 0;
    await page.setCacheEnabled(false);
    await page.goto(`${url}/notes/example`, { waitUntil: "networkidle0" });
    assert.equal(
      requests.some((pathname) => /copy[-_]component[^/]*\.js$/.test(pathname)),
      false,
      "a page without plugin components loaded the component chunk",
    );
    await page.setCacheEnabled(true);
    await page.goto(url, { waitUntil: "networkidle0" });
    for (const width of [375, 768, 1440]) {
      await page.setViewport({ width, height: 900 });
      const standardDom = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("main#main-content");
        const article = document.querySelector<HTMLElement>(".fixture-article");
        main?.focus();
        return {
          headers: document.body.querySelectorAll(":scope > header").length,
          mains: document.querySelectorAll("main#main-content").length,
          focusedMain: document.activeElement === main,
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
          themed:
            document.documentElement.dataset.rbTheme === "fixture-local" &&
            document.documentElement.dataset.rbSettingFixture === "local" &&
            article !== null &&
            getComputedStyle(article).borderTopWidth === "2px",
        };
      });
      assert.equal(
        standardDom.headers,
        1,
        `${width}px: ${JSON.stringify(standardDom)}`,
      );
      assert.equal(
        standardDom.mains,
        1,
        `${width}px: ${JSON.stringify(standardDom)}`,
      );
      assert.equal(
        standardDom.focusedMain,
        true,
        `${width}px: ${JSON.stringify(standardDom)}`,
      );
      assert.equal(
        standardDom.overflow,
        false,
        `${width}px: ${JSON.stringify(standardDom)}`,
      );
      assert.equal(
        standardDom.themed,
        true,
        `${width}px: ${JSON.stringify(standardDom)}`,
      );
    }
    await assertCanvasViewer(page, url);
    await assertMdxIsland(page, url);
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      (
        window as Window & { spaNavigationMarker?: string }
      ).spaNavigationMarker = "preserved";
    });
    await page.click('a[href="/notes/example"]');
    await page.waitForFunction(() =>
      document.body.textContent?.includes("RIEBECKITE_EXTERNAL_NOTE_MARKER"),
    );
    if (expectsSpa) {
      await page.goBack();
      const island =
        '[data-site-island-marker="RIEBECKITE_SITE_ISLAND_MARKER"]';
      await page.waitForSelector(island);
      await page.click(island);
      await page.waitForFunction(
        (selector) =>
          document.querySelector(selector)?.textContent?.includes("1"),
        {},
        island,
      );
      assert.equal(
        await page
          .$$eval('[data-riebeckite-component="CodeCopy"] button', (buttons) =>
            buttons.map((button) => button.textContent),
          )
          .then((labels) => labels.join("|")),
        "Copy Markdown",
        "the Markdown component did not remount with fresh state",
      );
      await assertMarkdownComponent(page);
    }
    const marker = await page.evaluate(
      () =>
        (window as Window & { spaNavigationMarker?: string })
          .spaNavigationMarker,
    );
    assert.equal(marker === "preserved", expectsSpa);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

async function assertMarkdownComponent(
  page: import("puppeteer").Page,
): Promise<void> {
  const selector = '[data-riebeckite-component="CodeCopy"]';
  await page.waitForSelector(selector);
  const wrapper = await page.$eval(selector, (element) => element.outerHTML);
  assert.match(wrapper, /data-riebeckite-component-props=/);
  assert.doesNotMatch(wrapper, /<script/i);
  assert.match(wrapper, /RIEBECKITE_EXTERNAL_COMPONENT_MARKER/);
  await page.evaluate(() => {
    document.execCommand = () => true;
  });
  await page.click(`${selector} button`);
  await page.waitForFunction(
    (componentSelector) =>
      document
        .querySelector(componentSelector)
        ?.textContent?.includes("Copied Markdown"),
    {},
    selector,
  );
}

async function assertMdxIsland(
  page: import("puppeteer").Page,
  url: string,
): Promise<void> {
  const island = '[data-site-island-marker="RIEBECKITE_SITE_ISLAND_MARKER"]';
  await page.goto(`${url}/notes/mdx-demo`, { waitUntil: "networkidle0" });
  await page.waitForSelector(island);
  await page.click(island);
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.textContent?.includes("1"),
    {},
    island,
  );

  const component = '[data-riebeckite-component="CodeCopy"]';
  await page.waitForSelector(component);
  const state = await page.$$eval(component, (wrappers) =>
    wrappers.map((wrapper) => ({
      html: wrapper.innerHTML,
      scripts: wrapper.querySelectorAll("script").length,
      text: wrapper.getAttribute("data-riebeckite-component-props") ?? "",
      label: wrapper.querySelector("button")?.textContent ?? "",
    })),
  );
  assert.equal(state.length, 2);
  assert.equal(state[0]?.label, "Copy MDX");
  assert.equal(state[1]?.label, "Copy MDX script");
  assert.deepEqual([state[0]?.scripts, state[1]?.scripts], [0, 0]);
  assert.match(state[1]?.text ?? "", /RIEBECKITE_MDX_COMPONENT_MARKER/);
  await page.evaluate(() => {
    document.execCommand = () => true;
  });
  const buttons = await page.$$(`${component} button`);
  await buttons[0]?.click();
  await page.waitForFunction(
    (selector) =>
      document.querySelector(selector)?.textContent?.includes("Copied MDX"),
    {},
    component,
  );
  const labels = await page.$$eval(`${component} button`, (nodes) =>
    nodes.map((node) => node.textContent),
  );
  assert.deepEqual(labels, ["Copied MDX", "Copy MDX script"]);
}

async function assertCanvasViewer(
  page: import("puppeteer").Page,
  url: string,
): Promise<void> {
  await page.goto(`${url}/notes/canvas-demo`, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>("[data-canvas]")?.dataset
        .canvasRender === "ready" ||
      document.querySelector<HTMLElement>("[data-canvas]")?.dataset
        .canvasError === "true",
  );
  for (const width of [375, 1440]) {
    await page.setViewport({ width, height: 900 });
    const state = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>("[data-canvas]");
      const stage = canvas?.querySelector<HTMLElement>("[data-canvas-stage]");
      const fallback = canvas?.querySelector<HTMLElement>(".rb-canvas__static");
      const node = stage?.querySelector<HTMLElement>("[data-canvas-node-id]");
      return {
        canvases: document.querySelectorAll("[data-canvas]").length,
        ready: canvas?.dataset.canvasRender === "ready",
        error: canvas?.dataset.canvasError === "true",
        stageVisible:
          stage !== null && getComputedStyle(stage).display !== "none",
        fallbackHidden:
          fallback !== null && getComputedStyle(fallback).display === "none",
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        node: node?.dataset.canvasNodeId ?? null,
      };
    });
    const message = `${width}px: ${JSON.stringify(state)}`;
    assert.equal(state.canvases, 3, message);
    assert.equal(state.ready, true, message);
    assert.equal(state.error, false, message);
    assert.equal(state.stageVisible, true, message);
    assert.equal(state.fallbackHidden, true, message);
    assert.equal(state.horizontalOverflow, false, message);
    assert.ok(state.node, message);
  }

  const interaction = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>("[data-canvas]");
    const stage = canvas?.querySelector<HTMLElement>("[data-canvas-stage]");
    const world = stage?.querySelector<HTMLElement>("[data-canvas-world]");
    const origin = stage?.querySelector<HTMLElement>(
      '[data-canvas-node-id="origin"]',
    );
    if (!stage || !world || !origin) return null;
    origin.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const before = world.style.transform;
    const bounds = stage.getBoundingClientRect();
    stage.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -120,
        clientX: bounds.left + bounds.width / 2,
        clientY: bounds.top + bounds.height / 2,
      }),
    );
    return new Promise<{ selected: boolean; before: string; after: string }>(
      (resolve) =>
        requestAnimationFrame(() =>
          resolve({
            selected: origin.hasAttribute("data-canvas-selected"),
            before,
            after: world.style.transform,
          }),
        ),
    );
  });
  assert.ok(interaction);
  assert.equal(interaction.selected, true, JSON.stringify(interaction));
  assert.notEqual(
    interaction.after,
    interaction.before,
    JSON.stringify(interaction),
  );
}

export async function assertSpaBrowserBehavior(siteDir: string): Promise<void> {
  const server = await serve(path.join(siteDir, "dist"));
  try {
    await assertNavigation(server.url, true);
    const configPath = path.join(siteDir, "riebeckite.config.ts");
    const config = fs.readFileSync(configPath, "utf8");
    fs.writeFileSync(configPath, config.replace("  spa: {},\n", ""));
    const result = spawnSync(
      process.execPath,
      [
        path.join(
          siteDir,
          "node_modules",
          "@riebeckite",
          "cli",
          "bin",
          "riebeckite.mjs",
        ),
        "build",
      ],
      { cwd: path.join(siteDir, "app"), stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("SPA-disabled external fixture build failed");
    }
    await assertNavigation(server.url, false);
  } finally {
    await server.close();
  }
}

function scaffoldComponentWrappers(html: string): string[] {
  return [
    ...html.matchAll(
      /<div data-riebeckite-component="CodeCopy"[\s\S]*?<\/div>/g,
    ),
  ].map((match) => match[0]);
}

function scaffoldComponentChunk(paths: readonly string[]): boolean {
  return paths.some((pathname) => /copy[-_]component[^/]*\.js$/.test(pathname));
}

async function assertScaffoldMdxPage(page: Page, url: string): Promise<void> {
  await page.goto(`${url}/mdx-demo`, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () =>
      document.body.textContent?.includes(
        "This paragraph comes from a site component imported by MDX.",
      ) === true,
  );
  const selector = '[data-riebeckite-component="CodeCopy"]';
  const buttons = await page.$$(`${selector} button`);
  assert.equal(buttons.length, 1);
  const props = await page.$eval(selector, (wrapper) =>
    JSON.parse(wrapper.getAttribute("data-riebeckite-component-props") ?? "{}"),
  );
  assert.deepEqual(props, {
    text: "RIEBECKITE_SCAFFOLD_MDX_COMPONENT_MARKER",
    label: "Copy MDX",
    copiedLabel: "Copied MDX",
  });
  await page.evaluate(() => {
    document.execCommand = () => true;
  });
  await buttons[0]?.click();
  await page.waitForFunction(
    (query) => document.querySelector(query)?.textContent === "Copied MDX",
    {},
    `${selector} button`,
  );
}

export async function assertScaffoldComponentBrowserBehavior(
  siteDir: string,
): Promise<void> {
  const server = await serve(path.join(siteDir, "dist"));
  const selector = '[data-riebeckite-component="CodeCopy"]';
  const buttonSelector = `${selector} button`;
  const ssrWrappers = scaffoldComponentWrappers(
    await (await fetch(`${server.url}/guide`)).text(),
  );
  assert.equal(ssrWrappers.length, 2);
  assert.match(ssrWrappers[1] ?? "", /data-riebeckite-component-props=/);
  const mdxHtml = await (await fetch(`${server.url}/mdx-demo`)).text();
  assert.match(mdxHtml, /RIEBECKITE_SCAFFOLD_MDX_COMPONENT_MARKER/);
  assert.match(
    mdxHtml,
    /This paragraph comes from a site component imported by MDX\./,
  );
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    const requests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const requested = new URL(request.url());
      if (requested.origin === server.url) requests.push(requested.pathname);
    });
    const labels = () =>
      page.evaluate((query) => {
        return [...document.querySelectorAll(query)].map(
          (button) => button.textContent,
        );
      }, buttonSelector);

    await page.goto(`${server.url}/`, { waitUntil: "networkidle0" });
    assert.equal(await page.$(selector), null);
    assert.equal(scaffoldComponentChunk(requests), false);

    const directPage = await browser.newPage();
    try {
      await directPage.goto(`${server.url}/guide`, {
        waitUntil: "networkidle0",
      });
      await directPage.waitForSelector(selector);
      await directPage.evaluate(() => {
        document.execCommand = () => true;
      });
      const directButtons = await directPage.$$(buttonSelector);
      assert.equal(directButtons.length, 2);
      await directButtons[0]?.click();
      await directPage.waitForFunction(
        (query) => {
          return (
            document.querySelector(query)?.textContent === "Copied example"
          );
        },
        {},
        buttonSelector,
      );
      assert.deepEqual(
        await directPage.$$eval(buttonSelector, (buttons) =>
          buttons.map((button) => button.textContent),
        ),
        ["Copied example", "Copy script text"],
      );
      await assertScaffoldMdxPage(directPage, server.url);
    } finally {
      await directPage.close();
    }

    await page.evaluate(() => {
      (window as Window & { scaffoldSpaMarker?: string }).scaffoldSpaMarker =
        "preserved";
    });
    await Promise.all([
      page.waitForSelector(selector),
      page.click('a[href="/guide"]'),
    ]);
    assert.equal(
      await page.evaluate(
        () =>
          (window as Window & { scaffoldSpaMarker?: string }).scaffoldSpaMarker,
      ),
      "preserved",
    );
    assert.equal(scaffoldComponentChunk(requests), true);
    const hydratedWrappers = await page.$$eval(selector, (wrappers) =>
      wrappers.map((wrapper) => wrapper.innerHTML),
    );
    assert.deepEqual(
      hydratedWrappers,
      ssrWrappers.map((wrapper) =>
        wrapper.slice(wrapper.lastIndexOf("<button"), -"</div>".length),
      ),
    );
    const serialization = await page.evaluate((componentSelector) => {
      const second =
        document.querySelectorAll<HTMLElement>(componentSelector)[1];
      return {
        scripts: second?.querySelectorAll("script").length,
        text: JSON.parse(
          second?.getAttribute("data-riebeckite-component-props") ?? "{}",
        ).text,
      };
    }, selector);
    assert.equal(serialization.scripts, 0);
    assert.equal(
      serialization.text,
      "<script>RIEBECKITE_SCAFFOLD_COMPONENT_MARKER</script>",
    );

    await page.evaluate(() => {
      document.execCommand = () => true;
    });
    assert.deepEqual(await labels(), ["Copy example", "Copy script text"]);
    const buttons = await page.$$(buttonSelector);
    assert.equal(buttons.length, 2);
    await buttons[0]?.click();
    await page.waitForFunction(
      (query) => {
        return document.querySelector(query)?.textContent === "Copied example";
      },
      {},
      buttonSelector,
    );
    assert.deepEqual(await labels(), ["Copied example", "Copy script text"]);

    await page.goBack();
    await page.waitForFunction(
      (query) => !document.querySelector(query),
      {},
      selector,
    );
    assert.equal(
      await page.evaluate(
        () =>
          (window as Window & { scaffoldSpaMarker?: string }).scaffoldSpaMarker,
      ),
      "preserved",
    );
    await page.goForward();
    await page.waitForSelector(selector);
    assert.equal((await page.$$(buttonSelector)).length, 2);
    assert.deepEqual(await labels(), ["Copy example", "Copy script text"]);
    const remountedButtons = await page.$$(buttonSelector);
    await remountedButtons[0]?.click();
    await page.waitForFunction(
      (query) => {
        return document.querySelector(query)?.textContent === "Copied example";
      },
      {},
      buttonSelector,
    );
    assert.deepEqual(await labels(), ["Copied example", "Copy script text"]);
    await page.click('a[href="/mdx-demo"]');
    await page.waitForFunction(
      () =>
        document.body.textContent?.includes(
          "This paragraph comes from a site component imported by MDX.",
        ) === true,
    );
    assert.equal((await page.$$(buttonSelector)).length, 1);
    await page.evaluate(() => {
      document.execCommand = () => true;
    });
    const mdxButton = await page.$(buttonSelector);
    assert.equal(
      await mdxButton?.evaluate((button) => button.textContent),
      "Copy MDX",
    );
    await mdxButton?.click();
    await page.waitForFunction(
      (query) => document.querySelector(query)?.textContent === "Copied MDX",
      {},
      buttonSelector,
    );
    await page.goBack();
    await page.waitForSelector(selector);
    assert.deepEqual(await labels(), ["Copy example", "Copy script text"]);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
}
