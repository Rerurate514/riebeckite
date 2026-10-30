---
date: 2026-10-24
title: Timeline
---
# Timeline

[日本語](./timeline.ja.md)

Builds a chronological page from discoverable notes with a valid frontmatter date. It also renders the `timeline` and `timeline-labeled` fenced-block syntax from [George-debug/obsidian-timeline](https://github.com/George-debug/obsidian-timeline) at build time.

## Installation

```bash
pnpm add @riebeckite/plugin-timeline
```

## Generated page

```ts
import { timeline } from "@riebeckite/plugin-timeline";

export default {
  plugins: [timeline()],
};
```

By default, every discoverable note with the first valid value of `date`, `published`, or `created` is included, oldest first. `draft`, unpublished scheduled notes, and `unlisted` notes are never included. A frontmatter date is only for this generated page; it is unrelated to dates written in inline timelines.

Use selectors to limit automatic inclusion. Folder and tag conditions are ORed; `exclude` always wins. Folder names are normalized before a directory-boundary match, and tags use Riebeckite's normal tag normalization.

```ts
timeline({
  basePath: "/timeline",
  include: {
    folders: ["Events", "Projects/History"],
    tags: ["release", "milestone"],
  },
  exclude: { tags: ["hidden"] },
});
```

`timeline: true` explicitly includes a dated note and `timeline: false` explicitly excludes it. Public discovery and `exclude` still take precedence. For the former marked-notes-only behavior, use `selection: "marked"`. The legacy `key` option remains supported: it names this boolean marker (default: `"timeline"`).

## Inline Obsidian syntax

Both forms preserve event order. Date labels are text, so values such as `2026年`, `17th century`, and `Before launch` do not need to parse as dates.

````md
```timeline
[line-3, body-2, active-color-text-accent]
+ 2026-01-01
+ Development starts
+ **Riebeckite** development starts.

+ Before launch
+ First release
+ See [[release-notes]] for details.
```

```timeline-labeled
date: 2026-06-01
title: First release
content:
Published the first version.

date: 17th century
title: Historical event
content:
This body can span multiple paragraphs.
```
````

Blank lines and multiline bodies are allowed. Markdown in dates, titles, and bodies uses the normal pipeline, including links, inline code, and Obsidian Wiki Links when that plugin is enabled. Raw HTML and URLs remain subject to the normal sanitizer and link-resolution/publication rules.

The supported Obsidian options are `line-2` through `line-5`, `body-2` through `body-4`, and the documented `active-color-*` values. Unknown options are ignored; malformed blocks stay as code blocks rather than being guessed. The original plugin's JavaScript, footnotes/node-link helpers, custom CSS variables, and interactive behavior are not implemented.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/timeline"` | Generated page path. An empty string disables it. |
| `include` / `exclude` | `{ folders?: string[]; tags?: string[] }` | — | Automatic selection conditions. |
| `selection` | `"automatic" \| "marked"` | `"automatic"` | Use `"marked"` for the legacy opt-in behavior. |
| `key` | `string` | `"timeline"` | Legacy explicit boolean marker key. |
| `title` | `string` | `"Timeline"` | Page heading and title. |
| `className` | `string` | `"rb-timeline"` | Additional root CSS class for the generated page. |

## Live example

[Open the Timeline](/timeline)
