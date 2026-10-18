import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ContentManifestEntry,
  ContentSource,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import {
  ContentManager,
  NoopLogger,
  resolveConfig,
  SinkTracer,
} from "@riebeckite/core";
import {
  BasesEvaluationError,
  bases,
  evaluateBasesExpression,
  groupBasesEntries,
  matchesCondition,
  parseBases,
  parseBasesExpression,
  sortBasesEntries,
  summarizeBasesValues,
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

const buildMetrics = new WeakMap<ContentManager, BuildMetrics>();

type BuildMetrics = {
  readonly reusedContent: number;
  readonly processedContent: number;
  readonly reusedOutputs: number;
  readonly generatedOutputs: number;
  readonly persistentCacheHits: number;
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

test("uses file metadata in formulas, filters, sorting, groups, summaries, and higher-order expressions", () => {
  const early = metadataEntry("Early", 12, "2024-01-01T00:00:00.000Z");
  const late = metadataEntry("Late", 24, "2024-01-02T00:00:00.000Z");
  const spec = parseBases({
    formulas: {
      total: "file.size + 1",
      values: "list(file.size, file.mtime).map(value)",
    },
  });
  assert.equal(spec.ok, true);
  assert.equal(
    evaluateBasesExpression(
      parseExpression("formula.total"),
      early,
      spec.value.formulas,
    ),
    13,
  );
  assert.deepEqual(
    evaluateBasesExpression(
      parseExpression("formula.values"),
      early,
      spec.value.formulas,
    ),
    [12, new Date("2024-01-01T00:00:00.000Z")],
  );
  assert.equal(
    matchesCondition(
      {
        kind: "expression",
        expression: parseExpression(
          "file.mtime < date('2024-01-02') && file.ctime >= date('2023-12-31')",
        ),
      },
      early,
    ),
    true,
  );
  const view = {
    type: "table" as const,
    columns: [],
    sort: [{ property: "file.size", direction: "desc" as const }],
    groupBy: { property: "file.mtime", direction: "asc" as const },
  };
  assert.deepEqual(sortBasesEntries([early, late], view, spec.value), [
    late,
    early,
  ]);
  assert.deepEqual(
    groupBasesEntries([early, late], view, spec.value).map(
      (group) => group.key,
    ),
    [
      new Date("2024-01-01T00:00:00.000Z"),
      new Date("2024-01-02T00:00:00.000Z"),
    ],
  );
  assert.equal(
    summarizeBasesValues(
      [early.file?.size, late.file?.size],
      "sum",
      spec.value,
    ),
    36,
  );
  assert.deepEqual(
    summarizeBasesValues(
      [early.file?.mtime, late.file?.mtime],
      "latest",
      spec.value,
    ),
    new Date("2024-01-02T00:00:00.000Z"),
  );
});

test("stops deeply nested and large higher-order formulas with an explicit error", () => {
  const entry = {
    slug: "notes/Example",
    permalink: "/notes/Example",
    title: "Example",
    tags: [],
    links: [],
    frontmatter: {
      values: Array.from({ length: 10_001 }, (_, index) => index),
    },
  } as never;
  const nested = parseExpression(`${"!".repeat(129)}true`);
  assert.throws(
    () => evaluateBasesExpression(nested, entry),
    BasesEvaluationError,
  );
  const mapped = parseExpression("note.values.map(value)");
  assert.throws(
    () => evaluateBasesExpression(mapped, entry),
    /exceeded 10000 steps/,
  );
  const unsafe = parseExpression("note.payload.constructor");
  assert.equal(
    evaluateBasesExpression(unsafe, {
      slug: "notes/Unsafe",
      permalink: "/notes/Unsafe",
      title: "Unsafe",
      tags: [],
      links: [],
      frontmatter: { payload: {} },
    } as never),
    undefined,
  );
});

test("reports an evaluation budget failure through Bases diagnostics", async () => {
  const values = Array.from({ length: 10_001 }, (_, index) => index).join(", ");
  const manager = createManager({
    "index.md":
      "---\npublish: true\n---\n\n```base\nformulas:\n  huge: note.values.map(value)\nproperties:\n  formula.huge: Huge\nviews:\n  - type: table\n```\n",
    "notes/Large.md": `---\npublish: true\nvalues: [${values}]\n---\n\n# Large\n`,
  });
  const manifest = await manager.getManifest();
  const body =
    manifest.publicEntries.find((entry) => entry.slug === "index")?.html ?? "";
  assert.match(body, /Formula evaluation exceeded 10000 steps/);
  assert.equal(
    (await manager.getDiagnostics()).some(
      (item) => item.code === "bases-invalid",
    ),
    true,
  );
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

test("sorts scalar formula values stably and rejects invalid sort directions", () => {
  const parsed = parseBases({
    formulas: { value: "note.value", chained: "formula.value" },
    views: [
      {
        type: "table",
        sort: [
          { property: "formula.chained", direction: "ASC" },
          { property: "note.tie", direction: "DESC" },
        ],
      },
    ],
  });
  assert.equal(parsed.ok, true);
  const entries = [
    entry("text", "z", 1),
    entry("number", 2, 2),
    entry("date", "2025-01-01", 3),
    entry("false", false, 4),
    entry("empty", null, 5),
    entry("stable-a", 4, 7),
    entry("stable-b", 4, 7),
  ];
  const sorted = sortBasesEntries(entries, parsed.value.views[0], parsed.value);
  assert.deepEqual(
    sorted.map((value) => value.title),
    ["number", "stable-a", "stable-b", "date", "false", "text", "empty"],
  );
  assert.equal(summarizeBasesValues([1, 2, 3], "Sum", parsed.value), 6);
  assert.equal(summarizeBasesValues([1, 2, 3], "Average", parsed.value), 2);
  assert.equal(
    parseBases({
      views: [
        { type: "table", sort: [{ property: "x", direction: "sideways" }] },
      ],
    }).ok,
    false,
  );
});

test("groups and summaries use only discoverable public entries", async () => {
  const manager = createManager({
    "index.md": "---\npublish: true\n---\n\n![[views/Boundary.base]]\n",
    "notes/Public.md":
      "---\npublish: true\nstatus: visible\nscore: 3\n---\n\n# Public\n",
    "notes/Hidden.md":
      "---\npublish: false\nstatus: secret\nscore: 999999\n---\n\n# Hidden\n",
    "notes/Unlisted.md":
      "---\nvisibility: unlisted\nstatus: secret\nscore: 888888\n---\n\n# Unlisted\n",
    "notes/Scheduled.md":
      "---\npublish: true\npublishAt: 2999-01-01T00:00:00.000Z\nstatus: secret\nscore: 777777\n---\n\n# Scheduled\n",
    "views/Boundary.base": [
      "summaries:",
      "  total: values.reduce(acc + value, 0)",
      "properties:",
      "  file.name: Name",
      "  status: Status",
      "  score: Score",
      "views:",
      "  - type: table",
      "    order: [file.name, status, score]",
      "    groupBy: { property: status, direction: ASC }",
      "    summaries: { score: total }",
    ].join("\n"),
  });
  const body = (await manager.resolvePage("/views/Boundary"))?.body ?? "";
  assert.match(body, /visible/);
  assert.match(body, /__summary">3</);
  assert.doesNotMatch(
    body,
    /secret|999999|888888|777777|Hidden|Unlisted|Scheduled/,
  );
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

test("matches clean output for all Bases incremental cache transitions", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-bases-matrix-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const initial = {
    "index.md": "---\npublish: true\n---\n\n![[views/Matrix.base]]\n",
    "notes/Public.md":
      "---\npublish: true\nvalue: 2\ngroup: alpha\n---\n\n# Public\n",
    "notes/Draft.md":
      "---\npublish: false\nvalue: 999999\ngroup: hidden\n---\n\n# Draft\n",
    "notes/Unlisted.md":
      "---\nvisibility: unlisted\nvalue: 888888\ngroup: hidden\n---\n\n# Unlisted\n",
    "views/Matrix.base":
      "formulas:\n  rank: note.value * 2\nsummaries:\n  total: values.reduce(acc + value, 0)\nproperties:\n  file.name: Name\n  group: Group\n  formula.rank: Rank\nviews:\n  - type: table\n    order: [file.name, group, formula.rank]\n    sort: [{ property: formula.rank, direction: DESC }]\n    groupBy: { property: group, direction: ASC }\n    summaries: { formula.rank: total }\n",
  };
  const scenarios: ReadonlyArray<
    readonly [string, (input: Record<string, string>) => void]
  > = [
    ["no-change", () => {}],
    [
      "formula-definition",
      (input) => {
        input["views/Matrix.base"] = input["views/Matrix.base"].replace(
          "* 2",
          "* 3",
        );
      },
    ],
    [
      "formula-sort",
      (input) => {
        input["views/Matrix.base"] = input["views/Matrix.base"].replace(
          "DESC",
          "ASC",
        );
      },
    ],
    [
      "group",
      (input) => {
        input["views/Matrix.base"] = input["views/Matrix.base"].replace(
          "group, direction: ASC",
          "formula.rank, direction: DESC",
        );
      },
    ],
    [
      "summary",
      (input) => {
        input["views/Matrix.base"] = input["views/Matrix.base"].replace(
          "total }",
          "Sum }",
        );
      },
    ],
    [
      "frontmatter",
      (input) => {
        input["notes/Public.md"] = input["notes/Public.md"].replace(
          "value: 2",
          "value: 3",
        );
      },
    ],
    [
      "add",
      (input) => {
        input["notes/Added.md"] =
          "---\npublish: true\nvalue: 4\ngroup: beta\n---\n\n# Added\n";
      },
    ],
    [
      "delete",
      (input) => {
        delete input["notes/Public.md"];
      },
    ],
    [
      "public-draft",
      (input) => {
        input["notes/Public.md"] = input["notes/Public.md"].replace(
          "publish: true",
          "publish: false",
        );
      },
    ],
    [
      "draft-public",
      (input) => {
        input["notes/Draft.md"] = input["notes/Draft.md"].replace(
          "publish: false",
          "publish: true",
        );
      },
    ],
    [
      "public-unlisted",
      (input) => {
        input["notes/Public.md"] = input["notes/Public.md"].replace(
          "publish: true",
          "visibility: unlisted",
        );
      },
    ],
    [
      "unlisted-public",
      (input) => {
        input["notes/Unlisted.md"] = input["notes/Unlisted.md"].replace(
          "visibility: unlisted",
          "publish: true",
        );
      },
    ],
    [
      "base-delete",
      (input) => {
        delete input["views/Matrix.base"];
      },
    ],
  ];
  for (const [name, mutate] of scenarios) {
    const cacheDirectory = path.join(directory, name, "cached");
    const before = await buildCached(initial, cacheDirectory);
    await before.dispose();
    assert.equal(
      (await fs.readdir(path.join(cacheDirectory, "cache"))).length > 0,
      true,
      name,
    );
    const changed = { ...initial };
    mutate(changed);
    const incremental = await buildCached(changed, cacheDirectory);
    const clean = await buildCached(
      changed,
      path.join(directory, name, "clean"),
    );
    assert.deepEqual(
      await basesSnapshot(incremental),
      await basesSnapshot(clean),
      name,
    );
    const metrics = buildMetrics.get(incremental);
    assert.ok(metrics, name);
    assert.ok(metrics.reusedContent > 0, `${name}: content cache reuse`);
    const body = (await incremental.resolvePage("/views/Matrix"))?.body ?? "";
    assert.doesNotMatch(body, /999999|888888/, name);
    await incremental.dispose();
    await clean.dispose();
  }
});

test("does not report content reuse when the persistent cache is disabled", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-bases-no-cache-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const input = {
    "index.md": "---\npublish: true\n---\n\n![[views/Books.base]]\n",
    "notes/Public.md": "---\npublish: true\n---\n\n# Public\n",
    "views/Books.base": "views:\n  - type: table\n",
  };
  const first = await buildCached(input, directory, false);
  await first.dispose();
  const second = await buildCached(input, directory, false);
  const metrics = buildMetrics.get(second);
  assert.ok(metrics);
  assert.equal(metrics.persistentCacheHits, 0);
  await second.dispose();
});

async function libraryBase(): Promise<string> {
  return fs.readFile(
    new URL("./fixtures/Library.base", import.meta.url),
    "utf8",
  );
}

async function basesSnapshot(manager: ContentManager) {
  const paths = [...(await manager.getPagePaths())].sort();
  const pages = await Promise.all(
    paths.map(
      async (pagePath) =>
        [pagePath, (await manager.resolvePage(pagePath))?.body ?? ""] as const,
    ),
  );
  const outputInventory = paths.map((pagePath) =>
    pagePath === "/" ? "index.html" : `${pagePath.slice(1)}.html`,
  );
  return { paths, pages, outputInventory };
}

function parseExpression(source: string) {
  const expression = parseBasesExpression(source);
  assert.equal(expression.ok, true, source);
  return expression.value;
}

function entry(title: string, value: unknown, tie: number) {
  return {
    slug: `notes/${title}`,
    permalink: `/notes/${title}`,
    title,
    tags: [],
    links: [],
    frontmatter: { value, tie },
  } as never;
}

function metadataEntry(
  title: string,
  size: number,
  time: string,
): ContentManifestEntry {
  return {
    slug: `notes/${title}`,
    permalink: `/notes/${title}`,
    title,
    tags: [],
    links: [],
    frontmatter: {},
    file: {
      size,
      ctime: new Date("2023-12-31T00:00:00.000Z"),
      mtime: new Date(time),
    },
  } as ContentManifestEntry;
}

async function buildCached(
  input: Readonly<Record<string, string>>,
  directory: string,
  cacheEnabled = true,
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
    cache: { enabled: cacheEnabled, directory: path.join(directory, "cache") },
  };
  const events: { name: string }[] = [];
  const spans: { name: string }[] = [];
  const manager = new ContentManager(memorySource(input), [], {
    config,
    plugins: config.plugins,
    observability: {
      logger: new NoopLogger(),
      tracer: new SinkTracer({
        onEvent: (event) => events.push(event),
        onSpan: (span) => spans.push(span),
      }),
    },
  });
  await manager.build({ incremental: true });
  buildMetrics.set(manager, {
    reusedContent: events.filter((event) => event.name === "content.reuse")
      .length,
    processedContent: spans.filter((span) => span.name === "content.process")
      .length,
    reusedOutputs: spans.filter(
      (span) => span.name === "output.dependencies.reuse",
    ).length,
    generatedOutputs: spans.filter(
      (span) => span.name === "output.dependencies.resolve",
    ).length,
    persistentCacheHits: events.filter(
      (event) => event.name === "persistentContentCache.hit",
    ).length,
  });
  return manager;
}
