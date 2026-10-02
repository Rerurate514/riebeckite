import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import type { Plugin, ViteDevServer } from "vite";
import {
  collectPublicImagePaths,
  collectSiteOwnedOutputPaths,
  imageContentType,
  riebeckiteContentAssets,
  toContentPath,
} from "../src/content_assets.js";

type ManifestFixture = {
  publicEntries: Array<{ assets: Array<{ path: string }> }>;
};

type AssetServerFake = {
  server: ViteDevServer;
  manifestCalls: () => number;
  setManifest(manifest: unknown): void;
};

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "riebeckite-content-assets-"));
}

function createServer(options: {
  appRoot: string;
  publicDir: string;
  manifest: ManifestFixture;
}): AssetServerFake {
  let manifest: unknown = options.manifest;
  let calls = 0;
  const server = {
    config: { base: "/", publicDir: options.publicDir },
    ssrLoadModule: async () => ({
      content: {
        getManifest: async () => {
          calls += 1;
          return manifest;
        },
      },
    }),
    middlewares: {
      use() {},
    },
  };
  return {
    server: server as unknown as ViteDevServer,
    manifestCalls: () => calls,
    setManifest: (next) => {
      manifest = next;
    },
  };
}

function createClient(
  fake: AssetServerFake,
  appRoot: string,
): {
  get(url: string): Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
    nexted: boolean;
  }>;
} {
  const plugin: Plugin = riebeckiteContentAssets({
    appRoot: () => appRoot,
    contentRoot: () => path.join(appRoot, "vault"),
  });
  assert.equal(plugin.name, "riebeckite-content-assets");
  assert.equal(plugin.apply, "serve");
  let handler:
    | ((request: unknown, response: unknown, next: () => void) => void)
    | undefined;
  const server = fake.server as unknown as {
    middlewares: { use(fn: typeof handler): void };
  };
  server.middlewares.use = (fn) => {
    handler = fn;
  };
  const hook = plugin.configureServer as (server: ViteDevServer) => void;
  hook(fake.server);

  return {
    get: async (url: string) => {
      const headers: Record<string, string> = {};
      const chunks: Buffer[] = [];
      let nexted = false;
      let settle: () => void = () => {};
      const response = {
        statusCode: 0,
        setHeader(name: string, value: string) {
          headers[name] = value;
        },
        end(body?: Uint8Array | string) {
          if (body) chunks.push(Buffer.from(body));
          settle();
        },
      };
      await new Promise<void>((resolve) => {
        settle = resolve;
        handler?.({ method: "GET", url }, response, () => {
          nexted = true;
          settle();
        });
      });
      return {
        status: response.statusCode,
        headers,
        body: Buffer.concat(chunks),
        nexted,
      };
    },
  };
}

function writeFile(
  root: string,
  relativePath: string,
  content: Buffer | string,
): void {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

describe("collectPublicImagePaths", () => {
  it("collects image assets referenced by public entries only", () => {
    const paths = collectPublicImagePaths({
      publicEntries: [
        { assets: [{ path: "attachments/photo.png" }] },
        {
          assets: [
            { path: "attachments/report.pdf" },
            { path: "notes\\pic.webp" },
          ],
        },
      ],
    });
    assert.deepEqual([...paths].sort(), [
      "attachments/photo.png",
      "notes/pic.webp",
    ]);
  });
});

describe("toContentPath", () => {
  it("strips the query, the base and the leading slash", () => {
    assert.equal(
      toContentPath("/attachments/a%20b.png?t=1", "/"),
      "attachments/a b.png",
    );
    assert.equal(
      toContentPath("/blog/attachments/a.png", "/blog/"),
      "attachments/a.png",
    );
  });

  it("rejects empty and traversing paths", () => {
    assert.equal(toContentPath("/", "/"), undefined);
    assert.equal(toContentPath("/../secret.png", "/"), undefined);
    assert.equal(toContentPath("/attachments//a.png", "/"), undefined);
    assert.equal(toContentPath(undefined, "/"), undefined);
  });
});

describe("imageContentType", () => {
  it("maps known image extensions", () => {
    assert.equal(imageContentType("attachments/a.png"), "image/png");
    assert.equal(imageContentType("attachments/a.JPG"), "image/jpeg");
    assert.equal(imageContentType("attachments/a.pdf"), undefined);
  });
});

describe("collectSiteOwnedOutputPaths", () => {
  it("walks the public directory recursively with posix paths", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "public"), "favicon.ico", "ICON");
    writeFile(path.join(appRoot, "public/assets"), "logo.png", "LOGO");
    writeFile(path.join(appRoot, "public"), ".assetsignore", "");

    const paths = await collectSiteOwnedOutputPaths(
      path.join(appRoot, "public"),
    );

    assert.deepEqual([...paths].sort(), [
      ".assetsignore",
      "assets/logo.png",
      "favicon.ico",
    ]);
  });

  it("returns an empty set for a missing or disabled public directory", async () => {
    const appRoot = createTempRoot();

    assert.equal(
      (await collectSiteOwnedOutputPaths(path.join(appRoot, "public"))).size,
      0,
    );
    assert.equal((await collectSiteOwnedOutputPaths(false)).size, 0);
    assert.equal((await collectSiteOwnedOutputPaths(undefined)).size, 0);
  });
});

