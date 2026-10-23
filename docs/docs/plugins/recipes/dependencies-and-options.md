---
date: 2026-10-20
title: "Declare Dependencies and Validate Options"
sidebar:
  label: "14. Declare Dependencies and Validate Options"
  order: 14
---
# Declare Dependencies and Validate Options

Capabilities let one plugin depend on another without importing it. A provider declares `provides`, a hard dependency declares `requires`, and a soft dependency declares `optional`. Resolution places providers before consumers, even when `order` says otherwise.

```ts
import {
  definePlugin,
  type ConfigValidationIssue,
} from "@riebeckite/core";

export type CatalogOptions = {
  catalogPath?: string;
};

export function catalogPlugin(options: CatalogOptions = {}) {
  return definePlugin({
    name: "catalog",
    options,
    provides: ["example.catalog"],
    validateOptions: validateCatalogOptions,
  });
}

export function catalogSearchPlugin() {
  return definePlugin({
    name: "catalog-search",
    order: -10,
    requires: ["example.catalog"],
  });
}

function validateCatalogOptions(
  options: CatalogOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];

  const issues: ConfigValidationIssue[] = [];
  if (
    options.catalogPath !== undefined &&
    !options.catalogPath.startsWith("/")
  ) {
    issues.push({
      path: "catalogPath",
      message: "Use an absolute path such as /catalog.json.",
    });
  }

  return issues;
}
```

If the consumer can work without the provider, replace `requires` with `optional`:

```ts
optional: ["content.folder-pages"]
```

`validateOptions` returns issues instead of throwing. Riebeckite reports them with the config path, so a user can fix the value without reading the plugin source.

A capability must have exactly one enabled provider. If two plugins provide the same capability, resolution fails.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
