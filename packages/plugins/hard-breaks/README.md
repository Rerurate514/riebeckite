# @riebeckite/plugin-hard-breaks

<!-- Generated from docs/docs/plugins/hard-breaks.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render ordinary Markdown line breaks as `<br>` elements, matching Obsidian's
behavior when "Strict line breaks" is turned off.

[日本語](./README_ja.md)

## Overview

In standard Markdown, a single newline inside a paragraph is a soft break: it
is rendered as a space. `hardBreaks()` registers the
[`remark-breaks`](https://github.com/remarkjs/remark-breaks) transformer on the
Riebeckite Markdown pipeline so every soft break becomes a `<br>` element at
build time.

The conversion happens on the Markdown AST before the tree is converted to
HTML, so code blocks, inline code, and explicit hard breaks keep their meaning.
The plugin adds no client JavaScript and no CSS.

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { hardBreaks } from "@riebeckite/plugin-hard-breaks";

export default defineConfig({
  // ...
  plugins: [hardBreaks()],
});
```

Add `hardBreaks()` to the `plugins` array of `riebeckite.config.ts`. The plugin
is opt-in: without this entry, the pipeline keeps the standard Markdown soft
break behavior.

## Usage

```ts
import { hardBreaks } from "@riebeckite/plugin-hard-breaks";

hardBreaks();
```

The factory takes no options.

## Before and after

Input:

```md
今日はいい天気です。
散歩に行きました。
明日も晴れるといいな。
```

Without the plugin (standard Markdown), the three lines render on one line.
With `hardBreaks()`:

```html
<p>今日はいい天気です。<br>
散歩に行きました。<br>
明日も晴れるといいな。</p>
```

## Behavior

| Input | Result |
| --- | --- |
| A single newline inside a paragraph | Becomes a `<br>` |
| A blank line between paragraphs | Still splits paragraphs |
| A fenced code block | Unchanged |
| Inline code | Unchanged |
| Headings | Keep their Markdown heading structure |
| Line breaks in list items | Handled by the Markdown AST structure |
| Line breaks in blockquotes | Treated like ordinary paragraphs |
| An explicit hard break (two trailing spaces or `\`) | Not converted twice |
| Raw HTML in Markdown | Left as-is |

## Limitations

- The plugin converts soft breaks only. It does not change how blank lines,
  lists, or code blocks are parsed.
- The result is decided at build time; rebuild the site after changing the
  plugin list.

## Obsidian relationship

Obsidian has a setting called "Strict line breaks". When it is off, a single
newline is shown as a line break. This plugin brings that same behavior to
Riebeckite's rendered pages.

## Exports

- `hardBreaks()` — plugin factory
- `hardBreaksPlugin` — alias of `hardBreaks`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
