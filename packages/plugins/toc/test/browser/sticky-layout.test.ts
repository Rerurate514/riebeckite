import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import puppeteer, { type Browser, type Page } from "puppeteer";

let server: Server;
let browser: Browser;
let baseUrl = "";

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
  const tocItems = Array.from(
    { length: 80 },
    (_, index) =>
      `<li><a class="rr-table-of-contents__link" href="#section-${index}">Section ${index}</a></li>`,
  ).join("");
  const html = `<!doctype html><html data-article-layout="article"><head><style>:root { --rb-layout-page-max: 80rem; --rb-layout-article-max: 48rem; --rb-layout-sidebar: 14rem; --rb-layout-gap: 2rem; --rb-docs-sticky-top: 4rem; --rb-space-2: 1rem; --rb-space-4: 2rem; --rb-space-6: 3rem; --rb-color-muted: #555; --rb-color-ink: #111; }</style><style>${tocStyle}</style><style>${honoxStyle}</style><style>${articleStyle}</style></head><body><article class="rb-article"><div class="rb-article-layout"><aside class="rr-table-of-contents rr-table-of-contents--desktop"><ol class="rr-table-of-contents__list">${tocItems}</ol></aside><div class="rb-article-body"><div style="height: 240rem">Long article</div></div></div></article></body></html>`;
  server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
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

async function openPage(viewport: {
  width: number;
  height: number;
}): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(baseUrl, { waitUntil: "load" });
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
