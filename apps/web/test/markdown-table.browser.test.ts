import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styles = [
  read("../app/styles/markdown.css"),
  read("../../../packages/themes/default/styles/theme.css"),
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

async function loadTable(
  page: Page,
  theme: "light" | "dark",
  width: number,
): Promise<void> {
  await page.setViewport({ width, height: 900 });
  await page.setContent(`<!doctype html>
    <html data-theme-name="riebeckite" data-theme="${theme}">
      <head><style>${styles}</style></head>
      <body>
        <article class="rb-article"><div class="rb-article-content">
          <div class="rb-table-scroll">
            <table>
              <thead><tr><th>Feature</th><th align="center">Status</th><th>Reference</th><th>Notes</th></tr></thead>
              <tbody><tr><td>Long technical feature name</td><td align="right">Ready</td><td><a href="#reference">A long-reference-link-for-the-documentation</a></td><td><code>const value = "document"</code><ul><li>Compatible</li><li>Scrollable</li></ul></td></tr></tbody>
            </table>
          </div>
        </div></article>
      </body>
    </html>`);
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [375, 1440]) {
    test(`markdown tables remain contained and readable in ${theme} mode at ${width}px`, async (t) => {
      if (!browser) return t.skip("puppeteer browser is unavailable");
      const page = await browser.newPage();
      try {
        await loadTable(page, theme, width);
        const result = await page.evaluate(() => {
          const wrapper =
            document.querySelector<HTMLElement>(".rb-table-scroll");
          const table = document.querySelector<HTMLTableElement>("table");
          const heading =
            document.querySelector<HTMLTableCellElement>("th[align]");
          const value =
            document.querySelector<HTMLTableCellElement>("td[align]");
          const link = document.querySelector<HTMLAnchorElement>("td a");
          const code = document.querySelector<HTMLElement>("td code");
          const list = document.querySelector<HTMLElement>("td ul");
          if (
            !wrapper ||
            !table ||
            !heading ||
            !value ||
            !link ||
            !code ||
            !list
          ) {
            throw new Error("table fixture is incomplete");
          }
          return {
            documentScrollWidth: document.documentElement.scrollWidth,
            wrapperScrolls: wrapper.scrollWidth > wrapper.clientWidth,
            tableWidth: table.getBoundingClientRect().width,
            wrapperWidth: wrapper.getBoundingClientRect().width,
            headingAlign: getComputedStyle(heading).textAlign,
            valueAlign: getComputedStyle(value).textAlign,
            headingBackground: getComputedStyle(heading).backgroundColor,
            linkColor: getComputedStyle(link).color,
            codeBackground: getComputedStyle(code).backgroundColor,
            listMarginBlockStart: getComputedStyle(list).marginBlockStart,
          };
        });
        assert.ok(result.documentScrollWidth <= width);
        assert.ok(result.tableWidth >= result.wrapperWidth);
        assert.ok(["center", "-webkit-center"].includes(result.headingAlign));
        assert.ok(["right", "-webkit-right"].includes(result.valueAlign));
        assert.notEqual(result.headingBackground, "rgba(0, 0, 0, 0)");
        assert.notEqual(result.linkColor, "rgba(0, 0, 0, 0)");
        assert.notEqual(result.codeBackground, "rgba(0, 0, 0, 0)");
        assert.equal(result.listMarginBlockStart, "0px");
        if (width === 375) assert.ok(result.wrapperScrolls);
      } finally {
        await page.close();
      }
    });
  }
}
