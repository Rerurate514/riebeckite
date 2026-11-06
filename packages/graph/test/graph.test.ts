import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGraphDocument,
  buildRevealSchedule,
  buildVisibleGraph,
  createGraphSimulation,
  DEFAULT_GRAPH_SETTINGS,
  type GraphSettings,
  type GraphSourceEntry,
  normalizeGraphSettings,
  parseGraphQuery,
  readStoredGraphSettings,
  writeStoredGraphSettings,
} from "../index.js";

const entries: GraphSourceEntry[] = [
  {
    slug: "alpha",
    title: "Alpha",
    permalink: "/alpha",
    tags: ["topic/deep", "shared"],
    date: "2024-01-02",
    links: [
      { raw: "Beta", slug: "beta", kind: "note" },
      { raw: "Ghost", slug: null, kind: "unresolved" },
      { raw: "diagram.png", slug: "diagram.png", kind: "attachment" },
      { raw: "Hidden", slug: null, kind: "note" },
    ],
    assets: [{ path: "diagram.png" }],
  },
  {
    slug: "beta",
    title: "Beta",
    permalink: "/beta",
    tags: ["shared"],
    date: "2024-02-01",
    links: [{ raw: "Alpha", slug: "alpha", kind: "note" }],
  },
  {
    slug: "lonely",
    title: "Lonely",
    permalink: "/lonely",
    links: [],
  },
];

function settings(patch: Partial<GraphSettings> = {}): GraphSettings {
  return { ...DEFAULT_GRAPH_SETTINGS, ...patch };
}

test("buildGraphDocument creates notes, unresolved links, attachments and tags without leaking targets", () => {
  const document = buildGraphDocument(entries);
  const noteIds = document.nodes
    .filter((node) => node.kind === "note")
    .map((node) => node.id);
  assert.deepEqual(noteIds, ["alpha", "beta", "lonely"]);
  assert.ok(document.nodes.some((node) => node.kind === "unresolved"));
  assert.ok(
    document.nodes.some(
      (node) =>
        node.kind === "attachment" && node.id === "attachment:diagram.png",
    ),
  );
  assert.ok(
    document.nodes.some(
      (node) => node.kind === "tag" && node.title === "#shared",
    ),
  );
  assert.equal(
    document.links.some((link) => link.target === "hidden"),
    false,
    "missing private targets must not appear as links",
  );
  assert.equal(document.centerId, "alpha");
});

test("buildGraphDocument can omit unresolved, attachments and tags", () => {
  const document = buildGraphDocument(entries, {
    includeTags: false,
    includeAttachments: false,
    includeUnresolved: false,
  });
  assert.ok(document.nodes.every((node) => node.kind === "note"));
});

test("parseGraphQuery supports file, path, tag, quotes and negation", () => {
  const parsed = parseGraphQuery('file:"Alpha" -tag:shared path:/a tag:topic');
  assert.deepEqual(
    parsed.terms.map((term) => [term.field, term.value, term.negated]),
    [
      ["file", "Alpha", false],
      ["tag", "shared", true],
      ["path", "/a", false],
      ["tag", "topic", false],
    ],
  );
  assert.deepEqual(parsed.unsupportedOperators, []);

  const unsupported = parseGraphQuery("content:hello");
  assert.deepEqual(unsupported.unsupportedOperators, ["content"]);
});

test("buildVisibleGraph filters unresolved notes, orphans and non-matching nodes", () => {
  const document = buildGraphDocument(entries);
  const local = buildVisibleGraph({
    document,
    settings: settings({
      existingOnly: true,
      showTags: false,
      showAttachments: false,
    }),
    mode: "local",
    centerId: "alpha",
  });
  assert.deepEqual(
    local.nodes.map((node) => node.id),
    ["alpha", "beta"],
  );
  assert.equal(local.links.length, 2);

  const noOrphans = buildVisibleGraph({
    document,
    settings: settings({ showOrphans: false, showTags: false }),
    mode: "global",
  });
  assert.equal(
    noOrphans.nodes.some((node) => node.id === "lonely"),
    false,
  );

  const searched = buildVisibleGraph({
    document,
    settings: settings({
      search: "file:beta",
      showTags: false,
      showAttachments: false,
    }),
    mode: "global",
  });
  assert.deepEqual(
    searched.nodes.map((node) => node.id),
    ["beta"],
  );
});

test("local graph keeps an isolated center note when orphan filtering is off", () => {
  const document = buildGraphDocument(entries);
  const visible = buildVisibleGraph({
    document,
    settings: settings({
      showOrphans: false,
      showTags: false,
      showAttachments: false,
    }),
    mode: "local",
    centerId: "lonely",
  });
  assert.deepEqual(
    visible.nodes.map((node) => node.id),
    ["lonely"],
  );
  assert.equal(visible.centerId, "lonely");
});

