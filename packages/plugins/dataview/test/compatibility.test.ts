import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { dataview } from "../index.js";

function source(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((path) => ({ path }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

function config() {
  return resolveConfig({
    site: { title: "Test" },
    content: { filters: { publishStrategy: "explicit" } },
  });
}

async function render(
  files: Record<string, string>,
  publishingBuildTime = "2026-11-01T00:00:00.000Z",
): Promise<string> {
  const manager = new ContentManager(source(files), [], {
    config: config(),
    plugins: [dataview()],
    publishingBuildTime,
  });
  const manifest = await manager.getManifest();
  return manifest.bySlug.get("index")?.html ?? "";
}

const VAULT = {
  "index.md": `---
publish: true
title: Index
---

\`\`\`dataview
TABLE status, priority, (priority * 2) AS "Double"
FROM #project
WHERE status = "active"
SORT priority DESC
\`\`\`

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Note", status
FROM #project
SORT file.name ASC
\`\`\`

\`\`\`dataview
LIST priority
FROM #project
SORT priority DESC
\`\`\`

\`\`\`dataview
TASK
WHERE !completed
SORT line ASC
\`\`\`

\`\`\`dataview
TASK
WHERE due
\`\`\`

\`\`\`dataview
TABLE length(tags) AS "Tag count"
FROM #project
\`\`\`

\`\`\`dataview
TABLE WITHOUT ID author
FROM #project
FLATTEN authors AS author
\`\`\`

\`\`\`dataview
LIST
FROM #project
GROUP BY status
\`\`\`
`,
  "alpha.md": `---
publish: true
tags: [project]
status: active
---

priority:: 3
authors:: [Ann, Bob]
`,
  "beta.md": `---
publish: true
tags: [project]
status: paused
---

priority:: 1
status:: active
authors:: [Cara]
`,
  "tasks.md": `---
publish: true
tags: [project]
status: active
---

- [ ] Alpha task [due:: 2026-11-10] [priority:: 2]
- [x] Beta task [due:: 2025-01-01]
- [ ] Gamma task
`,
  "gamma.md": `---
publish: true
tags: [project]
status: paused
---

priority:: 2
`,
};

test("TABLE evaluates inline fields, computed columns, and the ID column", async () => {
  const html = await render(VAULT);

  assert.match(html, /<th[^>]*>File<\/th>/);
  assert.match(html, /<th[^>]*>status<\/th>/);
  assert.match(html, /<th[^>]*>Double<\/th>/);
  assert.match(html, /<td[^>]*>active<\/td><td[^>]*>3<\/td><td[^>]*>6<\/td>/);
});

test("inline fields override frontmatter for the same key", async () => {
  const html = await render(VAULT);

  assert.match(html, /beta<\/a><\/td><td[^>]*>active<\/td>/);
  assert.doesNotMatch(html, /beta<\/a><\/td><td[^>]*>paused<\/td>/);
});

test("TABLE WITHOUT ID drops the implicit file column", async () => {
  const tables = (await render(VAULT)).split('data-dataview-type="table"');
  const withoutId = tables[2] ?? "";

  assert.match(withoutId, /<th[^>]*>Note<\/th>/);
  assert.doesNotMatch(withoutId, /<th[^>]*>File<\/th>/);
});

test("LIST evaluates its expression per entry", async () => {
  const html = await render(VAULT);

  assert.match(html, /alpha<\/a>[\s\S]{0,80}rb-dataview__meta">3</);
});

test("TASK filters individual tasks, not notes", async () => {
  const taskBlocks = (await render(VAULT)).split('data-dataview-type="task"');
  const openBlock = taskBlocks[1] ?? "";

  assert.match(openBlock, /Alpha task/);
  assert.match(openBlock, /Gamma task/);
  assert.doesNotMatch(openBlock, /Beta task/);
});

test("TASK inline fields are available to WHERE", async () => {
  const html = await render(VAULT);

  const taskBlocks = html.split('data-dataview-type="task"');
  const dueBlock = taskBlocks[2] ?? "";

  assert.match(dueBlock, /Alpha task/);
  assert.match(dueBlock, /Beta task/);
  assert.doesNotMatch(dueBlock, /Gamma task/);
  assert.doesNotMatch(dueBlock, /\[due::/);
});

test("functions, FLATTEN aliases, and GROUP BY run in command order", async () => {
  const html = await render(VAULT);

  assert.match(html, />Ann</);
  assert.match(html, />Bob</);
  assert.match(html, />Cara</);
  assert.match(html, /rb-dataview__group">active</);
  assert.match(html, /rb-dataview__group">paused</);
});

test("private notes never enter inline field or task queries", async () => {
  const html = await render({
    ...VAULT,
    "secret.md": `---
tags: [project]
status: active
---

SECRET_INLINE_MARKER:: active

- [ ] SECRET_TASK_MARKER
`,
  });

  assert.doesNotMatch(html, /SECRET_INLINE_MARKER/);
  assert.doesNotMatch(html, /SECRET_TASK_MARKER/);
});

test("build time is stable for date-dependent expressions", async () => {
  const files = {
    "index.md": `---
publish: true
---

\`\`\`dataview
TABLE WITHOUT ID file.link AS "Due", date(today) AS "Today"
FROM #project
WHERE due >= date("2026-11-01")
\`\`\`
`,
    "alpha.md": `---
publish: true
tags: [project]
due: 2026-11-10
---
`,
    "beta.md": `---
publish: true
tags: [project]
due: 2026-10-01
---
`,
  };

  const html = await render(files);
  assert.match(html, />alpha</);
  assert.doesNotMatch(html, />beta</);
  assert.match(html, /2026-11-01/);
});
