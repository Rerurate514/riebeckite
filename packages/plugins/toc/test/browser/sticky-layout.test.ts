import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import puppeteer, { type Browser, type Page } from "puppeteer";

let server: Server;
let browser: Browser;
let baseUrl = "";

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
  const starterStyle = readFileSync(
    new URL(
      "../../../../create-riebeckite/templates/scaffold/presets/starter/app/style.css",
      import.meta.url,
    ),
    "utf8",
  );
  const showcaseStyle = readFileSync(
    new URL(
      "../../../../create-riebeckite/templates/scaffold/presets/showcase/app/style.css",
      import.meta.url,
    ),
    "utf8",
  );
  const renderDocsPage = (articleHeight: string, itemCount = 80) =>
    `<!doctype html><html data-article-layout="article"><head><style>:root { --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-layout-sidebar: 14rem; --rb-layout-gap: 2rem; --rb-docs-sticky-top: 4rem; --rb-space-2: 1rem; --rb-space-4: 2rem; --rb-space-6: 3rem; --rb-color-muted: #555; --rb-color-ink: #111; }</style><style>${tocStyle}</style><style>${honoxStyle}</style><style>${articleStyle}</style></head><body><header style="height: 7rem">Header</header><article class="rb-article"><div class="rb-article-layout"><aside class="rr-table-of-contents rr-table-of-contents--desktop"><ol class="rr-table-of-contents__list">${sampleToc(itemCount)}</ol></aside><div class="rb-article-body"><div style="height: ${articleHeight}">Article</div></div></div></article></body></html>`;
  const renderSitePage = (siteStyle: string) =>
    `<!doctype html><html><head><style>:root { --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-layout-sidebar: 14rem; --rb-layout-gap: 2rem; --rb-space-2: 1rem; --rb-space-3: 1.5rem; --rb-space-4: 2rem; --rb-color-muted: #555; --rb-color-ink: #111; --rb-color-border: #ddd; }</style><style>${tocStyle}</style><style>${siteStyle}</style></head><body class="riebeckite-page"><header class="site-header">Header</header><main class="riebeckite-main"><article class="site-article"><div class="site-article__layout"><div class="rb-article-body"><div style="height: 240rem">Article</div></div><aside class="site-article__aside"><aside class="rr-table-of-contents rr-table-of-contents--desktop"><ol class="rr-table-of-contents__list">${sampleToc()}</ol></aside></aside></div></article></main></body></html>`;
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
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
});

after(async () => {
  await browser?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
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
      ".rr-table-of-contents--desktop",
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
      ".rr-table-of-contents--desktop",
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
  const initial = await page.$eval(".rr-table-of-contents--desktop", (toc) => ({
    top: toc.getBoundingClientRect().top,
    position: getComputedStyle(toc).position,
    stickyTop: getComputedStyle(toc).top,
    inlineStickyTop: (toc as HTMLElement).style.getPropertyValue(
      "--rr-toc-sticky-top",
    ),
  }));
  assert.equal(initial.position, "sticky");
  assert.equal(initial.stickyTop, "64px");
  assert.equal(initial.inlineStickyTop, "");

  await page.evaluate(() => window.scrollTo(0, 1200));
  const afterHeaderLeavesViewport = await page.$eval(
    ".rr-table-of-contents--desktop",
    (toc) => toc.getBoundingClientRect().top,
  );
  assert.ok(Math.abs(afterHeaderLeavesViewport - 64) < 2);

  await page.goto(`${baseUrl}/short`, { waitUntil: "load" });
  const afterNavigation = await page.$eval(
    ".rr-table-of-contents--desktop",
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
    const page = await openPage({ width: 1200, height: 900 }, path);
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

test("mobile hides the desktop TOC rail", async () => {
  const page = await openPage({ width: 600, height: 900 });
  assert.equal(
    await page.$eval(
      ".rr-table-of-contents--desktop",
      (element) => getComputedStyle(element).display,
    ),
    "none",
  );
  await page.close();
});
