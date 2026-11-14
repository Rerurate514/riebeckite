import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer";

export function requestedPage(
  requests: readonly { path: string; bytes: number }[],
): {
  requests: number;
  bytes: number;
} {
  const target = requests.filter(
    (request) => request.path === "/notes/example",
  );
  return {
    requests: target.length,
    bytes: target.reduce((total, request) => total + request.bytes, 0),
  };
}

export async function serve(directory: string): Promise<{
  url: string;
  requests: readonly { path: string; bytes: number }[];
  close(): Promise<void>;
}> {
  const requests: { path: string; bytes: number }[] = [];
  const root = path.resolve(directory);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const fallback =
      pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    const candidate = path.resolve(root, fallback);
    const file = fs.existsSync(candidate)
      ? candidate
      : path.resolve(root, pathname.slice(1));
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const bytes = fs.statSync(file).size;
    requests.push({ path: pathname, bytes });
    response.writeHead(200, {
      "content-type": contentType(file),
      "content-length": bytes,
      "cache-control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("benchmark server has no TCP address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

export async function measureBrowser(
  url: string,
  mode: Mode,
): Promise<{ samples: Sample[]; memoryBytes: Record<string, number> }> {
  const server = await serve(url);
  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const result: Sample[] = [];
    const memoryBytes: Record<string, number> = {};
    for (let sample = 0; sample < samples; sample += 1) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        window.addEventListener("DOMContentLoaded", () => {
          if (document.querySelector("main#main-content")) {
            performance.mark("benchmark-main-ready");
          }
        });
        document.addEventListener("spa:navigation", () =>
          performance.mark("benchmark-spa-complete"),
        );
      });
      await page.goto(server.url, { waitUntil: "domcontentloaded" });
      const initialMs = await page.evaluate(
        () =>
          performance.getEntriesByName("benchmark-main-ready").at(-1)
            ?.startTime ?? 0,
      );
      const before = server.requests.length;
      const link = 'a[href="/notes/example"]';
      let beforeClick = { requests: 0, bytes: 0 };
      if (mode === "hover") {
        await page.hover(link);
        await page.waitForFunction(() =>
          performance
            .getEntriesByType("resource")
            .some((entry) => entry.name.endsWith("/notes/example")),
        );
        beforeClick = requestedPage(server.requests.slice(before));
      }
      const navigationStart = await page.evaluate(() => performance.now());
      if (mode === "off") {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded" }),
          page.click(link),
        ]);
      } else {
        const completed = await page.evaluate(
          () => performance.getEntriesByName("benchmark-spa-complete").length,
        );
        await page.click(link);
        await page.waitForFunction(
          (previous) =>
            performance.getEntriesByName("benchmark-spa-complete").length >
            previous,
          {},
          completed,
        );
      }
      const navigationMs =
        mode === "off"
          ? await page.evaluate(
              () =>
                performance.getEntriesByName("benchmark-main-ready").at(-1)
                  ?.startTime ?? 0,
            )
          : await page.evaluate(
              (start) => performance.now() - start,
              navigationStart,
            );
      result.push({
        initialMs,
        navigationMs,
        prefetch: {
          beforeClick,
          afterClick: requestedPage(server.requests.slice(before)),
        },
      });
      await page.close();
    }
    for (const count of [0, 10, 25, 50]) {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        document.addEventListener("spa:navigation", () =>
          performance.mark("benchmark-spa-complete"),
        );
      });
      await page.goto(server.url, { waitUntil: "domcontentloaded" });
      for (let index = 0; index < count; index += 1) {
        if (mode === "off") {
          await Promise.all([
            page.waitForNavigation({ waitUntil: "domcontentloaded" }),
            page.click('a[href="/notes/example"]'),
          ]);
          await page.goBack({ waitUntil: "domcontentloaded" });
        } else {
          const completed = await page.evaluate(
            () => performance.getEntriesByName("benchmark-spa-complete").length,
          );
          await page.click('a[href="/notes/example"]');
          await page.waitForFunction(
            (previous) =>
              performance.getEntriesByName("benchmark-spa-complete").length >
              previous,
            {},
            completed,
          );
          const afterForward = await page.evaluate(
            () => performance.getEntriesByName("benchmark-spa-complete").length,
          );
          await page.goBack({ waitUntil: "domcontentloaded" });
          await page.waitForFunction(
            (previous) =>
              performance.getEntriesByName("benchmark-spa-complete").length >
              previous,
            {},
            afterForward,
          );
        }
      }
      memoryBytes[String(count)] = (await page.metrics()).JSHeapUsedSize;
      await page.close();
    }
    return { samples: result, memoryBytes };
  } finally {
    await browser.close();
    await server.close();
  }
}
