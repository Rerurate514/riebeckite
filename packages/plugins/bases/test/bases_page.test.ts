import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentSource, ResolvedRiebeckiteConfig } from "@riebeckite/core";
import {
  ContentManager,
  NoopLogger,
  resolveConfig,
  SinkTracer,
} from "@riebeckite/core";
import {
  bases,
  evaluateBasesExpression,
  parseBases,
  parseBasesExpression,
} from "../index.js";

function memorySource(input: Readonly<Record<string, string>>): ContentSource {
  return {
    async scan() {
      return Object.keys(input).map((path) => ({ path }));
    },
    async read(entry) {
      return input[entry.path] ?? "";
    },
  };
}

function createManager(input: Readonly<Record<string, string>>) {
  return new ContentManager(memorySource(input), [], {
    config: resolveConfig({
      site: { title: "Test" },
      plugins: [bases({ showFallback: false })],
    }),
  });
}

const files = {
  "index.md": "---\npublish: true\n---\n\n![[views/Books.base]]\n",
  "notes/Public.md":
    "---\npublish: true\nstatus: published\nscore: 7\nauthor:\n  name: Ada\ntags: [featured]\n---\n\n# Public\n",
  "notes/Hidden.md":
    "---\npublish: true\nstatus: published\nauthor:\n  name: Secret\ntags: [hidden]\n---\n\n# Hidden\n",
  "notes/Draft.md":
    "---\npublish: false\nstatus: published\nauthor:\n  name: Draft\n---\n\n# Draft\n",
  "notes/Unlisted.md":
    "---\nvisibility: unlisted\nstatus: published\nauthor:\n  name: Unlisted\n---\n\n# Unlisted\n",
  "notes/Scheduled.md":
    "---\npublish: true\npublishAt: 2999-01-01T00:00:00.000Z\nstatus: published\nauthor:\n  name: Scheduled Secret\n---\n\n# Scheduled\n",
};

test("publishes referenced .base documents through PageType and preserves public boundaries", async () => {
  const manager = createManager({
    ...files,
    "views/Books.base": await libraryBase(),
  });
  assert.deepEqual([...(await manager.getPagePaths())], ["/views/Books"]);
  assert.deepEqual(
    (await manager.getOutputChangeSet({ incremental: false })).affected.filter(
      (output) => output.kind === "plugin-page",
    ),
    [
      {
        kind: "plugin-page",
        path: "views/Books.html",
        producer: "plugin:bases:page:bases-document",
        dependencies: [{ type: "global" }],
      },
    ],
  );

  const page = await manager.resolvePage("/views/Books");
  const body = page?.body ?? "";
  assert.equal(page?.type, "bases-document");
  assert.match(body, /<main class="rb-bases-page">/);
  assert.match(body, /Public/);
  assert.match(body, /ADA \/ 7/);
  assert.match(body, /data-bases-view="table"/);
  assert.match(body, /data-bases-view="cards"/);
  assert.doesNotMatch(body, /Hidden|Secret|Draft|Unlisted|Scheduled/);
});

test("allows an unlisted note to explicitly expose a Base without listing unlisted rows", async () => {
  const manager = createManager({
    ...files,
    "index.md": "---\nvisibility: unlisted\n---\n\n![[views/Books.base]]\n",
    "views/Books.base": await libraryBase(),
  });
  assert.deepEqual([...(await manager.getPagePaths())], ["/views/Books"]);
  const body = (await manager.resolvePage("/views/Books"))?.body ?? "";
  assert.match(body, /Public/);
  assert.doesNotMatch(body, /Unlisted|Draft|Scheduled/);
});

test("does not publish a Base referenced only by unpublished content", async () => {
  const manager = createManager({
    "draft.md": "---\npublish: false\n---\n\n![[views/Books.base]]\n",
    "views/Books.base": "views:\n  - type: table\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
});

test("rejects invalid Base YAML without declaring a page", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Invalid.base]]\n",
    "views/Invalid.base": "views: [\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "bases-invalid"),
    true,
  );
});

test("does not declare a page for a missing Base document", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Missing.base]]\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
});

test("keeps Markdown routes ahead of Base document routes", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Books.base]]\n",
    "views/Books.base": "views:\n  - type: table\n",
    "views/Books.md": "---\npublish: true\n---\n\n# Note\n",
  });
  assert.deepEqual([...(await manager.getPagePaths())], []);
  const manifest = await manager.getManifest();
  assert.equal(
    manifest.diagnostics.some((item) => item.code === "bases-invalid"),
    true,
  );
});

