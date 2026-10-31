import http from "node:http";
import type { AddressInfo } from "node:net";

const pages = new Map<string, string>([
  ["/a", "PAGE_A"],
  ["/b", "PAGE_B"],
  ["/c", "PAGE_C"],
]);

export type RuntimeAsset = {
  readonly body: string | Uint8Array;
  readonly contentType: string;
};

export type RuntimeFixture = {
  url: string;
  close(): Promise<void>;
};

export async function createRuntimeFixture(
  bundle: string,
  assets: Readonly<Record<string, RuntimeAsset>> = {},
): Promise<RuntimeFixture> {
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    const asset = assets[pathname];
    if (asset) {
      response
        .writeHead(200, { "content-type": asset.contentType })
        .end(asset.body);
      return;
    }
    const marker = pages.get(pathname);
    if (!marker) {
      response.writeHead(404, { "content-type": "text/plain" }).end();
      return;
    }
    response
      .writeHead(200, { "content-type": "text/html; charset=utf-8" })
      .end(html(marker, pathname, bundle));
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

function html(marker: string, pathname: string, bundle: string): string {
  const links = [...pages.entries()]
    .map(([path, value]) => `<a href="${path}">${value}</a>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${marker}</title>
</head>
<body>
  <main id="main-content" tabindex="-1" data-page="${pathname}">
    <h1>${marker}</h1>
    ${links}
  </main>
  <script>${bundle}</script>
</body>
</html>`;
}
