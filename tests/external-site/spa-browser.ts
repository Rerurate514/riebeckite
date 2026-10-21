import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import puppeteer from "puppeteer";

function contentType(file: string): string {
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/html";
}

async function serve(
  directory: string,
): Promise<{ url: string; close(): Promise<void> }> {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const relative =
      pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    const requested = path.resolve(directory, relative);
    if (
      !requested.startsWith(`${path.resolve(directory)}${path.sep}`) &&
      requested !== path.join(directory, "index.html")
    ) {
      response.writeHead(403).end();
      return;
    }
    const file = fs.existsSync(requested)
      ? requested
      : path.resolve(directory, pathname.slice(1));
    if (
      !file.startsWith(`${path.resolve(directory)}${path.sep}`) ||
      !fs.existsSync(file)
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": contentType(file) });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function assertNavigation(
  url: string,
  expectsSpa: boolean,
): Promise<void> {
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(() => {
      (
        window as Window & { spaNavigationMarker?: string }
      ).spaNavigationMarker = "preserved";
    });
    await page.click('a[href="/notes/example"]');
    await page.waitForFunction(() =>
      document.body.textContent?.includes("RIEBECKITE_EXTERNAL_NOTE_MARKER"),
    );
    const marker = await page.evaluate(
      () =>
        (window as Window & { spaNavigationMarker?: string })
          .spaNavigationMarker,
    );
    assert.equal(marker === "preserved", expectsSpa);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}

export async function assertSpaBrowserBehavior(siteDir: string): Promise<void> {
  const server = await serve(path.join(siteDir, "dist"));
  try {
    await assertNavigation(server.url, true);
    const configPath = path.join(siteDir, "riebeckite.config.ts");
    const config = fs.readFileSync(configPath, "utf8");
    fs.writeFileSync(configPath, config.replace("  spa: {},\n", ""));
    const result = spawnSync(
      process.execPath,
      [
        path.join(
          siteDir,
          "node_modules",
          "@riebeckite",
          "cli",
          "bin",
          "riebeckite.mjs",
        ),
        "build",
      ],
      { cwd: path.join(siteDir, "app"), stdio: "inherit" },
    );
    if (result.status !== 0) {
      throw new Error("SPA-disabled external fixture build failed");
    }
    await assertNavigation(server.url, false);
  } finally {
    await server.close();
  }
}
