import assert from "node:assert/strict";
import { test } from "node:test";
import mdx from "../index.js";

test("requires explicit trust", () => {
  assert.throws(
    () => mdx({} as never),
    /requires trusted: true because MDX executes authored code/,
  );
});

test("preserves MDX frontmatter without parsing its JSX as Markdown", async () => {
  const plugin = mdx({ trusted: true });
  const format = plugin.contentFormats?.[0];
  assert.ok(format?.process);

  const content = await format.process({
    slug: "example",
    sourcePath: "example.mdx",
    source: "---\ntitle: Example\npublish: true\n---\n\n<Value>{1 + 1}</Value>",
    processMarkdown: async () => {
      throw new Error("MDX must not enter the Markdown renderer");
    },
  });

  assert.deepEqual(content.frontmatter, { title: "Example", publish: true });
  assert.equal(content.html, "");
});

test("tracks relative module imports as content file dependencies", () => {
  const plugin = mdx({ trusted: true });
  const format = plugin.contentFormats?.[0];
  assert.deepEqual(
    format?.dependencies?.({
      sourcePath: "posts/example.mdx",
      source:
        'import { Card } from "./card";\nexport { value } from "../value";',
      paths: ["posts/example.mdx", "posts/card.tsx", "value.ts"],
    }),
    ["posts/card.tsx", "value.ts"],
  );
});

test("strips YAML frontmatter before MDX compilation", () => {
  const plugin = mdx({ trusted: true });
  const [frontmatter] = plugin.vitePlugins?.({
    contentDirectory: "content",
  }) as [{ transform: (code: string, id: string) => unknown }];

  assert.deepEqual(
    frontmatter.transform("---\ntitle: Example\n---\n\n# Heading", "page.mdx"),
    { code: "\n# Heading", map: null },
  );
  assert.equal(frontmatter.transform("# Heading", "page.mdx"), null);
  assert.equal(
    frontmatter.transform("---\ntitle: Example\n---\n\n# Heading", "page.md"),
    null,
  );
});

test("normalizes Windows source paths in the MDX renderer", async () => {
  const plugin = mdx({ trusted: true });
  const renderer = plugin.vitePlugins?.({
    contentDirectory: "test",
  })[2] as { load: (id: string) => Promise<string | null> };

  assert.ok(
    (
      (await renderer.load("\0virtual:riebeckite/mdx-renderer.tsx")) ?? ""
    ).includes('sourcePath.replaceAll("\\\\", "/")'),
  );
});

test("reloads the MDX renderer when an MDX content file is added or removed", () => {
  const plugin = mdx({ trusted: true });
  const vitePlugin = plugin.vitePlugins?.({
    contentDirectory: "/content",
  })[2] as {
    configureServer: (server: {
      watcher: {
        on(event: string, listener: (file: string) => void): void;
        off(event: string, listener: (file: string) => void): void;
      };
      moduleGraph: {
        getModuleById(id: string): unknown;
        invalidateModule(module: unknown): void;
      };
      ws: { send(payload: { type: string }): void };
    }) => () => void;
  };
  const listeners = new Map<string, (file: string) => void>();
  const renderer = {};
  const invalidated: unknown[] = [];
  const reloads: unknown[] = [];
  const dispose = vitePlugin.configureServer({
    watcher: {
      on: (event, listener) => void listeners.set(event, listener),
      off: (event) => void listeners.delete(event),
    },
    moduleGraph: {
      getModuleById: () => renderer,
      invalidateModule: (module) => void invalidated.push(module),
    },
    ws: { send: (payload) => void reloads.push(payload) },
  });

  listeners.get("add")?.("/content/new.mdx");
  listeners.get("unlink")?.("/content/old.mdx");
  listeners.get("add")?.("/outside/ignored.mdx");

  assert.deepEqual(invalidated, [renderer, renderer]);
  assert.deepEqual(reloads, [{ type: "full-reload" }, { type: "full-reload" }]);
  dispose();
  assert.equal(listeners.size, 0);
});

test("projects MDX text for HTML consumers", async () => {
  const plugin = mdx({ trusted: true });
  const format = plugin.contentFormats?.[0];
  assert.ok(format?.process);

  const content = await format.process({
    slug: "example",
    sourcePath: "example.mdx",
    source:
      '---\ntitle: Example\n---\n\n# Heading\n\nText {1 + 1}\n\n<Widget value="x" />\n',
    processMarkdown: async (markdown) => ({
      frontmatter: {},
      html: `<md>${markdown}</md>`,
    }),
  });

  assert.deepEqual(content.frontmatter, { title: "Example" });
  assert.match(content.html, /# Heading/);
  assert.match(content.html, /Text/);
  assert.doesNotMatch(content.html, /Widget|1 \+ 1/);
});