test("parses and evaluates nested formulas without executing JavaScript", () => {
  const parsed = parseBases({
    formulas: { doubled: "note.score * 2", label: "formula.doubled + 1" },
    filters:
      "(note.score >= 3 && !file.hasTag('hidden')) || note.author.name == 'Ada'",
  });
  assert.equal(parsed.ok, true);
  const expression = parseBasesExpression("formula.label");
  assert.equal(expression.ok, true);
  const entry = {
    slug: "notes/Example",
    permalink: "/notes/Example",
    title: "Example",
    tags: [],
    links: [],
    frontmatter: { score: 3, author: { name: "Ada" } },
  } as never;
  assert.equal(
    evaluateBasesExpression(expression.value, entry, parsed.value.formulas),
    7,
  );
  const unsafe = parseBasesExpression("process.exit(1)");
  assert.equal(unsafe.ok, true);
  assert.equal(
    evaluateBasesExpression(unsafe.value, entry, parsed.value.formulas),
    undefined,
  );
});

test("evaluates precedence, short circuits, missing values, and cycles safely", () => {
  const entry = {
    slug: "notes/Example",
    permalink: "/notes/Example",
    title: "Example",
    tags: [],
    links: [],
    frontmatter: { score: 3, author: { name: "Ada" }, payload: "<img>" },
  } as never;
  const evaluate = (source: string, formulas = {}) => {
    const expression = parseBasesExpression(source);
    assert.equal(expression.ok, true, source);
    return evaluateBasesExpression(expression.value, entry, formulas);
  };

  assert.equal(evaluate("1 + 2 * 3 == 7 && !(false || true)"), false);
  assert.equal(evaluate("(1 + 2) * 3 == 9"), true);
  assert.equal(evaluate("false && process.exit(1)"), false);
  assert.equal(evaluate("true || process.exit(1)"), true);
  assert.equal(evaluate("note.missing == null"), true);
  assert.equal(evaluate("note.score > '2'"), true);
  assert.equal(evaluate("unknownFunction(note.payload)"), undefined);
  assert.equal(
    evaluate("formula.first", {
      first: parseExpression("formula.second"),
      second: parseExpression("formula.first"),
    }),
    undefined,
  );
  assert.equal(parseBasesExpression("note.score +").ok, false);
  assert.deepEqual(evaluate("[1, 2, 3].map(value * 2)"), [2, 4, 6]);
  assert.deepEqual(evaluate("[1, 2, 3].filter(value > 1)"), [2, 3]);
  assert.equal(evaluate("[1, 2, 3].reduce(acc + value, 0)"), 6);
  assert.equal(evaluate("['a', 'b'].containsAll('a', 'b')"), true);
});

test("sorts formula values and renders grouped table summaries", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Grouped.base]]\n",
    "notes/First.md":
      "---\npublish: true\nstatus: alpha\nscore: 2\n---\n\n# First\n",
    "notes/Second.md":
      "---\npublish: true\nstatus: beta\nscore: 3\n---\n\n# Second\n",
    "notes/Third.md": "---\npublish: true\nscore: 1\n---\n\n# Third\n",
    "views/Grouped.base": [
      "formulas:",
      "  rank: note.score * 2",
      "summaries:",
      "  total: values.reduce(acc + value, 0)",
      "filters: note.score != null",
      "properties:",
      "  file.name: Name",
      "  status: Status",
      "  formula.rank: Rank",
      "views:",
      "  - type: table",
      "    order: [file.name, status, formula.rank]",
      "    sort: [{ property: formula.rank, direction: DESC }]",
      "    groupBy: { property: status, direction: ASC }",
      "    groupOrder: [beta, alpha, null]",
      "    summaries: { formula.rank: total }",
    ].join("\n"),
  });
  const body = (await manager.resolvePage("/views/Grouped"))?.body ?? "";
  assert.ok(body.indexOf("beta") < body.indexOf("alpha"));
  assert.ok(body.indexOf("alpha") < body.indexOf("No value"));
  assert.match(body, /__summary[^>]*>6</);
  assert.match(body, /__summary[^>]*>4</);
  assert.match(body, /__summary[^>]*>2</);
});

test("escapes formula and property output", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Safe.base]]\n",
    "notes/Public.md":
      "---\npublish: true\npayload: '<img src=x onerror=alert(1)>'\n---\n\n# Public\n",
    "views/Safe.base":
      "formulas:\n  echo: note.payload\nproperties:\n  note.payload: Payload\n  formula.echo: Echo\nviews:\n  - type: table\n",
  });
  const body = (await manager.resolvePage("/views/Safe"))?.body ?? "";
  assert.match(body, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(body, /<img src=x/);
});

