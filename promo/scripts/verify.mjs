import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "..", "package.json"));
const puppeteer = require("puppeteer");

const file = path.join(here, "..", "riebeckite-demo.mp4");

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.goto("file:///" + file.replace(/\\/g, "/"));
await page.waitForSelector("video");
await page.evaluate(() => new Promise((resolve) => {
  const video = document.querySelector("video");
  if (video.readyState >= 1) return resolve();
  video.addEventListener("loadedmetadata", resolve, { once: true });
}));

const meta = await page.evaluate(() => {
  const v = document.querySelector("video");
  return { width: v.videoWidth, height: v.videoHeight, duration: v.duration };
});

await page.evaluate(() => document.querySelector("video").play());
await new Promise((resolve) => setTimeout(resolve, 1500));

const played = await page.evaluate(async () => {
  const v = document.querySelector("video");
  v.pause();
  v.currentTime = v.duration - 0.5;
  await new Promise((resolve) => v.addEventListener("seeked", resolve, { once: true }));
  return { currentTime: v.currentTime, readyState: v.readyState, error: v.error ? v.error.message : null };
});

console.log(JSON.stringify({ meta, played }, null, 2));
await browser.close();
