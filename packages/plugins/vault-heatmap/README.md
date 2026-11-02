# @riebeckite/plugin-vault-heatmap

<!-- Generated from docs/docs/plugins/vault-heatmap.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

A calendar heatmap of vault activity, rendered at build time from frontmatter
dates. A fenced `vault-heatmap` block in any note displays the aggregate for the
whole published vault.

[日本語](./README_ja.md)

## Overview

````markdown
```vault-heatmap
weeks: 26
title: Writing activity
weekStart: monday
end: 2026-10-31
```
````

The plugin reads frontmatter date properties from each entry. By default,
`created` (falling back to `date` and `published`) counts on the creation date,
and `modified` (falling back to `updated`) counts on the modification date. Use
`createdFields` and `modifiedFields` to choose different properties; the first
valid date in each list wins. Entries without a valid date contribute nothing.

Only discoverable public content contributes. Drafts, unlisted entries, and
scheduled content that has not reached its publication time stay out of the
aggregate, so the heatmap cannot reveal unpublished activity.

The default end date is the latest activity date, not the wall clock. Repeated
builds without content changes therefore produce identical HTML.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { vaultHeatmap } from "@riebeckite/plugin-vault-heatmap";

export default defineConfig({
  // ...
  plugins: [
    vaultHeatmap({
      createdFields: ["created", "date", "published", "posted"],
      modifiedFields: ["modified", "updated"],
    }),
  ],
});
```

The plugin registers a derived view, `vault-heatmap.activity`, and renders the
block during the manifest phase. No client JavaScript is loaded for the heatmap.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `weeks` | `number` | `52` | Number of weeks, 1–104 |
| `title` | `string` | `Vault activity` | Caption above the grid |
| `weekStart` | `"sunday" \| "monday"` | `"sunday"` | First day of each week |
| `language` | `string` | `"vault-heatmap"` | Fenced code block language |
| `createdFields` | `string[]` | `["created", "date", "published"]` | Creation date properties, in fallback order |
| `modifiedFields` | `string[]` | `["modified", "updated"]` | Modification date properties, in fallback order |

## Block fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `weeks` | `number` | Overrides the plugin option, 1–104 |
| `title` | `string` | Overrides the plugin option |
| `weekStart` | `"sunday" \| "monday"` | Overrides the plugin option |
| `end` | `string` | Last day of the range as `YYYY-MM-DD`. Defaults to the latest activity date |

## Example

````markdown
```vault-heatmap
---
weeks: 26
title: Documentation activity
weekStart: monday
---
```
````

```vault-heatmap
---
weeks: 26
title: Documentation activity
weekStart: monday
---
```

## Output and accessibility

The output is static HTML: a `<figure>` containing a caption, a grid with one
cell per day, a summary of updates and active days, and a Less-to-More legend.
Each cell exposes its date and count in its title, and the grid has a
`role="img"` label summarizing the range and totals.

Colors use `color-mix` with the existing `--rb-color-success` token, so the
heatmap follows Default, Light, and Dark themes without fixed colors. Empty
days remain distinct from the page background. The grid scrolls horizontally on
narrow screens.

## Diagnostics

| Code | Severity | Meaning |
| ---- | -------- | ------- |
| `vault-heatmap-invalid` | `error` | The block is malformed, a date is invalid, or the derived activity view failed. The block is replaced by an error box |

## Related

- [Plugin system](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [Core API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/core-api.md)
