import http from "node:http";
import type { AddressInfo } from "node:net";

type Route = {
  title: string;
  marker: string;
  status?: number;
  delay?: number;
  main?: boolean;
  runtime?: boolean;
  commitError?: boolean;
  networkError?: boolean;
  notHtml?: boolean;
};

const routes = new Map<string, Route>([
  ["/a", { title: "Page A", marker: "PAGE_A" }],
  ["/b-slow", { title: "Page B", marker: "PAGE_B", delay: 150 }],
  ["/c-fast", { title: "Page C", marker: "PAGE_C", delay: 20 }],
  [
    "/commit-error",
    {
      title: "Commit error",
      marker: "PAGE_COMMIT_ERROR",
      commitError: true,
    },
  ],
  [
    "/missing",
    {
      title: "Missing",
      marker: "404 fallback",
      status: 404,
      main: false,
      runtime: false,
    },
  ],
  [
    "/error",
    {
      title: "Error",
      marker: "500 fallback",
      status: 500,
      main: false,
      runtime: false,
    },
  ],
  [
    "/no-main",
    {
      title: "No main",
      marker: "no main fallback",
      main: false,
      runtime: false,
    },
  ],
  [
    "/network-error",
    {
      title: "Network error",
      marker: "network error fallback",
      networkError: true,
    },
  ],
  [
    "/not-html",
    {
      title: "Not HTML",
      marker: "not html fallback",
      notHtml: true,
    },
  ],
]);

export type SpaFixture = {
  url: string;
  requests(path: string): number;
  resetRequests(): void;
  close(): Promise<void>;
};

export async function createSpaFixture(bundle: string): Promise<SpaFixture> {
  const requests = new Map<string, number>();
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    requests.set(pathname, (requests.get(pathname) ?? 0) + 1);

    if (pathname === "/app.css") {
      response.writeHead(200, { "content-type": "text/css" }).end("");
      return;
    }
    if (pathname === "/redirect") {
      response.writeHead(302, { location: "/c-fast" }).end();
      return;
    }

    const route = routes.get(pathname);
    if (!route) {
      response.writeHead(404, { "content-type": "text/html" }).end();
      return;
    }
    const spaRequest = request.headers["sec-fetch-mode"] === "cors";
    if (route.networkError && spaRequest) {
      request.socket.destroy();
      return;
    }
    if (route.notHtml && spaRequest) {
      response.writeHead(200, { "content-type": "text/plain" }).end("not html");
      return;
    }
    if (route.delay) await sleep(route.delay);
    response.writeHead(route.status ?? 200, {
      "content-type": "text/html; charset=utf-8",
    });
    response.end(html(route, pathname, bundle));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests: (path) => requests.get(path) ?? 0,
    resetRequests: () => requests.clear(),
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

function html(route: Route, pathname: string, bundle: string): string {
  const runtime = route.runtime ?? true;
  const main = route.main ?? true;
  const links = `
    <nav>
      <a href="/a">A</a>
      <a href="/b-slow">B</a>
      <a href="/c-fast">C</a>
      <a href="/redirect">Redirect</a>
      <a href="/missing">Missing</a>
      <a href="/error">Error</a>
      <a href="/no-main">No main</a>
      <a href="/network-error">Network error</a>
      <a href="/not-html">Not HTML</a>
      <a href="/commit-error">Commit error</a>
      <a href="#section">Section</a>
    </nav>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#123456">
  <meta name="runtime-marker" content="keep" data-riebeckite-head="runtime">
  <meta name="description" content="${route.title} description" data-riebeckite-head="page">
  <meta property="og:title" content="${route.title}" data-riebeckite-head="page">
  <link rel="canonical" href="https://example.test${pathname}" data-riebeckite-head="page">
  <link rel="alternate" type="text/plain" href="/page${pathname}" data-riebeckite-head="page">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" data-riebeckite-head="global">
  <link rel="stylesheet" href="/app.css">
  <script>window.headScriptRuns = (window.headScriptRuns || 0) + 1;</script>
  <script type="application/ld+json" data-riebeckite-head="page">{"page":"${route.title}"}</script>
  <title>${route.title}</title>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div id="shell" data-shell-marker="preserved">shell</div>
  ${
    main
      ? `<main id="main-content" tabindex="-1"${route.commitError ? ' data-commit-error="true"' : ""}>
    <h1>${route.marker}</h1>
    ${links}
    <div id="section">Section target</div>
    <div style="height:3000px"></div>
  </main>`
      : `<div>${route.marker}</div>`
  }
  ${
    runtime
      ? `<script>${bundle}</script>
  <script>
    window.__vtSupported = typeof document.startViewTransition === "function";
    window.__spaBootCount = (window.__spaBootCount || 0) + 1;
    window.__pageCommits = window.__pageCommits || [];
    window.__pageUnmounts = window.__pageUnmounts || 0;
    window.stopSpa = RiebeckiteSpa.startSpaNavigation({
      prefetch: "hover",
      scrollRestoration: true,
      viewTransitions: true,
      onBeforePageCommit(signal) {
        window.__pageUnmounts += 1;
        if (signal.aborted) window.__abortedBeforeCommit = true;
      },
      onPageCommit({ root, signal }) {
        window.__pageCommits.push(root.querySelector("h1")?.textContent ?? "");
        if (signal.aborted) window.__abortedAfterCommit = true;
        if (root.dataset.commitError === "true") {
          throw new Error("intentional commit failure");
        }
      },
    });
  </script>`
      : ""
  }
</body>
</html>`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
