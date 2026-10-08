# Daily Notes

Surfaces short snippets extracted from Daily Notes as a site widget.

[日本語](./daily-notes.ja.md)

## Recommended placement

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

`dailyNotesPlugin()` registers data and styles but does not render the widget.
The Site owns placement; a homepage section is the recommended location.

## Quick Start

```ts
import { defineConfig } from "@riebeckite/core";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";

export default defineConfig({
  // ...
  plugins: [dailyNotesPlugin()],
});
```

Render the widget explicitly in a homepage route or site-owned homepage section:

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
    source: {
      directory: "Daily",
      pathPattern: "Daily/{YYYY}-{MM}-{DD}",
      dateFormat: "YYYY/MM/DD",
    },
    extract: { frontmatter: "daily-summary", section: "今日のひとこと" },
    widget: { limit: 3 },
    dateFormat: "iso",
    locale: "en",
  },
});
```

Set a strategy to `false` to disable it. `pathPattern` supports `{YYYY}`,
`{MM}`, `{DD}`, and `*` so a note filename can be matched precisely.

`source.dateFormat` is the Obsidian/Moment date format used by the note
filenames (default `YYYY-MM-DD`). Set it to match Obsidian's Daily Notes date
format (for example `YYYY/MM/DD` or `YYYY.MM.DD`); the slug date is read with
exactly that format, and an unsupported format resolves no date rather than
guessing another one.

`dateFormat` controls the widget date: `"iso"` (the default, `YYYY-MM-DD`),
`"long"`, or `"short"`. `"long"` and `"short"` are rendered with `locale`
(default `"en"`). The machine-readable `YYYY-MM-DD` value stays on the
`<time datetime>` attribute regardless, and `DailyNote.date` keeps that ISO
form while `DailyNote.dateDisplay` holds the formatted text.

Move or remove the `DailyNotes` element to reposition or remove the widget. No
official Starter renders Daily Notes by default.

## Exports

- `dailyNotesPlugin(options?)` — plugin factory (registers `style.css`)
- `getDailyNotes({ manifest, config, options? })` — sorted `DailyNote[]`
- `DailyNotes` — widget component (`{ notes, limit? }`)
- `resolveDisplayOptions(options?)` — apply date-format defaults
- `formatDailyNoteDate(dateIso, display)` — pure date formatter
- Constants: `DEFAULT_DAILY_NOTES_DATE_FORMAT`, `DEFAULT_DAILY_NOTES_LOCALE`,
  `DEFAULT_SLUG_DATE_FORMAT`
- Types: `DailyNote`, `DailyNotesOptions`, `DailyNotesDateFormat`,
  `ResolvedDailyNotesExtract`, `ResolvedDailyNotesDisplay`

## See also

- [Plugin guide](../reference/plugin-api.md)
