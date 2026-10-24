---
date: 2026-10-20
title: "Report Diagnostics"
sidebar:
  label: "11. Report Diagnostics"
  order: 11
---
# Report Diagnostics

Return structured diagnostics instead of printing from a plugin. The CLI can group and display them, and tests can assert on codes.

```ts
import { definePlugin, type Diagnostic } from "@riebeckite/core";

export function descriptionDiagnostics() {
  let diagnostics: Diagnostic[] = [];

  return definePlugin({
    name: "description-diagnostics",
    buildStart: () => {
      diagnostics = [];
    },
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.discoverableEntries) {
        const description = entry.frontmatter.description;
        if (typeof description === "string" && description.trim() !== "") {
          continue;
        }

        diagnostics.push({
          code: "example/missing-description",
          severity: "warning",
          message: "Add a description for search and social previews.",
          slug: entry.slug,
          suggestion: "Set `description` in the frontmatter.",
        });
      }
    },
    addDiagnostics: () => diagnostics,
  });
}
```

`addDiagnostics` receives the plugin context, not the manifest. Collect entries in `onManifestCreated` as above. When a rule needs the final document, use `inspectGeneratedHtml`. The integration calls it for every emitted HTML file.

```ts
inspectGeneratedHtml: ({ path, html }) => {
  if (html.includes("<html lang=")) return [];

  return [
    {
      code: "example/missing-language",
      severity: "warning",
      message: "The document does not declare a language.",
      filePath: path,
    },
  ];
}
```

Use `warning` for content that can still ship. Use `error` when the problem should be treated as a release blocker by your tooling; whether it stops a command depends on the integration that consumes the diagnostic. Do not use diagnostics for operational logging; use `context.logger`.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
