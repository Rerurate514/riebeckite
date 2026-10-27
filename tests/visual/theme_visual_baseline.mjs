import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer";

const root = process.cwd();
const output = join(root, "tests/visual/baselines");
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH;
const themes = [
  ["riebeckite", "default"],
  ["minimal", "minimal"],
  ["gruvbox", "gruvbox"],
  ["rerurate", "rerurate"],
  ["sakura", "sakura"],
  ["tokyonight", "tokyonight"],
  ["garden", "garden"],
  ["editorial", "editorial"],
  ["technical", "technical"],
  ["folio", "folio"],
];
const cssFiles = [
  "packages/integrations/honox/style.css",
  ...themes.map(
    ([, directory]) => `packages/themes/${directory}/styles/theme.css`,
  ),
  "packages/plugins/navigation/style.css",
  "packages/plugins/search/style.css",
  "packages/plugins/toc/style.css",
  "packages/plugins/obsidian-markdown/style.css",
];
const css = (
  await Promise.all(
    cssFiles.map(async (file) => readFile(join(root, file), "utf8")),
  )
).join("\n");
const markup = `<!doctype html><html data-rb-theme="riebeckite" data-rb-mode="light" data-rb-layout="article"><head><meta charset="utf-8"><style>${css}\nbody{background:var(--rb-color-paper);color:var(--rb-color-ink);font-family:var(--rb-font-body);padding:2rem}.fixture{max-width:70rem;margin:auto}.rb-article-layout{margin-top:3rem}.rb-article-content{background:var(--rb-color-surface);padding:2rem;border:1px solid var(--rb-color-border)}.rb-table-scroll{overflow:auto}.fixture-caption{color:var(--rb-color-muted);font-size:.85rem}</style></head><body><div class="fixture"><nav class="rb-nav"><ul class="rb-nav__list"><li class="rb-nav__item"><a class="rb-nav__link rb-nav__link--active" href="#">Navigation</a></li><li class="rb-nav__item"><a class="rb-nav__link" href="#">Archive</a></li></ul></nav><div class="rr-search"><div class="rr-search-bar"><button class="rr-search-bar__trigger"><span class="rr-search-bar__icon">⌕</span><span class="rr-search-bar__label">Search notes</span><kbd class="rr-search-bar__key">⌘ K</kbd></button></div></div><main class="rb-article-layout"><aside class="rr-table-of-contents rr-table-of-contents--desktop"><p class="rr-table-of-contents__eyebrow">Contents</p><ol class="rr-table-of-contents__list"><li><a class="rr-table-of-contents__link" href="#type">Typography</a></li><li><a class="rr-table-of-contents__link" href="#code">Code</a></li></ol></aside><article class="rb-article-body"><div class="rb-article-content"><p class="fixture-caption">Theme fixture</p><h1 id="type">Typography and Markdown</h1><p>Readable body copy with <a href="#">a semantic link</a>, emphasis, and inline <code>settings</code>.</p><blockquote>Blockquotes use the theme accent token for a visible reading marker.</blockquote><div class="rr-callout" data-callout="note"><div class="rr-callout-title">Callout</div><p>A semantic note surface.</p></div><h2 id="code">Code block and table</h2><pre><code>const theme = defaultTheme({ colorMode: "dark" });</code></pre><div class="rb-table-scroll"><table><thead><tr><th>Token</th><th>Value</th></tr></thead><tbody><tr><td>Accent</td><td>Semantic</td></tr><tr><td>Surface</td><td>Adaptive</td></tr></tbody></table></div></div></article></main></div></body></html>`;
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  headless: true,
  ...(chrome ? { executablePath: chrome } : {}),
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const results = [];
try {
  await page.setContent(markup, { waitUntil: "load" });
  for (const [theme] of themes) {
    for (const mode of ["light", "dark"]) {
      await page.setViewport({
        width: 1440,
        height: 1200,
        deviceScaleFactor: 1,
      });
      await page.$eval(
        "html",
        (element, state) => {
          element.setAttribute("data-rb-theme", state.theme);
          element.setAttribute("data-rb-mode", state.mode);
        },
        { theme, mode },
      );
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const desktop = await page.evaluate(() => {
        const selectors = [
          "h1",
          ".rb-article-content p",
          "pre",
          "table",
          ".rr-callout",
          ".rb-nav__link",
          ".rr-table-of-contents__link",
          ".rr-search-bar__trigger",
        ];
        const styles = Object.fromEntries(
          selectors.map((selector) => {
            const element = document.querySelector(selector);
            const computed = element ? getComputedStyle(element) : null;
            return [
              selector,
              {
                present: Boolean(element),
                display: computed?.display,
                color: computed?.color,
                background: computed?.backgroundColor,
              },
            ];
          }),
        );
        return {
          styles,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          paper: getComputedStyle(document.documentElement)
            .getPropertyValue("--rb-color-paper")
            .trim(),
        };
      });
      for (const [selector, state] of Object.entries(desktop.styles)) {
        assert.ok(state.present, `${theme}/${mode}: ${selector} missing`);
        assert.notEqual(
          state.display,
          "none",
          `${theme}/${mode}: ${selector} hidden`,
        );
        assert.notEqual(
          state.color,
          "rgba(0, 0, 0, 0)",
          `${theme}/${mode}: ${selector} transparent`,
        );
      }
      assert.equal(
        desktop.overflow,
        false,
        `${theme}/${mode}: desktop overflow`,
      );
      await page.screenshot({
        path: join(output, `${theme}-${mode}.png`),
        fullPage: true,
      });
      await page.setViewport({ width: 375, height: 900, deviceScaleFactor: 1 });
      const mobile = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        bodyWidth: document.body.scrollWidth,
        viewport: window.innerWidth,
      }));
      assert.equal(mobile.overflow, false, `${theme}/${mode}: mobile overflow`);
      if (
        (theme === "riebeckite" && mode === "light") ||
        (theme === "tokyonight" && mode === "dark")
      )
        await page.screenshot({
          path: join(output, `${theme}-${mode}-mobile.png`),
          fullPage: true,
        });
      results.push({ theme, mode, paper: desktop.paper, mobile });
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
const rows = results
  .map(
    ({ theme, mode, paper, mobile }) =>
      `<tr><td>${theme}</td><td>${mode}</td><td><img src="${theme}-${mode}.png" alt="${theme} ${mode}"></td><td>${paper}</td><td>${mobile.viewport}px / overflow: ${mobile.overflow}</td></tr>`,
  )
  .join("\n");
