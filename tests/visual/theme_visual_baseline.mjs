import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";

const root = process.cwd();
const baselineDir = join(root, "tests/visual/baselines");
const reportDir = join(root, "tests/visual/report");
const actualDir = join(reportDir, "actual");
const diffDir = join(reportDir, "diff");
const update =
  process.argv.includes("--update") ||
  process.env.UPDATE_VISUAL_BASELINES === "1";
const expectedChromeVersion = "155.0.8059.79";
const chrome = process.env.PUPPETEER_EXECUTABLE_PATH;
const currentPlatform = `${platform()}-${arch()}`;
const desktopViewport = { width: 1440, height: 1200 };
const mobileViewport = { width: 375, height: 900 };
const deviceScaleFactor = 1;
const pixelThreshold = 8;
const maxChangedRatio = 0.0005;
const mobileCaptureKeys = new Set([
  "riebeckite-light",
  "tokyonight-dark",
  "signal-light",
  "signal-dark",
  "fieldnotes-light",
  "fieldnotes-dark",
  "terminal-light",
  "terminal-dark",
]);
const themes = [
  ["riebeckite", "default"],
  ["minimal", "minimal"],
  ["module", "module"],
  ["signal", "signal"],
  ["gruvbox", "gruvbox"],
  ["rerurate", "rerurate"],
  ["sakura", "sakura"],
  ["tokyonight", "tokyonight"],
  ["garden", "garden"],
  ["fieldnotes", "fieldnotes"],
  ["editorial", "editorial"],
  ["technical", "technical"],
  ["terminal", "terminal"],
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
const desktopCaptures = themes.flatMap(([theme]) =>
  ["light", "dark"].map((mode) => ({
    name: `${theme}-${mode}.png`,
    theme,
    mode,
    viewport: "desktop",
  })),
);
const mobileCaptures = [...mobileCaptureKeys].map((key) => {
  const [theme, mode] = key.split("-");
  return {
    name: `${key}-mobile.png`,
    theme,
    mode,
    viewport: "mobile",
  };
});
const captures = [...desktopCaptures, ...mobileCaptures];

if (!chrome) {
  throw new Error(
    "PUPPETEER_EXECUTABLE_PATH must point to Chrome 155.0.8059.79",
  );
}

const fontUrlPattern = /url\((["']?)\.\/fonts\/([^"')]+)\1\)/g;
const css = (
  await Promise.all(
    cssFiles.map(async (file) => {
      let text = await readFile(join(root, file), "utf8");
      for (const match of text.matchAll(fontUrlPattern)) {
        const font = await readFile(
          join(root, dirname(file), "fonts", match[2]),
        );
        text = text.replaceAll(
          match[0],
          `url("data:font/woff2;base64,${font.toString("base64")}")`,
        );
      }
      return text;
    }),
  )
).join("\n");
const markup = `<!doctype html><html data-rb-theme="riebeckite" data-rb-mode="light" data-rb-layout="article"><head><meta charset="utf-8"><style>${css}\n*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}body{background:var(--rb-color-paper);color:var(--rb-color-ink);font-family:var(--rb-font-body);padding:2rem}.fixture{max-width:70rem;margin:auto}.rb-article-layout{margin-top:3rem}.rb-article-content{background:var(--rb-color-surface);padding:2rem;border:1px solid var(--rb-color-border)}.rb-table-scroll{overflow:auto}.fixture-caption{color:var(--rb-color-ink);font-size:.85rem}</style></head><body><div class="fixture"><nav class="rb-nav"><ul class="rb-nav__list"><li class="rb-nav__item"><a class="rb-nav__link rb-nav__link--active" href="#">Navigation</a></li><li class="rb-nav__item"><a class="rb-nav__link" href="#">Archive</a></li></ul></nav><div class="rr-search"><div class="rr-search-bar"><button class="rr-search-bar__trigger"><span class="rr-search-bar__icon">⌕</span><span class="rr-search-bar__label">Search notes</span><kbd class="rr-search-bar__key">⌘ K</kbd></button></div></div><main class="rb-article-layout"><aside class="rr-table-of-contents rr-table-of-contents--desktop"><p class="rr-table-of-contents__eyebrow">Contents</p><ol class="rr-table-of-contents__list"><li><a class="rr-table-of-contents__link" href="#type">Typography</a></li><li><a class="rr-table-of-contents__link" href="#code">Code</a></li></ol></aside><article class="rb-article-body"><div class="rb-article-content"><p class="fixture-caption">Theme fixture</p><h1 id="type">Typography and Markdown</h1><p>Readable body copy with <a href="#">a semantic link</a>, emphasis, and inline <code>settings</code>.</p><blockquote>Blockquotes use the theme accent token for a visible reading marker.</blockquote><div class="rr-callout" data-callout="note"><div class="rr-callout__title">Callout</div><p>A semantic note surface.</p></div><h2 id="code">Code block and table</h2><pre><code>const theme = defaultTheme({ colorMode: "dark" });</code></pre><div class="rb-table-scroll"><table><thead><tr><th>Token</th><th>Value</th></tr></thead><tbody><tr><td>Accent</td><td>Semantic</td></tr><tr><td>Surface</td><td>Adaptive</td></tr></tbody></table></div></div></article></main></div></body></html>`;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function readManifest() {
  return readFile(join(baselineDir, "manifest.json"), "utf8").then(
    (content) => JSON.parse(content),
    () => null,
  );
}

function validateManifest(manifest, browserVersion) {
  assert.equal(manifest.format, 1, "baseline manifest format");
  assert.equal(
    manifest.chromeVersion,
    browserVersion,
    `baseline Chrome ${manifest.chromeVersion} does not match ${browserVersion}`,
  );
  assert.equal(
    manifest.platform,
    currentPlatform,
    `baseline platform ${manifest.platform} does not match ${currentPlatform}`,
  );
  assert.deepEqual(manifest.desktopViewport, desktopViewport);
  assert.deepEqual(manifest.mobileViewport, mobileViewport);
  assert.equal(manifest.deviceScaleFactor, deviceScaleFactor);
  assert.equal(manifest.timezone, "UTC");
  assert.equal(manifest.locale, "en-US");
  assert.equal(manifest.reducedMotion, "reduce");
  assert.equal(manifest.fonts, "embedded");
  assert.deepEqual(
    Object.keys(manifest.screenshots).sort(),
    captures.map((capture) => capture.name).sort(),
    "baseline image set",
  );
}

async function validateBaselineHashes(manifest) {
  for (const [name, entry] of Object.entries(manifest.screenshots)) {
    const buffer = await readFile(join(baselineDir, name));
    assert.equal(
      sha256(buffer),
      entry.sha256,
      `baseline image is corrupted: ${name}`,
    );
  }
}

function captureChecks() {
  const parseColor = (value) => {
    const rgb = value.match(/^rgba?\(([^)]+)\)$/);
    if (rgb) {
      const parts = rgb[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    }
    const srgb = value.match(/^color\(srgb\s+([^)]+)\)$/);
    if (srgb) {
      const parts = srgb[1]
        .split(/[\s/]+/)
        .filter(Boolean)
        .map(Number);
      return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1];
    }
    return [0, 0, 0, 0];
  };
  const effectiveBackground = (element) => {
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const background = parseColor(getComputedStyle(node).backgroundColor);
      if (background[3] > 0) layers.push(background);
    }
    let result = [255, 255, 255];
    for (const [red, green, blue, alpha] of layers.reverse()) {
      result = [
        red * alpha + result[0] * (1 - alpha),
        green * alpha + result[1] * (1 - alpha),
        blue * alpha + result[2] * (1 - alpha),
      ];
    }
    return result;
  };
  const luminance = ([red, green, blue]) => {
    const channel = (value) => {
      value /= 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    );
  };
  const contrast = (foreground, background) => {
    const first = luminance(foreground);
    const second = luminance(background);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };
  const visible = (element) =>
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden";
  const rect = (selector) => {
    const element = document.querySelector(selector);
    if (!element || !visible(element)) return null;
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      top: bounds.top,
      right: bounds.right,
      bottom: bounds.bottom,
    };
  };
  const overlap = (first, second) => {
    if (!first || !second) return 0;
    const width = Math.max(
      0,
      Math.min(first.right, second.right) - Math.max(first.left, second.left),
    );
    const height = Math.max(
      0,
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
    );
    return Math.round(width * height);
  };
  const textSelectors = [
    "h1",
    "p",
    "a",
    "code",
    "pre",
    "th",
    "td",
    "blockquote",
    ".rr-callout__title",
    ".rb-nav__link",
    ".rr-table-of-contents__link",
    ".rr-search-bar__label",
    ".rr-search-bar__key",
  ];
  const text = [...document.querySelectorAll(textSelectors.join(","))]
    .filter(visible)
    .map((element) => {
      const style = getComputedStyle(element);
      const foreground = parseColor(style.color).slice(0, 3);
      const background = effectiveBackground(element);
      return {
        selector: element.className || element.tagName,
        text: (element.textContent || "").trim().slice(0, 32),
        contrast: Number(contrast(foreground, background).toFixed(2)),
        fontSize: style.fontSize,
      };
    });
  const lowContrast = text.filter((entry) => entry.contrast < 4.5);
  const toc = document.querySelector(".rr-table-of-contents--desktop");
  const article = rect(".rb-article-content");
  const probe = document.createElement("div");
  probe.className = "rb-article-content";
  probe.style.cssText =
    "position:absolute;visibility:hidden;width:20rem;pointer-events:none";
  probe.innerHTML =
    '<div class="rr-callout" data-callout="note"><div class="rr-callout__title">Callout</div><div class="rr-callout__content"><p>A semantic note surface.</p></div></div><div class="rb-table-scroll"><table><tbody><tr><td>Token</td></tr></tbody></table></div>';
  document.body.append(probe);
  const probeCallout = probe.querySelector(".rr-callout");
  const probeTable = probe.querySelector(".rb-table-scroll");
  const probeTitle = probe.querySelector(".rr-callout__title");
  const probeContent = probe.querySelector(".rr-callout__content");
  const calloutBounds = probeCallout?.getBoundingClientRect();
  const tableBounds = probeTable?.getBoundingClientRect();
  const titleBounds = probeTitle?.getBoundingClientRect();
  const contentBounds = probeContent?.getBoundingClientRect();
  const calloutTableGap =
    calloutBounds && tableBounds ? tableBounds.top - calloutBounds.bottom : 0;
  const calloutTextInset =
    calloutBounds && titleBounds && contentBounds
      ? Math.min(titleBounds.left, contentBounds.left) - calloutBounds.left
      : 0;
  probe.remove();
  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    tocDisplay: toc ? getComputedStyle(toc).display : "missing",
    navSearchOverlap: overlap(
      rect(".rb-nav__link"),
      rect(".rr-search-bar__trigger"),
    ),
    tocArticleOverlap: overlap(rect(".rr-table-of-contents--desktop"), article),
    articleWithinViewport: article ? article.right <= window.innerWidth : false,
    calloutTableGap,
    calloutTextInset,
    lowContrast,
    paper: getComputedStyle(document.documentElement)
      .getPropertyValue("--rb-color-paper")
      .trim(),
  };
}

