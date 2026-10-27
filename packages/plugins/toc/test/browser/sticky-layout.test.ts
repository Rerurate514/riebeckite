import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { scaffoldRiebeckiteSite } from "../../../../create-riebeckite/src/scaffold/index.js";

let server: Server;
let browser: Browser;
let baseUrl = "";
let generatedDirectory = "";

function sampleToc(itemCount = 80) {
  return Array.from(
    { length: itemCount },
    (_, index) =>
      `<li><a class="rr-table-of-contents__link" href="#section-${index}">Section ${index}</a></li>`,
  ).join("");
}

before(async () => {
  const tocStyle = readFileSync(
    new URL("../../style.css", import.meta.url),
    "utf8",
  );
  const honoxStyle = readFileSync(
    new URL("../../../../integrations/honox/style.css", import.meta.url),
    "utf8",
  );
  const articleStyle = readFileSync(
    new URL(
      "../../../../../apps/web/app/components/article/style.css",
      import.meta.url,
    ),
    "utf8",
  );
  generatedDirectory = await mkdtemp(path.join(tmpdir(), "riebeckite-layout-"));
  const starterDirectory = path.join(generatedDirectory, "starter");
  const showcaseDirectory = path.join(generatedDirectory, "showcase");
  await scaffoldRiebeckiteSite({
    targetDirectory: starterDirectory,
    preset: "starter",
  });
  await scaffoldRiebeckiteSite({
    targetDirectory: showcaseDirectory,
    preset: "showcase",
  });
  const [starterStyle, showcaseStyle] = await Promise.all([
    readFile(path.join(starterDirectory, "app/style.css"), "utf8"),
    readFile(path.join(showcaseDirectory, "app/style.css"), "utf8"),
  ]);
  const renderDocsPage = (articleHeight: string, itemCount = 80) =>
    `<!doctype html><html data-rb-layout="article"><head><style>:root { --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-layout-sidebar: 14rem; --rb-layout-gap: 2rem; --rb-docs-rail-top: 4rem; --rb-docs-rail-max-block-size: calc(100dvh - 4rem); --rb-space-2: 1rem; --rb-space-4: 2rem; --rb-space-6: 3rem; --rb-color-muted: #555; --rb-color-ink: #111; }</style><style>${tocStyle}</style><style>${honoxStyle}</style><style>${articleStyle}</style></head><body><header style="height: 7rem">Header</header><article class="rb-article"><div class="rb-article-layout"><aside class="rr-table-of-contents rr-table-of-contents--desktop-rail"><ol class="rr-table-of-contents__list">${sampleToc(itemCount)}</ol></aside><div class="rb-article-body"><div style="height: ${articleHeight}">Article</div></div></div></article></body></html>`;
  const renderSitePage = (siteStyle: string, includeToc = true) =>
    `<!doctype html><html><head><style>:root { --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-layout-sidebar: 14rem; --rb-layout-gap: 2rem; --rb-space-2: 1rem; --rb-space-3: 1.5rem; --rb-space-4: 2rem; --rb-color-muted: #555; --rb-color-ink: #111; --rb-color-border: #ddd; }</style><style>${honoxStyle}</style><style>${tocStyle}</style><style>${siteStyle}</style></head><body class="riebeckite-page"><header class="site-header">Header</header><main class="riebeckite-main"><article class="site-article"><div class="site-article__layout"><div class="rb-article-body"><div style="height: 240rem">Article</div></div><aside class="site-article__aside">${includeToc ? `<aside class="rr-table-of-contents rr-table-of-contents--desktop"><ol class="rr-table-of-contents__list">${sampleToc()}</ol></aside>` : ""}</aside></div></article></main></body></html>`;
  server = createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    if (request.url === "/starter") {
      response.end(renderSitePage(starterStyle));
      return;
    }
    if (request.url === "/showcase") {
      response.end(renderSitePage(showcaseStyle));
      return;
    }
    if (request.url === "/starter-without-toc") {
      response.end(renderSitePage(starterStyle, false));
      return;
    }
    response.end(
      request.url === "/short"
        ? renderDocsPage("80rem", 5)
        : renderDocsPage("240rem"),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(generatedDirectory, { force: true, recursive: true });
});

async function openPage(
  viewport: {
    width: number;
    height: number;
  },
  path = "/",
): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
  return page;
}

