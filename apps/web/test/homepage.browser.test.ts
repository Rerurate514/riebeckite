import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import HomePage from "../app/components/home/home";

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

const styles = [
  read("../app/components/home/style.css"),
  read("../../../packages/themes/default/styles/theme.css"),
  read("../../../packages/plugins/code-enhance/style.css"),
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

async function loadHome(
  page: Page,
  theme: "light" | "dark",
  width: number,
): Promise<void> {
  await page.setViewport({ width, height: 900 });
  await page.setContent(`<!doctype html>
    <html data-theme-name="riebeckite" data-theme="${theme}">
      <head><style>${styles}</style></head>
      <body>
        ${renderToString(HomePage({ locale: "en" }))}
        <article class="rb-article"><div class="rb-article-content">
          <pre><code>const article = "code";</code></pre>
          <div class="rr-code"><div class="rr-code__body"><pre class="rr-code__pre"><code class="rr-code__code"><span style="--shiki-dark: #b8dcff">const plugin = "code";</span></code></pre></div><button class="rr-code__action">Copy</button></div>
        </div></article>
      </body>
    </html>`);
}

function contrastRatio(
  [red, green, blue]: number[],
  [backgroundRed, backgroundGreen, backgroundBlue]: number[],
): number {
  const luminance = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const foreground =
    0.2126 * luminance(red) +
    0.7152 * luminance(green) +
    0.0722 * luminance(blue);
  const background =
    0.2126 * luminance(backgroundRed) +
    0.7152 * luminance(backgroundGreen) +
    0.0722 * luminance(backgroundBlue);
  return (
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05)
  );
}

function rgb(value: string): number[] {
  return [...value.matchAll(/\d+(?:\.\d+)?/g)].map(Number).slice(0, 3);
}

for (const theme of ["light", "dark"] as const) {
  test(`homepage ${theme} mode keeps code, controls, and section copy readable`, async (t) => {
    if (!browser) return t.skip("puppeteer browser is unavailable");
    const page = await browser.newPage();
    try {
      await loadHome(page, theme, 1440);
      const styles = await page.evaluate(() => {
        const code = document.querySelector<HTMLElement>(
          ".rb-home__code-window code",
        );
        const window = document.querySelector<HTMLElement>(
          ".rb-home__code-window",
        );
        const copy = document.querySelector<HTMLElement>(
          ".rb-home__code-window button",
        );
        const configuration = document.querySelector<HTMLElement>(
          ".rb-home__configuration",
        );
        const heading = document.querySelector<HTMLElement>(
          ".rb-home__configuration h2",
        );
        const article = document.querySelector<HTMLElement>(
          ".rb-article-content > pre",
        );
        const plugin = document.querySelector<HTMLElement>(".rr-code");
        const pluginCode = document.querySelector<HTMLElement>(
          ".rr-code__code span",
        );
        if (
          !code ||
          !window ||
          !copy ||
          !configuration ||
          !heading ||
          !article ||
          !plugin ||
          !pluginCode
        ) {
          throw new Error("homepage color test fixture is incomplete");
        }
        const logo = document.querySelector<HTMLImageElement>(".rb-home__logo");
        return {
          selectedColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--rb-color-selected")
            .trim(),
          codeBackground: getComputedStyle(window).backgroundColor,
          codeColor: getComputedStyle(code).color,
          copyColor: getComputedStyle(copy).color,
          configurationBackground:
            getComputedStyle(configuration).backgroundColor,
          headingColor: getComputedStyle(heading).color,
          articleBackground: getComputedStyle(article).backgroundColor,
          articleColor: getComputedStyle(article).color,
          pluginBackground: getComputedStyle(plugin).backgroundColor,
          pluginColor: getComputedStyle(pluginCode).color,
          logo: logo
            ? { alt: logo.alt, width: logo.getBoundingClientRect().width }
            : null,
        };
      });
      const expected =
        theme === "light"
          ? {
              codeBackground: "rgb(23, 48, 77)",
              codeColor: "rgb(232, 241, 255)",
              selectedColor: "#bfdbfe",
              configurationBackground: "rgb(237, 243, 250)",
              headingColor: "rgb(24, 34, 48)",
            }
          : {
              codeBackground: "rgb(17, 24, 32)",
              codeColor: "rgb(230, 238, 248)",
              selectedColor: "#24558e",
              configurationBackground: "rgb(41, 53, 67)",
              headingColor: "rgb(237, 242, 248)",
            };

      assert.equal(styles.codeBackground, expected.codeBackground);
      assert.equal(styles.codeColor, expected.codeColor);
      assert.equal(styles.selectedColor, expected.selectedColor);
      assert.equal(styles.copyColor, expected.codeColor);
      assert.equal(
        styles.configurationBackground,
        expected.configurationBackground,
      );
      assert.equal(styles.headingColor, expected.headingColor);
      assert.equal(styles.articleBackground, expected.codeBackground);
      assert.equal(styles.articleColor, expected.codeColor);
      assert.equal(styles.pluginBackground, expected.codeBackground);
      assert.equal(styles.pluginColor, "rgb(184, 220, 255)");
      assert.deepEqual(styles.logo?.alt, "Riebeckite");
      assert.ok((styles.logo?.width ?? 0) > 0);
      assert.ok(
        contrastRatio(rgb(styles.codeColor), rgb(styles.codeBackground)) >= 4.5,
      );
      assert.ok(
        contrastRatio(rgb(styles.pluginColor), rgb(styles.pluginBackground)) >=
          4.5,
      );
    } finally {
      await page.close();
    }
  });
}

for (const width of [1440, 390]) {
  test(`homepage avoids horizontal overflow at ${width}px`, async (t) => {
    if (!browser) return t.skip("puppeteer browser is unavailable");
    const page = await browser.newPage();
    try {
      await loadHome(page, "light", width);
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      assert.ok(scrollWidth <= width);
    } finally {
      await page.close();
    }
  });
}