async function capture(page, capture, viewport) {
  await page.bringToFront();
  await page.setViewport({ ...viewport, deviceScaleFactor });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: capture.mode },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.$eval(
    "html",
    (element, state) => {
      element.setAttribute("data-rb-theme", state.theme);
      element.setAttribute("data-rb-mode", state.mode);
    },
    capture,
  );
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const checks = await page.evaluate(captureChecks);
  const fonts = await page.evaluate(() => ({
    status: document.fonts.status,
    families: [...document.fonts]
      .filter((font) => font.status === "loaded")
      .map((font) => font.family),
  }));
  await page.screenshot({
    path: join(actualDir, capture.name),
    fullPage: true,
  });
  return { checks, fonts };
}

async function compare(comparePage, name, baseline, actual) {
  const result = await comparePage.evaluate(
    async ({ baseline, actual, threshold }) => {
      const load = (data) =>
        new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = `data:image/png;base64,${data}`;
        });
      const [baselineImage, actualImage] = await Promise.all([
        load(baseline),
        load(actual),
      ]);
      const width = Math.max(
        baselineImage.naturalWidth,
        actualImage.naturalWidth,
      );
      const height = Math.max(
        baselineImage.naturalHeight,
        actualImage.naturalHeight,
      );
      const baselineCanvas = document.createElement("canvas");
      baselineCanvas.width = width;
      baselineCanvas.height = height;
      const actualCanvas = document.createElement("canvas");
      actualCanvas.width = width;
      actualCanvas.height = height;
      const baselineContext = baselineCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      const actualContext = actualCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      baselineContext.drawImage(baselineImage, 0, 0);
      actualContext.drawImage(actualImage, 0, 0);
      const baselineData = baselineContext.getImageData(
        0,
        0,
        width,
        height,
      ).data;
      const actualData = actualContext.getImageData(0, 0, width, height).data;
      const dimensionsMatch =
        baselineImage.naturalWidth === actualImage.naturalWidth &&
        baselineImage.naturalHeight === actualImage.naturalHeight;
      const diffCanvas = document.createElement("canvas");
      diffCanvas.width = width;
      diffCanvas.height = height;
      const diffContext = diffCanvas.getContext("2d");
      const diffData = diffContext.createImageData(width, height);
      let changedPixels = 0;
      for (let index = 0; index < baselineData.length; index += 4) {
        const delta = Math.max(
          Math.abs(baselineData[index] - actualData[index]),
          Math.abs(baselineData[index + 1] - actualData[index + 1]),
          Math.abs(baselineData[index + 2] - actualData[index + 2]),
          Math.abs(baselineData[index + 3] - actualData[index + 3]),
        );
        if (delta > threshold) changedPixels += 1;
        if (delta > threshold) {
          diffData.data[index] = 255;
          diffData.data[index + 1] = 0;
          diffData.data[index + 2] = 0;
          diffData.data[index + 3] = 255;
        } else {
          const gray = Math.round(
            (actualData[index] * 0.299 +
              actualData[index + 1] * 0.587 +
              actualData[index + 2] * 0.114) *
              0.35,
          );
          diffData.data[index] = gray;
          diffData.data[index + 1] = gray;
          diffData.data[index + 2] = gray;
          diffData.data[index + 3] = 255;
        }
      }
      diffContext.putImageData(diffData, 0, 0);
      return {
        width,
        height,
        dimensionsMatch,
        changedPixels,
        changedRatio: changedPixels / (width * height),
        diff: diffCanvas.toDataURL("image/png").split(",")[1],
      };
    },
    {
      baseline: baseline.toString("base64"),
      actual: actual.toString("base64"),
      threshold: pixelThreshold,
    },
  );
  await writeFile(join(diffDir, name), Buffer.from(result.diff, "base64"));
  return result;
}