test("desktop TOC remains sticky and scrolls internally in the Site layout", async () => {
  const page = await openPage({ width: 1600, height: 900 });
  const before = await page.evaluate(() => {
    const toc = document.querySelector(
      ".rr-table-of-contents--desktop-rail",
    ) as HTMLElement;
    const layout = document.querySelector(".rb-article-layout") as HTMLElement;
    return {
      top: toc.getBoundingClientRect().top,
      position: getComputedStyle(toc).position,
      maxHeight: toc.clientHeight,
      scrollHeight: toc.scrollHeight,
      parentHeight: layout.getBoundingClientRect().height,
    };
  });
  assert.equal(before.position, "sticky");
  assert.ok(before.parentHeight > 900);
  assert.ok(before.scrollHeight > before.maxHeight);

  await page.evaluate(() => window.scrollTo(0, 1200));
  const afterScroll = await page.evaluate(() => {
    const toc = document.querySelector(
      ".rr-table-of-contents--desktop-rail",
    ) as HTMLElement;
    toc.scrollTop = 200;
    return { top: toc.getBoundingClientRect().top, scrollTop: toc.scrollTop };
  });
  assert.ok(Math.abs(afterScroll.top - 64) < 2);
  assert.equal(afterScroll.scrollTop, 200);
  await page.close();
});

test("docs TOC uses the layout sticky contract through scroll and navigation", async () => {
  const page = await openPage({ width: 1600, height: 900 });
  const initial = await page.$eval(
    ".rr-table-of-contents--desktop-rail",
    (toc) => ({
      top: toc.getBoundingClientRect().top,
      position: getComputedStyle(toc).position,
      stickyTop: getComputedStyle(toc).top,
      inlineStickyTop: (toc as HTMLElement).style.getPropertyValue(
        "--rr-toc-sticky-top",
      ),
    }),
  );
  assert.equal(initial.position, "sticky");
  assert.equal(initial.stickyTop, "64px");
  assert.equal(initial.inlineStickyTop, "");

  await page.evaluate(() => window.scrollTo(0, 1200));
  const afterHeaderLeavesViewport = await page.$eval(
    ".rr-table-of-contents--desktop-rail",
    (toc) => toc.getBoundingClientRect().top,
  );
  assert.ok(Math.abs(afterHeaderLeavesViewport - 64) < 2);

  await page.goto(`${baseUrl}/short`, { waitUntil: "load" });
  const afterNavigation = await page.$eval(
    ".rr-table-of-contents--desktop-rail",
    (toc) => ({
      top: toc.getBoundingClientRect().top,
      position: getComputedStyle(toc).position,
      stickyTop: getComputedStyle(toc).top,
      inlineStickyTop: (toc as HTMLElement).style.getPropertyValue(
        "--rr-toc-sticky-top",
      ),
      scrollY: window.scrollY,
    }),
  );
  assert.equal(afterNavigation.position, "sticky");
  assert.equal(afterNavigation.stickyTop, "64px");
  assert.equal(afterNavigation.inlineStickyTop, "");
  assert.equal(afterNavigation.scrollY, 0);
  assert.ok(afterNavigation.top > 64);
  await page.close();
});

