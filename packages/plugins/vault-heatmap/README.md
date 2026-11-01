# @riebeckite/plugin-vault-heatmap

Calendar heatmap of dated vault activity for Riebeckite. The plugin reads `created`, `modified`, and `updated` frontmatter from discoverable content and renders a fenced `vault-heatmap` block at build time.

[日本語](./README_ja.md)

````markdown
```vault-heatmap
weeks: 26
title: Writing activity
weekStart: monday
```
````

Only discoverable public content contributes; drafts, unlisted, and scheduled content stay out of the aggregate. The default end date is the latest activity date, so repeated builds without activity changes produce identical output.

```ts
import { vaultHeatmap } from "@riebeckite/plugin-vault-heatmap";

plugins: [vaultHeatmap()];
```

Options: `weeks` (1–104, default 52), `title`, `weekStart` (`sunday` or `monday`), and `language`. The block may override `weeks`, `title`, `weekStart`, and `end` (`YYYY-MM-DD`). The heatmap is static HTML with no client JavaScript.