function baselineReport(results, browserVersion) {
  const rows = results
    .map(
      (result) =>
        `<tr><td>${escapeHtml(result.theme)}</td><td>${result.mode}</td><td><img src="${result.name}" alt="${escapeHtml(result.theme)} ${result.mode}"></td><td>${escapeHtml(result.paper || "missing")}</td><td>${result.mobile.checks.overflow ? "overflow" : "no overflow"}</td></tr>`,
    )
    .join("\n");
  const mobile = mobileCaptures
    .map(
      (capture) =>
        `<figure><img src="${capture.name}" alt="${capture.theme} ${capture.mode} mobile"><figcaption>${capture.theme} ${capture.mode}</figcaption></figure>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Theme visual baseline</title><style>body{font:14px system-ui;margin:2rem;color:#182230;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{padding:.75rem;border:1px solid #d7e0ea;text-align:left;vertical-align:top}img{max-width:360px;border:1px solid #aebdcc}figure{display:inline-block;margin:1rem;vertical-align:top}code{background:#f1f5f9;padding:.1rem .25rem}</style><h1>Official theme visual baseline</h1><p><strong>Human visual approval: pending.</strong> This page is the reviewable initial baseline, not a PASS for visual quality. Automated comparison only detects later changes.</p><p>Captured with ${escapeHtml(browserVersion)} on ${escapeHtml(currentPlatform)}. Viewports: 1440×1200 desktop and 375×900 mobile, device scale factor ${deviceScaleFactor}. Timezone UTC, locale en-US, reduced motion, animations and transitions disabled, theme fonts embedded.</p><p>Each desktop image covers typography, links, inline code, blockquote, callout, bare code block, table, navigation, search, and TOC. TOC is expected to be hidden at 375px; all variants were checked for horizontal overflow and control overlap.</p><table><thead><tr><th>Theme</th><th>Mode</th><th>Desktop capture</th><th>Paper token</th><th>Mobile check</th></tr></thead><tbody>${rows}</tbody></table><h2>Representative mobile captures</h2>${mobile}`;
}

function comparisonReport(results, comparisons, browserVersion, manifest) {
  const changed = comparisons.filter((entry) => entry.status !== "ok");
  const rows = comparisons
    .map(
      (entry) =>
        `<tr class="${entry.status}"><td>${escapeHtml(entry.theme)}</td><td>${entry.mode}</td><td>${entry.viewport}</td><td>${entry.status}</td><td>${entry.changedPixels} / ${(entry.changedRatio * 100).toFixed(4)}%</td><td><a href="../baselines/${entry.name}"><img src="../baselines/${entry.name}" alt="baseline"></a></td><td><img src="actual/${entry.name}" alt="current"></td><td><img src="diff/${entry.name}" alt="diff"></td></tr>`,
    )
    .join("\n");
  return `<!doctype html><meta charset="utf-8"><title>Theme visual comparison</title><style>body{font:14px system-ui;margin:2rem;color:#182230;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{padding:.5rem;border:1px solid #d7e0ea;text-align:left;vertical-align:top}img{max-width:260px;border:1px solid #aebdcc}tr.changed td{background:#fff1f1}tr.ok td{background:#f5fff8}code{background:#f1f5f9;padding:.1rem .25rem}</style><h1>Theme visual comparison</h1><p><strong>${changed.length ? "FAIL" : "PASS"}: ${changed.length} changed, ${comparisons.length - changed.length} unchanged.</strong> This is an automated pixel comparison, not an approval of visual quality.</p><p>Chrome: ${escapeHtml(browserVersion)} / ${escapeHtml(manifest.platform)}. Pixel threshold: ${pixelThreshold} per channel; maximum changed ratio: ${(maxChangedRatio * 100).toFixed(4)}%. A changed image is listed with its per-image diff.</p><p>Baseline: <code>tests/visual/baselines</code>. Update only after review with <code>pnpm test:visual:update</code>.</p><table><thead><tr><th>Theme</th><th>Mode</th><th>Viewport</th><th>Status</th><th>Changed px / ratio</th><th>Baseline</th><th>Current</th><th>Diff</th></tr></thead><tbody>${rows}</tbody></table><h2>Capture checks</h2><p>${results
    .map(
      (result) =>
        `${escapeHtml(result.theme)}/${result.mode}: desktop TOC ${escapeHtml(result.desktop.checks.tocDisplay)}, mobile TOC ${escapeHtml(result.mobile.checks.tocDisplay)}, contrast ${result.desktop.checks.lowContrast.length + result.mobile.checks.lowContrast.length} low, overlap ${result.desktop.checks.navSearchOverlap + result.mobile.checks.navSearchOverlap + result.desktop.checks.tocArticleOverlap + result.mobile.checks.tocArticleOverlap}px²`,
    )
    .join("<br>")}</p>`;
}

let browser;
try {
  await rm(reportDir, { recursive: true, force: true });
  await mkdir(actualDir, { recursive: true });
  await mkdir(diffDir, { recursive: true });
  await mkdir(baselineDir, { recursive: true });

  browser = await puppeteer.launch({
    headless: true,
    executablePath: chrome,
    args: [
      "--force-color-profile=srgb",
      "--disable-lcd-text",
      "--font-render-hinting=none",
      "--hide-scrollbars",
      "--lang=en-US",
    ],
  });
  const browserVersion = (await browser.version()).replace(
    "HeadlessChrome/",
    "Chrome/",
  );
  assert.equal(
    browserVersion,
    `Chrome/${expectedChromeVersion}`,
    `Chrome ${expectedChromeVersion} is required; got ${browserVersion}`,
  );

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateTimezone("UTC");

  const results = [];
  try {
    await page.setContent(markup, { waitUntil: "load" });
    for (const { theme, mode } of desktopCaptures) {
      const desktop = await capture(
        page,
        { name: `${theme}-${mode}.png`, theme, mode },
        desktopViewport,
      );
      assert.equal(
        desktop.checks.overflow,
        false,
        `${theme}/${mode}: desktop overflow`,
      );
      assert.notEqual(
        desktop.checks.tocDisplay,
        "none",
        `${theme}/${mode}: desktop TOC hidden`,
      );
      assert.notEqual(
        desktop.checks.tocDisplay,
        "missing",
        `${theme}/${mode}: desktop TOC missing`,
      );
      assert.equal(
        desktop.checks.navSearchOverlap,
        0,
        `${theme}/${mode}: navigation and search overlap`,
      );
      assert.equal(
        desktop.checks.tocArticleOverlap,
        0,
        `${theme}/${mode}: TOC and article overlap`,
      );
      assert.equal(
        desktop.checks.articleWithinViewport,
        true,
        `${theme}/${mode}: article outside viewport`,
      );
      assert.ok(
        desktop.checks.calloutTableGap >= 32,
        `${theme}/${mode}: callout and table are too close`,
      );
      assert.ok(
        desktop.checks.calloutTextInset >= 24,
        `${theme}/${mode}: callout text is too close to its border`,
      );
      assert.deepEqual(
        desktop.checks.lowContrast,
        [],
        `${theme}/${mode}: desktop low contrast`,
      );
      assert.equal(
        desktop.fonts.status,
        "loaded",
        `${theme}/${mode}: fonts not loaded`,
      );
      if (theme === "sakura")
        assert.ok(
          desktop.fonts.families.some((family) =>
            family.includes("Source Serif 4"),
          ),
          `${theme}/${mode}: Source Serif 4 not loaded`,
        );
      if (theme === "tokyonight")
        assert.ok(
          desktop.fonts.families.some((family) =>
            family.includes("JetBrains Mono"),
          ),
          `${theme}/${mode}: JetBrains Mono not loaded`,
        );

      const mobile = await capture(
        page,
        { name: `${theme}-${mode}-mobile.png`, theme, mode },
        mobileViewport,
      );
      assert.equal(
        mobile.checks.overflow,
        false,
        `${theme}/${mode}: mobile overflow`,
      );
      assert.equal(
        mobile.checks.tocDisplay,
        "none",
        `${theme}/${mode}: mobile TOC visible`,
      );
      assert.equal(
        mobile.checks.navSearchOverlap,
        0,
        `${theme}/${mode}: mobile navigation and search overlap`,
      );
      assert.equal(
        mobile.checks.articleWithinViewport,
        true,
        `${theme}/${mode}: mobile article outside viewport`,
      );
      assert.ok(
        mobile.checks.calloutTableGap >= 32,
        `${theme}/${mode}: mobile callout and table are too close`,
      );
      assert.ok(
        mobile.checks.calloutTextInset >= 24,
        `${theme}/${mode}: mobile callout text is too close to its border`,
      );
      assert.deepEqual(
        mobile.checks.lowContrast,
        [],
        `${theme}/${mode}: mobile low contrast`,
      );

      results.push({
        name: `${theme}-${mode}.png`,
        theme,
        mode,
        paper: desktop.checks.paper,
        desktop,
        mobile,
      });
    }
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }

  if (update) {
    for (const capture of captures) {
      await copyFile(
        join(actualDir, capture.name),
        join(baselineDir, capture.name),
      );
    }
    const screenshots = {};
    for (const capture of captures) {
      const buffer = await readFile(join(baselineDir, capture.name));
      screenshots[capture.name] = {
        sha256: sha256(buffer),
        bytes: buffer.length,
      };
    }
    const manifest = {
      format: 1,
      chromeVersion: browserVersion,
      platform: currentPlatform,
      desktopViewport,
      mobileViewport,
      deviceScaleFactor,
      timezone: "UTC",
      locale: "en-US",
      reducedMotion: "reduce",
      fonts: "embedded",
      screenshots,
    };
    await writeFile(
      join(baselineDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeFile(
      join(baselineDir, "report.html"),
      baselineReport(results, browserVersion),
    );
    console.log(
      JSON.stringify(
        {
          mode: "update",
          chromeVersion: browserVersion,
          variants: results.length,
          manifests: captures.length,
          baseline: baselineDir,
        },
        null,
        2,
      ),
    );
  } else {
    const manifest = await readManifest();
    assert.ok(
      manifest,
      "baseline manifest missing; run pnpm test:visual:update after review",
    );
    validateManifest(manifest, browserVersion);
    await validateBaselineHashes(manifest);
    const comparePage = await browser.newPage();
    await comparePage.setContent("<!doctype html><html><body></body></html>");
    const comparisons = [];
    try {
      for (const capture of captures) {
        const baseline = await readFile(join(baselineDir, capture.name));
        const actual = await readFile(join(actualDir, capture.name));
        const diff = await compare(comparePage, capture.name, baseline, actual);
        const status =
          diff.dimensionsMatch && diff.changedRatio <= maxChangedRatio
            ? "ok"
            : "changed";
        comparisons.push({ ...capture, ...diff, status });
      }
    } finally {
      await comparePage.close();
    }
    await writeFile(
      join(reportDir, "index.html"),
      comparisonReport(results, comparisons, browserVersion, manifest),
    );
    const changed = comparisons.filter((entry) => entry.status !== "ok");
    console.log(
      JSON.stringify(
        {
          mode: "check",
          chromeVersion: browserVersion,
          variants: results.length,
          changed: changed.map((entry) => entry.name),
          report: join(reportDir, "index.html"),
        },
        null,
        2,
      ),
    );
    if (changed.length) {
      console.error(
        `Visual regression detected in ${changed.length} image(s). Review ${join(reportDir, "index.html")}`,
      );
      process.exitCode = 1;
    }
  }
} finally {
  await browser?.close();
}
