import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import path from "node:path";
import { describe, it } from "node:test";
import { createInvalid } from "@riebeckite/core";
import { isPathInsideDirectory, toLogicalPath } from "@riebeckite/node";
import type { Plugin, ViteDevServer } from "vite";
import {
  invalidateApplicationRuntime,
  isSiteAssetPath,
  riebeckiteContentWatch,
} from "../src/content_watch.js";

type FakeModule = { file: string; id?: string };

class FakeWatcher extends EventEmitter {
  watched: string[] = [];

  add(paths: string | string[]): this {
    this.watched = this.watched.concat(Array.isArray(paths) ? paths : [paths]);
    return this;
  }
}

type FakeServer = {
  watcher: FakeWatcher;
  sends: Array<{ type: string }>;
  waitForSends: (count: number) => Promise<void>;
  invalidated: string[];
  server: ViteDevServer;
};

function createServer(modules: FakeModule[]): FakeServer {
  const watcher = new FakeWatcher();
  const sends: Array<{ type: string }> = [];
  const sendWaiters: Array<() => void> = [];
  const invalidated: string[] = [];
  const moduleGraph = {
    idToModuleMap: new Map(
      modules.map((mod) => [
        mod.file,
        {
          file: mod.file,
          id: mod.id ?? mod.file,
          ssrModule: {},
        },
      ]),
    ),
    invalidateModule(mod): void {
      invalidated.push(mod.file ?? "");
    },
  };
  const server = {
    watcher,
    hot: {
      send(payload: { type: string }) {
        sends.push(payload);
        while (sendWaiters.length > 0) sendWaiters.shift()?.();
      },
    },
    environments: {
      ssr: {
        moduleGraph,
      },
    },
  };
  return {
    watcher,
    sends,
    waitForSends(count) {
      const flush = async () => {
        for (let i = 0; i < 50; i += 1) {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      };
      if (sends.length >= count) return flush();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const index = sendWaiters.indexOf(check);
          if (index >= 0) sendWaiters.splice(index, 1);
          reject(new Error(`Timed out waiting for ${count} reloads.`));
        }, 1_000);
        const check = () => {
          if (sends.length < count) return;
          clearTimeout(timeout);
          void flush().then(resolve);
        };
        sendWaiters.push(check);
      });
    },
    invalidated,
    server: createInvalid<ViteDevServer>(server),
  };
}

async function configure(
  contentRoot: string,
  appRoot: string,
  fake: FakeServer,
): Promise<void> {
  const plugin: Plugin = riebeckiteContentWatch({
    appRoot: async () => appRoot,
    contentRoot: async () => contentRoot,
    exclude: () => ["drafts/**"],
  });
  assert.equal(plugin.name, "riebeckite-content-watch");
  assert.equal(plugin.apply, "serve");
  const hook = plugin.configureServer as (server: ViteDevServer) => void;
  hook(fake.server);
  if (fake.watcher.watched.includes(contentRoot)) return;
  for (let i = 0; i < 1_000; i += 1) {
    if (fake.watcher.watched.includes(contentRoot)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("content watch did not configure");
}

describe("isSiteAssetPath", () => {
  it("recognizes images and attachments", async () => {
    assert.equal(await isSiteAssetPath("attachments/photo.png"), true);
    assert.equal(await isSiteAssetPath("attachments/report.pdf"), true);
    assert.equal(await isSiteAssetPath("notes/note.md"), false);
  });
});

describe("isPathInsideDirectory", () => {
  it("matches the directory itself and its descendants", () => {
    assert.equal(isPathInsideDirectory("/site/vault", "/site/vault"), true);
    assert.equal(
      isPathInsideDirectory("/site/vault", "/site/vault/notes/note.md"),
      true,
    );
  });

  it("rejects sibling directories with a shared prefix", () => {
    assert.equal(
      isPathInsideDirectory("/site/vault", "/site/vault-old"),
      false,
    );
    assert.equal(isPathInsideDirectory("/site/vault", "/site/app/x.ts"), false);
  });
});

describe("toLogicalPath", () => {
  it("returns the content-relative path with forward slashes", () => {
    assert.equal(
      toLogicalPath("/site/vault", path.join("/site/vault", "notes/a.md")),
      "notes/a.md",
    );
  });
});

describe("invalidateApplicationRuntime", () => {
  it("invalidates application modules and keeps the rest", async () => {
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "server.ts") },
      { file: path.join(appRoot, "app", "content.ts") },
      { file: path.join(appRoot, "node_modules", "pkg", "index.js") },
      { file: path.resolve("/elsewhere/config.ts") },
    ]);

    const invalidated = await invalidateApplicationRuntime(
      fake.server,
      appRoot,
    );

    assert.equal(invalidated, 2);
    assert.deepEqual(fake.invalidated.sort(), [
      path.join(appRoot, "app", "content.ts"),
      path.join(appRoot, "app", "server.ts"),
    ]);
  });

  it("does nothing when the ssr module graph is unavailable", async () => {
    const fake = createServer([]);
    const withoutGraph = {
      environments: {},
    } as ViteDevServer;
    assert.equal(await invalidateApplicationRuntime(withoutGraph, "/site"), 0);
    assert.equal(fake.invalidated.length, 0);
  });

  it("invalidates framework runtime virtual modules", async () => {
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "server.ts") },
      {
        file: "\0virtual:riebeckite/content",
        id: "\0virtual:riebeckite/content",
      },
      {
        file: "\0virtual:riebeckite/config",
        id: "\0virtual:riebeckite/config",
      },
    ]);

    const invalidated = await invalidateApplicationRuntime(
      fake.server,
      appRoot,
    );

    assert.equal(invalidated, 3);
  });
});

