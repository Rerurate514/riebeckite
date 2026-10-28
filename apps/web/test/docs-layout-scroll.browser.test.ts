import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styles = [
  read("../../../packages/integrations/honox/style.css"),
  read("../app/styles/shell.css"),
  read("../app/components/article/style.css"),
  read("../../../packages/plugins/docs/style.css"),
  read("../../../packages/plugins/navigation/style.css"),
  read("../../../packages/plugins/toc/style.css"),
].join("\n");

let browser: Browser | null = null;

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => {
  await browser?.close();
});

function navigationItems(count: number, className: string) {
  return Array.from(
    { length: count },
    (_, index) =>
      `<li class="${className}"><a href="#section-${index}">Section ${index}</a></li>`,
  ).join("");
}

async function loadDocsPage(
  page: Page,
  width: number,
  theme: "light" | "dark" = "light",
): Promise<void> {
  await page.setViewport({ width, height: 900 });
  await page.setContent(`<!doctype html>
    <html data-rb-layout="article" data-rb-mode="${theme}">
      <head><style>:root {
        --rb-space-2: 1rem;
        --rb-space-1: 0.5rem;
        --rb-space-3: 1.5rem;
        --rb-space-4: 2rem;
        --rb-space-8: 4rem;
        --rb-rule-width: 1px;
        --rb-layout-page-max: 80rem;
        --rb-layout-article-max: 46rem;
        --rb-layout-sidebar: 15rem;
        --rb-layout-gap: 2.5rem;
        --rb-color-border: #d7e0ea;
        --rb-color-ink: #182230;
        --rb-color-muted: #58677a;
        --rb-color-surface: #fff;
      }</style><style>${styles}</style></head>
      <body class="riebeckite-page">
        <header class="rb-site-header">
          <a class="rb-site-header__home" href="/">
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="" width="28" height="28" />
            <span>Riebeckite</span>
          </a>
        </header>
        <main>
          <article class="rb-article">
            <div class="rb-article-layout">
              <aside class="rr-table-of-contents rr-table-of-contents--desktop-rail" aria-label="Contents">
                <p class="rr-table-of-contents__eyebrow">Contents</p>
                <ol class="rr-table-of-contents__list">${navigationItems(120, "rr-table-of-contents__item")}</ol>
              </aside>
              <div class="rb-docs-sidebar-rail"><nav class="rb-sidebar-navigation rb-docs-sidebar" aria-label="Documentation"><label class="rb-sidebar-navigation__search"><input type="search" /></label><ul class="rb-docs-sidebar__list">${navigationItems(120, "rb-docs-sidebar__item")}</ul></nav></div>
              <div class="rb-article-body"><div style="height: 300rem">Article</div></div>
            </div>
          </article>
        </main>
      </body>
    </html>`);
}

