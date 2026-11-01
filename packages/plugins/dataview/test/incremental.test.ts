import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  ContentManager,
  type ContentSource,
  resolveConfig,
} from "@riebeckite/core";
import { dataview } from "../index.js";

function memorySource(files: Record<string, string>): ContentSource {
  return {
    async scan() {
      return Object.keys(files).map((file) => ({ path: file }));
    },
    async read(entry) {
      return files[entry.path] ?? "";
    },
  };
}

async function build(
  files: Record<string, string>,
  directory: string,
): Promise<string> {
  const config = resolveConfig({
    site: { title: "Dataview" },
    content: { filters: { publishStrategy: "explicit" } },
    plugins: [dataview()],
  });
  config.buildDirectory = directory;
  config.cache = { enabled: true, directory: path.join(directory, "cache") };
  const content = new ContentManager(memorySource(files), [], {
    config,
    publishingBuildTime: "2026-11-01T00:00:00.000Z",
  });
  try {
    const manifest = await content.build({ incremental: true });
    return manifest.bySlug.get("index")?.html ?? "";
  } finally {
    await content.dispose();
  }
}

test("inline field edits invalidate the cached dataview output", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "riebeckite-dataview-"),
  );
  const files: Record<string, string> = {
    "index.md": `---
publish: true
---

\`\`\`dataview
TABLE status
FROM #project
\`\`\`
`,
    "alpha.md": `---
publish: true
tags: [project]
---

status:: active
`,
  };

  const first = await build(files, directory);
  assert.match(first, />active</);

  files["alpha.md"] = `---
publish: true
tags: [project]
---

status:: paused
`;
  const second = await build(files, directory);
  const cold = await build(
    files,
    await fs.mkdtemp(path.join(os.tmpdir(), "riebeckite-dataview-cold-")),
  );

  assert.equal(second, cold);
  assert.match(second, />paused</);
  assert.doesNotMatch(second, />active</);
});
