import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { codeEnhance } from "../../code-enhance/index.js";
import { obsidianMarkdown } from "../../obsidian-markdown/index.js";
import { sourceFiles } from "../index.js";

function source(
  input: Readonly<Record<string, string | Uint8Array>>,
): ContentSource {
  return {
    async scan() {
      return Object.entries(input).map(([path, content]) => ({
        path,
        metadata: {
          size:
            typeof content === "string" ? content.length : content.byteLength,
        },
      }));
    },
    async read(entry) {
      return input[entry.path] ?? "";
    },
  };
}

function manager(
  input: Readonly<Record<string, string | Uint8Array>>,
  cacheDirectory?: string,
) {
  return new ContentManager(source(input), [], {
    config: resolveConfig({
      site: { title: "Test" },
      ...(cacheDirectory
        ? { cache: { enabled: true, directory: cacheDirectory } }
        : {}),
      plugins: [
        obsidianMarkdown(),
        codeEnhance({ lineNumbers: true }),
        sourceFiles({ include: ["src/**/*.ts", "src/*.ts"] }),
      ],
    }),
  });
}

async function pagePaths(
  input: Readonly<Record<string, string | Uint8Array>>,
  cacheDirectory?: string,
): Promise<readonly string[]> {
  const content = manager(input, cacheDirectory);
  await content.build({ incremental: cacheDirectory !== undefined });
  const paths = await content.getPagePaths();
  await content.dispose();
  return paths;
}

test("publishes a selected source file linked from public content", async () => {
  const content = manager({
    "index.md":
      "---\npublish: true\n---\n\n[[src/main.ts#L2]]\n\n![[src/main.ts#L2-L3]]",
    "src/main.ts": "const first = 1;\nconst second = 2;\nconst third = 3;\n",
  });

  assert.deepEqual(await content.getPagePaths(), ["/source/src/main.ts/"]);
  const changes = await content.getOutputChangeSet({ incremental: false });
  assert.deepEqual(
    changes.affected.filter((output) => output.kind === "plugin-page"),
    [
      {
        kind: "plugin-page",
        path: "source/src/main.ts/index.html",
        producer: "plugin:source-files:page:source-file",
        dependencies: [{ type: "file", path: "src/main.ts" }],
      },
    ],
  );
  const page = await content.resolvePage("/source/src/main.ts/");
  assert.equal(page?.type, "source-file");
  assert.match(page?.body ?? "", /const[\s\S]*first[\s\S]*=[\s\S]*1/);
  assert.match(page?.body ?? "", /id="L1"/);
  assert.match(page?.body ?? "", /id="L2"/);
  assert.match(page?.body ?? "", /data-source-file="true"/);
  assert.match(page?.body ?? "", /rr-source-file__path/);
  assert.match(
    page?.body ?? "",
    /rr-source-file__download[\s\S]*assets\/attachments\/src\/main.ts[\s\S]*download/,
  );
  assert.doesNotMatch(page?.body ?? "", /data-source-file-copy|>Raw</);
  const manifest = await content.getManifest();
  assert.match(
    manifest.publicEntries[0]?.html ?? "",
    /href="\/source\/src\/main.ts\/#L2"/,
  );
  assert.match(
    manifest.publicEntries[0]?.html ?? "",
    /const[\s\S]*second[\s\S]*=[\s\S]*2/,
  );
  assert.doesNotMatch(manifest.publicEntries[0]?.html ?? "", /const first = 1/);
});

test("does not expose secret, binary, oversized, or draft-only files", async () => {
  const content = manager({
    "draft.md": "---\npublish: false\n---\n\n[[src/draft.ts]]",
    "index.md":
      "---\npublish: true\n---\n\n[[src/.env]]\n\n[[src/blob.ts]]\n\n[[src/huge.ts]]",
    "src/.env": "TOKEN=secret",
    "src/blob.ts": new Uint8Array([1, 0, 2]),
    "src/huge.ts": "x".repeat(1024 * 1024 + 1),
    "src/draft.ts": "export const draft = true;",
  });

  assert.deepEqual(await content.getPagePaths(), []);
  const manifest = await content.getManifest();
  assert.doesNotMatch(manifest.publicEntries[0]?.html ?? "", /TOKEN|secret/);
});

test("keeps incremental source page paths equivalent to clean builds", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-source-"),
  );
  const files: Record<string, string | Uint8Array> = {
    "index.md": "---\npublish: true\n---\n\n[[src/main.ts]]",
    "src/main.ts": "export const value = 1;",
  };
  const expected = async (paths: readonly string[]) => {
    assert.deepEqual(await pagePaths(files, directory), paths);
    assert.deepEqual(await pagePaths(files), paths);
  };

  try {
    await expected(["/source/src/main.ts/"]);
    files["src/main.ts"] = "export const value = 2;";
    await expected(["/source/src/main.ts/"]);
    files["src/unused.ts"] = "export const unused = true;";
    await expected(["/source/src/main.ts/"]);
    files["index.md"] += "\n\n[[src/unused.ts]]";
    await expected(["/source/src/main.ts/", "/source/src/unused.ts/"]);
    files["index.md"] = "---\npublish: true\n---\n\n[[src/unused.ts]]";
    await expected(["/source/src/unused.ts/"]);
    delete files["src/unused.ts"];
    await expected([]);
    files["src/renamed.ts"] = "export const renamed = true;";
    files["index.md"] = "---\npublish: true\n---\n\n[[src/renamed.ts]]";
    await expected(["/source/src/renamed.ts/"]);
    files["index.md"] = "---\npublish: false\n---\n\n[[src/renamed.ts]]";
    await expected([]);
    files["index.md"] = "---\npublish: true\n---\n\n[[src/renamed.ts]]";
    files["src/renamed.ts"] = new Uint8Array([1, 0, 2]);
    await expected([]);
    files["src/renamed.ts"] = "TOKEN=secret";
    files["index.md"] = "---\npublish: true\n---\n\n[[src/.env]]";
    files["src/.env"] = "TOKEN=secret";
    await expected([]);
    delete files["src/.env"];
    files["src/final.ts"] = "export const final = true;";
    files["index.md"] = "---\npublish: true\n---\n\n[[src/final.ts]]";
    await expected(["/source/src/final.ts/"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
