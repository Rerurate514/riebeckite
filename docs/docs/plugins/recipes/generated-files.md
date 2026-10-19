---
title: "Generate Files"
sidebar:
  label: "13. Generate Files"
  order: 13
---
# Generate Files

`planGeneratedOutputs` declares files before the build, together with the dependencies that decide whether they are stale. This is the preferred way to emit static files because incremental builds can track them.

This recipe writes `llms.txt` from public entries.

```ts
import { definePlugin } from "@riebeckite/core";

export function llmsTxtPlugin() {
  return definePlugin({
    name: "llms-txt",
    planGeneratedOutputs: ({ manifest }) => [
      {
        path: "llms.txt",
        content: [
          "# Riebeckite site",
          "",
          ...manifest.discoverableEntries.map(
            (entry) => `- <${entry.permalink}> ${entry.title}`,
          ),
        ].join("\n"),
        dependencies: [{ type: "global" }],
      },
    ],
  });
}
```

The path is relative to the build output and cannot start with `/`, use `..`, target `assets/`, or target `.riebeckite/`. Leave `attachments/` to content assets.

For an integration-style plugin that already runs at the end of the build, `buildEnd` can emit directly:

```ts
buildEnd: ({ output }) => {
  output.emit({
    path: "build-info.json",
    content: JSON.stringify({ generated: true }),
    dependencies: [{ type: "global" }],
  });
}
```

Use `output.emit` for general build output and `output.emitAsset` for generated asset files under `assets/`. Both are unavailable outside the build lifecycle. `emit` cannot write under `assets/`, and `emitAsset` cannot write under `attachments/`. Every planned output needs at least one dependency; do not use an empty array to mean "always rebuild".

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
