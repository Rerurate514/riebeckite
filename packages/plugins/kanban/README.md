# @riebeckite/plugin-kanban

Render Obsidian Kanban boards as static HTML at build time. No client-side
JavaScript is required.

[日本語](./README_ja.md)

## Overview

`kanban()` turns kanban markdown into a board. It accepts two kinds of input:

- The body of a ` ```kanban ` fenced code block.
- A whole note whose frontmatter contains `kanban-plugin` (enabled by
  `autoDetect`, on by default).

Columns are lines that start with `## ` (configurable with `columnMarker`).
Every list item that follows becomes a card: `- [ ] text` (unchecked),
`- [x] text` (checked), or a plain `- text` item.

Card text supports inline `[[wikilinks]]` (resolved to real hrefs from the
content manifest), `#tags`, and simple `**bold**` emphasis.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { kanban } from "@riebeckite/plugin-kanban";

export default defineConfig({
  // ...
  plugins: [kanban()],
});
```

## Board syntax

````md
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[index]]
- [x] Review **metadata**

## Done

- [x] Publish the fixture
````

A note that is itself a board looks the same, with the board written directly
in the body and `kanban-plugin` set in the frontmatter:

```md
---
title: Roadmap
kanban-plugin: board
---

## Planned

- [ ] Ship the plugin
```

## Output

```html
<div class="rb-kanban" data-kanban data-kanban-plugin data-kanban-source="note">
  <div class="rb-kanban__board" data-kanban-board>
    <div class="rb-kanban__column" data-column="Backlog">
      <header class="rb-kanban__column-title">Backlog</header>
      <ul class="rb-kanban__cards">
        <li class="rb-kanban__card" data-checked="false">
          <span class="rb-kanban__checkbox" data-checked="false" aria-hidden="true"></span>
          <span class="rb-kanban__card-text">Draft the release notes</span>
        </li>
      </ul>
    </div>
  </div>
</div>
```

`data-kanban-source` is `"block"` for a fenced block and `"note"` for an
auto-detected note.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-kanban"` | Root CSS class; block names derive from it |
| `language` | `string` | `"kanban"` | Fence language to target |
| `columnMarker` | `string` | `"##"` | Prefix that starts a column |
| `autoDetect` | `boolean` | `true` | Render notes with `kanban-plugin` frontmatter |
| `fallback` | `boolean` | `true` | Keep unsupported lines in a `<details>` fallback |

## Fallback and diagnostics

Lines that are neither a column nor a list item are kept verbatim inside
`details.rb-kanban__fallback` when `fallback` is enabled, so nothing is lost.

Parse problems (for example a block with no columns) are attached to the
document with a `@riebeckite/plugin-kanban` message.

## Exports

- `kanban(options?)` — plugin factory
- `kanbanPlugin` — alias of `kanban`
- `resolveKanbanOptions(options?)` — apply defaults
- `remarkKanban(options?)` — remark transform used by the plugin
- `parseKanban(source, options)`, `renderKanban(result, options, resolveLink, source)`
- `stripFrontmatter(markdown)`, `isKanbanNote(frontmatter)`
- `createKanbanLinkResolver(manifest)`, `createKanbanPlaceholder(source)`
- Types: `KanbanOptions`, `ResolvedKanbanOptions`, `KanbanCard`, `KanbanColumn`,
  `KanbanParseResult`, `KanbanLinkResolver`, `RemarkKanbanOptions`

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)