test("local depth expands outward and inward symmetrically", () => {
  const document = buildGraphDocument(entries);
  const depth0 = buildVisibleGraph({
    document,
    settings: settings({ depth: 0, showTags: false, showAttachments: false }),
    mode: "local",
    centerId: "beta",
  });
  assert.ok(depth0.nodes.some((node) => node.id === "beta"));
  const depth1 = buildVisibleGraph({
    document,
    settings: settings({ depth: 1, showTags: false, showAttachments: false }),
    mode: "local",
    centerId: "beta",
  });
  const ids = depth1.nodes.map((node) => node.id);
  assert.ok(ids.includes("alpha"));
});

test("groups use first match, report unsupported operators and skip empty queries", () => {
  const document = buildGraphDocument(entries);
  const visible = buildVisibleGraph({
    document,
    settings: settings({
      showTags: false,
      showAttachments: false,
      groups: [
        { id: "empty", query: "", color: "#111111" },
        { id: "first", query: "tag:shared", color: "#ff0000" },
        { id: "second", query: "file:alpha", color: "#00ff00" },
        { id: "broken", query: "content:x", color: "#0000ff" },
      ],
    }),
    mode: "global",
  });
  const alpha = visible.nodes.find((node) => node.id === "alpha");
  assert.equal(alpha?.groupId, "first");
  assert.equal(alpha?.color, "#ff0000");
  assert.deepEqual(visible.unsupportedOperators, ["content"]);
});

test("node radius grows with degree", () => {
  const document = buildGraphDocument(entries);
  const visible = buildVisibleGraph({
    document,
    settings: settings({
      showTags: false,
      showAttachments: false,
      showOrphans: true,
    }),
    mode: "global",
  });
  const alpha = visible.nodes.find((node) => node.id === "alpha");
  const lonely = visible.nodes.find((node) => node.id === "lonely");
  assert.ok(alpha && lonely);
  assert.ok(alpha.radius > lonely.radius);
});

test("settings are clamped, stored and restored", () => {
  const normalized = normalizeGraphSettings({
    nodeSize: 99,
    depth: -3,
    groups: [{ id: "a", query: "tag:x", color: "not-a-color" }],
  });
  assert.equal(normalized.nodeSize, 2.5);
  assert.equal(normalized.depth, 0);
  assert.match(normalized.groups[0]?.color ?? "", /^#[0-9a-f]{6}$/i);

  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  writeStoredGraphSettings(storage, "graph", normalized);
  const restored = readStoredGraphSettings(storage, "graph");
  assert.equal(restored?.linkDistance, normalized.linkDistance);
  assert.equal(restored?.groups.length, 1);
});

test("reveal schedule uses real dates and appends undated nodes", () => {
  const document = buildGraphDocument(entries);
  const schedule = buildRevealSchedule(document.nodes);
  const beta = schedule.find((entry) => entry.id === "beta");
  const alpha = schedule.find((entry) => entry.id === "alpha");
  const lonely = schedule.find((entry) => entry.id === "lonely");
  assert.ok(beta && alpha && lonely);
  assert.equal(beta.dated, true);
  assert.ok(alpha.at < beta.at);
  assert.equal(lonely.dated, false);
  assert.ok(lonely.at > beta.at);
});

test("reveal schedule never fabricates dates when every node is undated", () => {
  const document = buildGraphDocument(entries.slice(2));
  const schedule = buildRevealSchedule(document.nodes);
  assert.ok(schedule.every((entry) => !entry.dated));
  assert.equal(schedule.length, document.nodes.length);
  assert.ok(schedule.every((entry) => entry.at > 0 && entry.at <= 1));
});

test("simulation is deterministic, settles and reheats on drag", () => {
  const links = Array.from({ length: 11 }, (_, index) => ({
    source: `n${index}`,
    target: `n${index + 1}`,
  }));
  const options = {
    centerForce: 0.35,
    repelForce: 600,
    linkForce: 0.7,
    linkDistance: 100,
  };
  const first = createGraphSimulation({
    nodeIds: links.flatMap((link) => [link.source, link.target]),
    links,
    options,
  });
  const second = createGraphSimulation({
    nodeIds: links.flatMap((link) => [link.source, link.target]),
    links,
    options,
  });
  for (let index = 0; index < 20; index += 1) {
    first.tick();
    second.tick();
  }
  assert.deepEqual(
    first.nodes.map((node) => [
      node.id,
      Math.round(node.x),
      Math.round(node.y),
    ]),
    second.nodes.map((node) => [
      node.id,
      Math.round(node.x),
      Math.round(node.y),
    ]),
  );

  for (let index = 0; index < 800 && first.isActive(); index += 1) {
    first.tick();
  }
  assert.equal(first.isActive(), false);

  first.fix("n3", 120, -80);
  assert.equal(first.isActive(), true);
  const pinned = first.nodes.find((node) => node.id === "n3");
  first.tick();
  assert.equal(pinned?.x, 120);
  assert.equal(pinned?.y, -80);
  first.release("n3");
  assert.equal(first.isActive(), true);
});