describe("riebeckiteContentAssets", () => {
  it("serves images referenced by public entries from the content root", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault/attachments"), "sample.png", "IMAGE-A");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [{ assets: [{ path: "attachments/sample.png" }] }],
      },
    });
    const client = createClient(fake, appRoot);

    const response = await client.get("/attachments/sample.png");

    assert.equal(response.nexted, false);
    assert.equal(response.status, 200);
    assert.equal(response.headers["Content-Type"], "image/png");
    assert.equal(response.body.toString("utf8"), "IMAGE-A");
    assert.equal(response.headers["Cache-Control"], "no-cache");
  });

  it("reads the file on every request so replacements are visible", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault/attachments"), "sample.png", "IMAGE-A");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [{ assets: [{ path: "attachments/sample.png" }] }],
      },
    });
    const client = createClient(fake, appRoot);

    const before = await client.get("/attachments/sample.png");
    await fsp.writeFile(
      path.join(appRoot, "vault/attachments/sample.png"),
      "IMAGE-B",
    );
    const after = await client.get("/attachments/sample.png");

    assert.equal(before.body.toString("utf8"), "IMAGE-A");
    assert.equal(after.body.toString("utf8"), "IMAGE-B");
    assert.equal(fake.manifestCalls() <= 2, true);
  });

  it("does not serve assets that no public entry references", async () => {
    const appRoot = createTempRoot();
    writeFile(
      path.join(appRoot, "vault/attachments"),
      "private.png",
      "PRIVATE",
    );
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [{ assets: [{ path: "attachments/shared.png" }] }],
      },
    });
    const client = createClient(fake, appRoot);

    const response = await client.get("/attachments/private.png");

    assert.equal(response.nexted, true);
  });

  it("follows publication changes in the current manifest", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault/attachments"), "secret.png", "SECRET");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: { publicEntries: [] },
    });
    const client = createClient(fake, appRoot);

    assert.equal((await client.get("/attachments/secret.png")).nexted, true);
    fake.setManifest({
      publicEntries: [{ assets: [{ path: "attachments/secret.png" }] }],
    });
    assert.equal((await client.get("/attachments/secret.png")).nexted, false);
  });

  it("never exposes editor metadata or non-image attachments", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault"), ".obsidian/workspace.json", "{}");
    writeFile(path.join(appRoot, "vault/attachments"), "report.pdf", "PDF");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [
          {
            assets: [
              { path: ".obsidian/workspace.json" },
              { path: "attachments/report.pdf" },
            ],
          },
        ],
      },
    });
    const client = createClient(fake, appRoot);

    assert.equal((await client.get("/.obsidian/workspace.json")).nexted, true);
    assert.equal((await client.get("/attachments/report.pdf")).nexted, true);
  });

  it("leaves site-owned public files to Vite", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault/attachments"), "sample.png", "VAULT");
    writeFile(path.join(appRoot, "public/attachments"), "sample.png", "SITE");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [{ assets: [{ path: "attachments/sample.png" }] }],
      },
    });
    const client = createClient(fake, appRoot);

    assert.equal((await client.get("/attachments/sample.png")).nexted, true);
  });

  it("ignores non-GET requests", async () => {
    const appRoot = createTempRoot();
    writeFile(path.join(appRoot, "vault/attachments"), "sample.png", "IMAGE");
    const fake = createServer({
      appRoot,
      publicDir: path.join(appRoot, "public"),
      manifest: {
        publicEntries: [{ assets: [{ path: "attachments/sample.png" }] }],
      },
    });
    const plugin: Plugin = riebeckiteContentAssets({
      appRoot: () => appRoot,
      contentRoot: () => path.join(appRoot, "vault"),
    });
    let handler:
      | ((request: unknown, response: unknown, next: () => void) => void)
      | undefined;
    (
      fake.server as unknown as {
        middlewares: { use(fn: typeof handler): void };
      }
    ).middlewares.use = (fn) => {
      handler = fn;
    };
    (plugin.configureServer as (server: ViteDevServer) => void)(fake.server);

    const nexted = await new Promise<boolean>((resolve) => {
      handler?.(
        { method: "POST", url: "/attachments/sample.png" },
        { setHeader() {}, end: () => resolve(false) },
        () => resolve(true),
      );
    });

    assert.equal(nexted, true);
  });
});
