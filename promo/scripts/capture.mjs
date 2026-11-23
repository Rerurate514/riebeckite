import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(
  path.resolve(import.meta.dirname, "../../package.json"),
);
const puppeteer = require("puppeteer");

const base = process.env.PROMO_SITE ?? "http://127.0.0.1:4321";
const out = path.resolve(import.meta.dirname, "../assets");
mkdirSync(out, { recursive: true });

const viewport = { width: 1600, height: 900, deviceScaleFactor: 2 };

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport(viewport);

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const captureFullPage = async (name) => {
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await page.setViewport({ ...viewport, height });
  await settle(300);
  await page.screenshot({ path: path.join(out, name), fullPage: true });
  await page.setViewport(viewport);
  await settle(300);
};

await page.goto(`${base}/blog/obsidian-digital-garden`, {
  waitUntil: "networkidle0",
});
await settle(800);
await captureFullPage("article.png");

await page.goto(`${base}/docs/getting-started/`, { waitUntil: "networkidle0" });
await settle(800);
await captureFullPage("docs.png");

await page.click(".rr-search-bar__trigger");
await settle(900);
await page.screenshot({ path: path.join(out, "search-0.png") });

const query = "syntax";
let prefix = "";
let index = 1;
for (const char of query) {
  prefix += char;
  await page.type(".rr-search-modal input", char, { delay: 0 });
  await settle(140);
  await page.screenshot({ path: path.join(out, `search-${index}.png`) });
  index += 1;
}

await settle(900);
await page.screenshot({ path: path.join(out, "search-results.png") });

const results = await page.evaluate(() => {
  const items = [
    ...document.querySelectorAll(
      ".rr-search-modal a[href], .rr-search-result a[href]",
    ),
  ];
  return items.slice(0, 6).map((a) => ({
    text: a.textContent.trim().replace(/\s+/g, " ").slice(0, 70),
    href: a.getAttribute("href"),
  }));
});
console.log("RESULTS", JSON.stringify(results, null, 2));

const first = await page.$(".rr-search-modal a[href]");
if (first) {
  await first.hover();
  await settle(300);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.keyboard.press("Enter"),
  ]);
  await settle(800);
  console.log("DEST", page.url());
  await captureFullPage("obsidian.png");
}

copyFileSync(
  path.resolve(import.meta.dirname, "../../website/dist/riebeckite-logo.png"),
  path.join(out, "logo.png"),
);

const dims = await page.evaluate(() => ({
  height: document.documentElement.scrollHeight,
}));
console.log("PAGE", dims, "prefix", prefix);
await browser.close();