describe("riebeckiteContentWatch", () => {
  it("watches the resolved content root", async () => {
    const contentRoot = path.resolve("/site/vault");
    const fake = createServer([]);
    await configure(contentRoot, path.resolve("/site"), fake);
    assert.deepEqual(fake.watcher.watched, [contentRoot]);
  });

  it("reloads the browser and rebuilds runtime state for markdown changes", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
      { file: path.join(appRoot, "app", "server.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("change", path.join(contentRoot, "notes/a.md"));
    await fake.waitForSends(1);

    assert.deepEqual(fake.invalidated, [
      path.join(appRoot, "app", "content.ts"),
      path.join(appRoot, "app", "server.ts"),
    ]);
    assert.deepEqual(fake.sends, [{ type: "full-reload" }]);
  });

  it("coalesces bursts of file events into one reload", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("change", path.join(contentRoot, "notes/a.md"));
    fake.watcher.emit("change", path.join(contentRoot, "notes/b.md"));
    fake.watcher.emit("add", path.join(contentRoot, "notes/c.md"));
    fake.watcher.emit("unlink", path.join(contentRoot, "notes/d.md"));
    await fake.waitForSends(1);

    assert.equal(fake.sends.length, 1);
    assert.equal(fake.invalidated.length, 1);
  });

  it("ignores editor metadata and excluded paths", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit(
      "change",
      path.join(contentRoot, ".obsidian/workspace.json"),
    );
    fake.watcher.emit("change", path.join(contentRoot, "drafts/secret.md"));
    fake.watcher.emit("change", path.join(appRoot, "app", "routes/index.tsx"));

    assert.deepEqual(fake.sends, []);
    assert.deepEqual(fake.invalidated, []);
  });

  it("reloads without rebuilding runtime state when an asset is replaced", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit(
      "change",
      path.join(contentRoot, "attachments/photo.png"),
    );

    assert.deepEqual(fake.invalidated, []);
    assert.deepEqual(fake.sends, [{ type: "full-reload" }]);
  });

  it("rebuilds runtime state when an asset is added or removed", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit(
      "add",
      path.join(contentRoot, "attachments/photo-640.webp"),
    );
    await fake.waitForSends(1);
    fake.watcher.emit(
      "unlink",
      path.join(contentRoot, "attachments/photo.png"),
    );
    await fake.waitForSends(2);

    assert.equal(fake.invalidated.length, 2);
    assert.equal(fake.sends.length, 2);
  });

  it("keeps the dev server alive across content add and unlink", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    const restarts: string[] = [];
    const otherListenerCalls: string[] = [];
    fake.watcher.on("add", () => restarts.push("restart:add"));
    fake.watcher.on("unlink", () => restarts.push("restart:unlink"));
    fake.watcher.on("add", () => otherListenerCalls.push("other:add"));
    fake.watcher.on("unlink", () => otherListenerCalls.push("other:unlink"));
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("add", path.join(contentRoot, "notes/new.md"));
    fake.watcher.emit("unlink", path.join(contentRoot, "notes/old.md"));
    fake.watcher.emit("add", path.join(appRoot, "app", "routes/new.tsx"));
    fake.watcher.emit("unlink", path.join(appRoot, "app", "routes/old.tsx"));
    await fake.waitForSends(1);

    assert.deepEqual(restarts, ["restart:add", "restart:unlink"]);
    assert.deepEqual(otherListenerCalls, ["other:add", "other:unlink"]);
    assert.deepEqual(fake.invalidated, [
      path.join(appRoot, "app", "content.ts"),
    ]);
    assert.deepEqual(fake.sends, [{ type: "full-reload" }]);
  });

  it("keeps once listeners as once listeners", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([]);
    const onceCalls: string[] = [];
    fake.watcher.once("add", () => onceCalls.push("once:add"));
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("add", path.join(appRoot, "app", "routes/new.tsx"));
    fake.watcher.emit("add", path.join(appRoot, "app", "routes/other.tsx"));
    fake.watcher.emit("add", path.join(contentRoot, "notes/new.md"));
    fake.watcher.emit("add", path.join(appRoot, "app", "routes/third.tsx"));

    assert.deepEqual(onceCalls, ["once:add"]);
  });

  it("does not duplicate listeners when configured twice", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    await configure(contentRoot, appRoot, fake);
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("change", path.join(contentRoot, "notes/a.md"));
    await fake.waitForSends(1);

    assert.equal(fake.sends.length, 1);
    assert.equal(fake.invalidated.length, 1);
  });

  it("drops the pending reload when the dev server closes", async () => {
    const contentRoot = path.resolve("/site/vault");
    const appRoot = path.resolve("/site");
    const fake = createServer([
      { file: path.join(appRoot, "app", "content.ts") },
    ]);
    const closed: Array<() => void> = [];
    fake.server.httpServer = createInvalid<typeof fake.server.httpServer>({
      once(event: string, handler: () => void) {
        closed.push(handler);
        assert.equal(event, "close");
      },
    });
    await configure(contentRoot, appRoot, fake);

    fake.watcher.emit("change", path.join(contentRoot, "notes/a.md"));
    for (const handler of closed) handler();

    assert.deepEqual(fake.sends, []);
    assert.deepEqual(fake.invalidated, []);
  });
});