test("keeps Base pages correct across cached content mutations", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-bases-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const initial = { ...files, "views/Books.base": await libraryBase() };
  const first = await buildCached(initial, directory);
  const firstBody = (await first.resolvePage("/views/Books"))?.body;
  assert.match(firstBody ?? "", /ADA \/ 7/);
  await first.dispose();

  const warm = await buildCached(initial, directory);
  assert.equal((await warm.resolvePage("/views/Books"))?.body, firstBody);
  await warm.dispose();

  const changedBase = {
    ...initial,
    "views/Books.base": (await libraryBase()).replace(" / ", " score "),
  };
  const afterBaseChange = await buildCached(changedBase, directory);
  assert.match(
    (await afterBaseChange.resolvePage("/views/Books"))?.body ?? "",
    /ADA score 7/,
  );
  await afterBaseChange.dispose();

  const afterFrontmatterChange = {
    ...changedBase,
    "notes/Public.md": files["notes/Public.md"].replace("score: 7", "score: 8"),
  };
  const afterFrontmatter = await buildCached(afterFrontmatterChange, directory);
  assert.match(
    (await afterFrontmatter.resolvePage("/views/Books"))?.body ?? "",
    /ADA score 8/,
  );
  await afterFrontmatter.dispose();

  const afterPublishChange = {
    ...afterFrontmatterChange,
    "notes/Draft.md": files["notes/Draft.md"].replace(
      "publish: false",
      "publish: true",
    ),
  };
  const afterPublish = await buildCached(afterPublishChange, directory);
  assert.match(
    (await afterPublish.resolvePage("/views/Books"))?.body ?? "",
    /Draft/,
  );
  await afterPublish.dispose();

  const afterDraft = await buildCached(afterFrontmatterChange, directory);
  assert.doesNotMatch(
    (await afterDraft.resolvePage("/views/Books"))?.body ?? "",
    /Draft/,
  );
  await afterDraft.dispose();

  const withAdded = {
    ...afterFrontmatterChange,
    "notes/Added.md":
      "---\npublish: true\nauthor:\n  name: Ada\nscore: 9\n---\n\n# Added\n",
  };
  const afterAdded = await buildCached(withAdded, directory);
  assert.match(
    (await afterAdded.resolvePage("/views/Books"))?.body ?? "",
    /Added/,
  );
  await afterAdded.dispose();

  const afterDelete = await buildCached(afterFrontmatterChange, directory);
  assert.doesNotMatch(
    (await afterDelete.resolvePage("/views/Books"))?.body ?? "",
    /Added/,
  );
  await afterDelete.dispose();

  const withoutBase = { ...afterFrontmatterChange };
  delete (withoutBase as Record<string, string>)["views/Books.base"];
  const removed = await buildCached(withoutBase, directory);
  assert.deepEqual([...(await removed.getPagePaths())], []);
  await removed.dispose();
});

async function libraryBase(): Promise<string> {
  return fs.readFile(
    new URL("./fixtures/Library.base", import.meta.url),
    "utf8",
  );
}

function parseExpression(source: string) {
  const expression = parseBasesExpression(source);
  assert.equal(expression.ok, true, source);
  return expression.value;
}

async function buildCached(
  input: Readonly<Record<string, string>>,
  directory: string,
): Promise<ContentManager> {
  const plugin = bases({ showFallback: false });
  const config: ResolvedRiebeckiteConfig = {
    buildDirectory: directory,
    site: {
      title: "Test",
      description: "",
      author: "",
      baseUrl: "http://test",
      locale: "en",
      twitterSite: "",
      defaultOgImage: "",
      feed: { title: "", description: "", language: "en" },
    },
    content: {
      directory: "/test",
      exclude: [],
      filters: { publishStrategy: "explicit" },
    },
    theme: {
      name: "test",
      colorMode: "system",
      typography: "system",
      articleLayout: "article",
      tokens: {},
      attributes: {},
      userCss: [],
      styles: [],
    },
    plugins: [plugin],
    cache: { enabled: true, directory: path.join(directory, "cache") },
  };
  const manager = new ContentManager(memorySource(input), [], {
    config,
    plugins: config.plugins,
    observability: {
      logger: new NoopLogger(),
      tracer: new SinkTracer({ onEvent: () => {}, onSpan: () => {} }),
    },
  });
  await manager.build({ incremental: true });
  return manager;
}