const report = `<!doctype html><meta charset="utf-8"><title>Theme visual baseline</title><style>body{font:14px system-ui;margin:2rem;color:#182230}table{border-collapse:collapse;width:100%}td,th{padding:.75rem;border:1px solid #d7e0ea;text-align:left;vertical-align:top}img{max-width:360px;border:1px solid #aebdcc}code{background:#f1f5f9;padding:.1rem .25rem}</style><h1>Official theme visual baseline</h1><p><strong>Initial baseline — not a visual-regression comparison.</strong> Captured with Chrome 155 after rendering all ten official themes in explicit light and dark modes. The smoke fixture contains typography/markdown, code block, table, callout, navigation, TOC, and search. Each variant was also checked at 375px with no horizontal overflow; two representative mobile screenshots are included.</p><p>Visual regression remains pending an approved baseline and a subsequent comparison. This report records the reviewable source images, not a PASS for visual regression.</p><table><thead><tr><th>Theme</th><th>Mode</th><th>Desktop capture</th><th>Paper token</th><th>Responsive check</th></tr></thead><tbody>${rows}</tbody></table><h2>Representative mobile captures</h2><figure><img src="riebeckite-light-mobile.png" alt="Riebeckite light mobile"><figcaption>Riebeckite light</figcaption></figure><figure><img src="tokyonight-dark-mobile.png" alt="Tokyonight dark mobile"><figcaption>TokyoNight dark</figcaption></figure>`;
await writeFile(join(output, "report.html"), report);
console.log(
  JSON.stringify({ output, variants: results.length, errors }, null, 2),
);