test("starter and showcase TOCs use their Site layout contract", async () => {
  for (const path of ["/starter", "/showcase"]) {
    const page = await openPage({ width: 1280, height: 900 }, path);
    const initial = await page.$eval(
      ".rr-table-of-contents--desktop",
      (toc) => ({
        position: getComputedStyle(toc).position,
        stickyTop: getComputedStyle(toc).top,
        inlineStickyTop: (toc as HTMLElement).style.getPropertyValue(
          "--rr-toc-sticky-top",
        ),
      }),
    );
    assert.equal(initial.position, "sticky");
    assert.equal(initial.stickyTop, "24px");
    assert.equal(initial.inlineStickyTop, "");

    await page.evaluate(() => window.scrollTo(0, 1200));
    const afterScroll = await page.$eval(
      ".rr-table-of-contents--desktop",
      (toc) => ({
        top: toc.getBoundingClientRect().top,
        clientHeight: (toc as HTMLElement).clientHeight,
        scrollHeight: (toc as HTMLElement).scrollHeight,
      }),
    );
    assert.ok(Math.abs(afterScroll.top - 24) < 2);
    assert.ok(afterScroll.scrollHeight > afterScroll.clientHeight);
    await page.close();
  }
});

test("starter and showcase center the article rail independently of the TOC", async () => {
  for (const path of ["/starter", "/showcase"]) {
    for (const width of [1920, 1440, 1280]) {
      const page = await openPage({ width, height: 900 }, path);
      const layout = await page.evaluate(() => {
        const article = document.querySelector(".site-article") as HTMLElement;
        const body = document.querySelector(".rb-article-body") as HTMLElement;
        const toc = document.querySelector(
          ".rr-table-of-contents--desktop",
        ) as HTMLElement;
        const articleBox = article.getBoundingClientRect();
        const bodyBox = body.getBoundingClientRect();
        const tocBox = toc.getBoundingClientRect();
        return {
          articleCenter: articleBox.left + articleBox.width / 2,
          bodyCenter: bodyBox.left + bodyBox.width / 2,
          bodyRight: bodyBox.right,
          tocLeft: tocBox.left,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });
      assert.ok(Math.abs(layout.bodyCenter - layout.articleCenter) <= 2);
      assert.ok(layout.tocLeft >= layout.bodyRight);
      assert.ok(layout.scrollWidth <= layout.viewportWidth);
      await page.close();
    }
  }

  const withToc = await openPage({ width: 1440, height: 900 }, "/starter");
  const withoutToc = await openPage(
    { width: 1440, height: 900 },
    "/starter-without-toc",
  );
  const getBodyCenter = (page: Page) =>
    page.$eval(".rb-article-body", (body) => {
      const box = body.getBoundingClientRect();
      return box.left + box.width / 2;
    });
  assert.ok(
    Math.abs(
      (await getBodyCenter(withToc)) - (await getBodyCenter(withoutToc)),
    ) <= 2,
  );
  await withToc.close();
  await withoutToc.close();
});

test("starter uses a single centered article column below the TOC breakpoint", async () => {
  for (const width of [1024, 768, 375]) {
    const page = await openPage({ width, height: 900 }, "/starter");
    const layout = await page.evaluate(() => {
      const article = document.querySelector(".site-article") as HTMLElement;
      const body = document.querySelector(".rb-article-body") as HTMLElement;
      const aside = document.querySelector(
        ".site-article__aside",
      ) as HTMLElement;
      const articleBox = article.getBoundingClientRect();
      const bodyBox = body.getBoundingClientRect();
      return {
        articleCenter: articleBox.left + articleBox.width / 2,
        bodyCenter: bodyBox.left + bodyBox.width / 2,
        asideDisplay: getComputedStyle(aside).display,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    assert.ok(Math.abs(layout.bodyCenter - layout.articleCenter) <= 2);
    assert.equal(layout.asideDisplay, "none");
    assert.ok(layout.scrollWidth <= layout.viewportWidth);
    await page.close();
  }
});

test("mobile hides the desktop TOC rail", async () => {
  const page = await openPage({ width: 600, height: 900 });
  assert.equal(
    await page.$eval(
      ".rr-table-of-contents--desktop-rail",
      (element) => getComputedStyle(element).display,
    ),
    "none",
  );
  await page.close();
});
