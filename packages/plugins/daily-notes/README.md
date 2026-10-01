# @riebeckite/plugin-daily-notes

Surfaces short snippets extracted from Daily Notes as a site widget.

[日本語](./README_ja.md)

## Overview

A Daily Note is often one long, private journal file. This plugin reads the raw
manifest, picks notes under a configured directory, and extracts exactly one
short snippet per note using the first successful strategy:

1. a frontmatter key (`daily-summary` by default),
2. a section under a heading (`今日のひとこと` by default),
3. a fenced code block (`daily-snippet` by default).

When every strategy fails the note is skipped. The note body is never emitted
wholesale, so a long private note only contributes the snippet that opted in.

`sourceUrl` and `sourceTitle` are attached only when `isPublished` accepts the
note. An unpublished note's permalink and title stay `null`, so private notes
never leak their location.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";

export default defineConfig({
  // ...
  plugins: [dailyNotesPlugin()],
});
```

### Render the widget

```tsx
import DailyNotes, { getDailyNotes } from "@riebeckite/plugin-daily-notes";

const notes = getDailyNotes({ manifest, config });

return <DailyNotes notes={notes} />;
```

`getDailyNotes` reads `manifest.entries` (the raw view), sorts newest first,
and applies the default limit of 5. Pass `options` to override the location or
the extraction strategy:

```ts
getDailyNotes({
  manifest,
  config,
  options: {
    source: { directory: "Daily", pathPattern: "Daily/{YYYY}-{MM}-{DD}" },
    extract: { frontmatter: "daily-summary", section: "今日のひとこと" },
    widget: { limit: 3 },
  },
});
```

Set a strategy to `false` to disable it. `pathPattern` supports `{YYYY}`,
`{MM}`, `{DD}`, and `*` so a note filename can be matched precisely.

## Exports

- `dailyNotesPlugin(options?)` — plugin factory (registers `style.css`)
- `getDailyNotes({ manifest, config, options? })` — sorted `DailyNote[]`
- `DailyNotes` — widget component (`{ notes, limit? }`)
- Types: `DailyNote`, `DailyNotesOptions`, `ResolvedDailyNotesExtract`

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)