for (const theme of ["light", "dark"] as const) {
  test(`desktop docs rails align with the header boundary in ${theme} mode`, async (t) => {
    if (!browser) return t.skip("puppeteer browser is unavailable");
    const page = await browser.newPage();
    try {
      await loadDocsPage(page, 1600, theme);
      const initial = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(".rb-site-header");
        const docs = document.querySelector<HTMLElement>(
          ".rb-docs-sidebar-rail",
        );
        const toc = document.querySelector<HTMLElement>(
          ".rr-table-of-contents--desktop-rail",
        );
        const tocEyebrow = document.querySelector<HTMLElement>(
          ".rr-table-of-contents__eyebrow",
        );
        if (!header || !docs || !toc || !tocEyebrow)
          throw new Error("docs fixture is incomplete");
        return {
          headerBottom: header.getBoundingClientRect().bottom,
          docsTop: docs.getBoundingClientRect().top,
          tocTop: toc.getBoundingClientRect().top,
          tocEyebrowTop: tocEyebrow.getBoundingClientRect().top,
          docsStickyTop: Number.parseFloat(getComputedStyle(docs).top),
          tocStickyTop: Number.parseFloat(getComputedStyle(toc).top),
          docsScrollable: docs.scrollHeight > docs.clientHeight,
          docsPaddingEnd: Number.parseFloat(
            getComputedStyle(docs).paddingRight,
          ),
          filterTop: document
            .querySelector<HTMLElement>(".rb-sidebar-navigation__search")
            ?.getBoundingClientRect().top,
          tocScrollable: toc.scrollHeight > toc.clientHeight,
        };
      });
      assert.ok(Math.abs(initial.docsTop - initial.headerBottom) <= 0.5);
      assert.ok(Math.abs(initial.tocTop - initial.headerBottom) <= 0.5);
      assert.ok(Math.abs(initial.docsTop - initial.docsStickyTop) <= 0.5);
      assert.ok(Math.abs(initial.tocTop - initial.tocStickyTop) <= 0.5);
      assert.ok(Math.abs(initial.tocEyebrowTop - initial.tocTop) <= 1);
      assert.ok(initial.docsScrollable);
      assert.equal(initial.docsPaddingEnd, 16);
      assert.equal(initial.filterTop, initial.docsTop);
      assert.ok(initial.tocScrollable);

      await page.evaluate(() => window.scrollTo(0, 1));
      const onePixel = await page.evaluate(() => {
        const docs = document.querySelector<HTMLElement>(
          ".rb-docs-sidebar-rail",
        );
        const toc = document.querySelector<HTMLElement>(
          ".rr-table-of-contents--desktop-rail",
        );
        if (!docs || !toc) throw new Error("docs fixture is incomplete");
        return {
          docsTop: docs.getBoundingClientRect().top,
          tocTop: toc.getBoundingClientRect().top,
          docsStickyTop: Number.parseFloat(getComputedStyle(docs).top),
          tocStickyTop: Number.parseFloat(getComputedStyle(toc).top),
        };
      });
      assert.ok(Math.abs(onePixel.docsTop - onePixel.docsStickyTop) <= 0.5);
      assert.ok(Math.abs(onePixel.tocTop - onePixel.tocStickyTop) <= 0.5);
      assert.ok(Math.abs(onePixel.docsTop - initial.docsTop) <= 0.5);
      assert.ok(Math.abs(onePixel.tocTop - initial.tocTop) <= 0.5);

      await page.evaluate(() => window.scrollTo(0, 1200));
      const sticky = await page.evaluate(() => {
        const header = document.querySelector<HTMLElement>(".rb-site-header");
        const docs = document.querySelector<HTMLElement>(
          ".rb-docs-sidebar-rail",
        );
        const toc = document.querySelector<HTMLElement>(
          ".rr-table-of-contents--desktop-rail",
        );
        if (!header || !docs || !toc)
          throw new Error("docs fixture is incomplete");
        docs.scrollTop = 200;
        toc.scrollTop = 200;
        return {
          docsTop: docs.getBoundingClientRect().top,
          tocTop: toc.getBoundingClientRect().top,
          headerBottom: header.getBoundingClientRect().bottom,
          stickyTop: Number.parseFloat(getComputedStyle(docs).top),
          docsScrollTop: docs.scrollTop,
          filterTop: document
            .querySelector<HTMLElement>(".rb-sidebar-navigation__search")
            ?.getBoundingClientRect().top,
          tocScrollTop: toc.scrollTop,
        };
      });
      assert.ok(Math.abs(sticky.docsTop - sticky.stickyTop) <= 1);
      assert.ok(Math.abs(sticky.tocTop - sticky.stickyTop) <= 1);
      assert.ok(sticky.headerBottom < 0);
      assert.equal(sticky.docsScrollTop, 200);
      assert.equal(sticky.filterTop, sticky.docsTop);
      assert.equal(sticky.tocScrollTop, 200);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const atPageEnd = await page.evaluate(() => {
        const docs = document.querySelector<HTMLElement>(
          ".rb-docs-sidebar-rail",
        );
        const toc = document.querySelector<HTMLElement>(
          ".rr-table-of-contents--desktop-rail",
        );
        if (!docs || !toc) throw new Error("docs fixture is incomplete");
        return {
          docsTop: docs.getBoundingClientRect().top,
          tocTop: toc.getBoundingClientRect().top,
        };
      });
      assert.ok(Math.abs(atPageEnd.docsTop - atPageEnd.tocTop) <= 1);
    } finally {
      await page.close();
    }
  });
}

test("tablet and mobile keep docs rails out of desktop sticky positioning", async (t) => {
  if (!browser) return t.skip("puppeteer browser is unavailable");
  const page = await browser.newPage();
  try {
    for (const width of [1024, 375]) {
      await loadDocsPage(page, width);
      const layout = await page.evaluate(() => {
        const docs = document.querySelector<HTMLElement>(
          ".rb-docs-sidebar-rail",
        );
        const toc = document.querySelector<HTMLElement>(
          ".rr-table-of-contents--desktop-rail",
        );
        if (!docs || !toc) throw new Error("docs fixture is incomplete");
        return {
          docsDisplay: getComputedStyle(docs).display,
          docsPosition: getComputedStyle(docs).position,
          tocDisplay: getComputedStyle(toc).display,
          tocPosition: getComputedStyle(toc).position,
        };
      });
      assert.notEqual(layout.docsPosition, "sticky");
      assert.notEqual(layout.tocPosition, "sticky");
      if (width < 768) {
        assert.equal(layout.docsDisplay, "none");
        assert.equal(layout.tocDisplay, "none");
      } else {
        assert.notEqual(layout.docsDisplay, "none");
        assert.equal(layout.tocDisplay, "flex");
      }
    }
  } finally {
    await page.close();
  }
});
