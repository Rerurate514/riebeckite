# @riebeckite/plugin-shortcodes

A generic shortcode system for Markdown, built on `remark-directive`.

[日本語](./README_ja.md)

## Overview

`shortcodes()` turns `remark-directive` syntax into HTML at Markdown time.
It supports leaf shortcodes (`::name[label]{key=value}`) and container
shortcodes (`:::name[label]{attrs}` … `:::`), and ships an extensible registry
so projects can add their own renderers on top of the built-ins.

Output is rendered into `mdast` `html` nodes and wrapped in a `span` (leaf) or
`div` (container) carrying `rb-shortcode rb-shortcode--<name>`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  // ...
  plugins: [shortcodes()],
});
```

Styles ship in `style.css`.

## Syntax

```
::kbd[Ctrl+S]

::youtube[id=dQw4w9WgXcQ]

:::note[Heads up]{type=warning}
Container bodies support **Markdown**.
:::
```

- `::name[label]{key=value}` — leaf shortcode, rendered inline.
- `:::name[label]{key=value}` … `:::` — container shortcode; the body is
  rendered by the normal Markdown pipeline.

Unknown shortcodes emit a `shortcodes-unknown` diagnostic and stay on the page
as escaped text. Malformed attributes emit `shortcodes-invalid` and are
ignored.

## Built-in shortcodes

| Name | Kind | Attributes | Output |
| ---- | ---- | ---------- | ------ |
| `figure` | leaf / container | `src`/`url`/`image`, `alt`, `caption`, `width`, `height` | `<figure>` with image and caption |
| `youtube` | leaf | `id`/`video` or `url`/`src`, `title` | Privacy-friendly `youtube-nocookie.com` embed |
| `vimeo` | leaf | `id`/`video` or `url`/`src`, `title` | `player.vimeo.com` embed (`dnt=1`) |
| `gist` | leaf | `user` + `id`, or `url`, `file` | GitHub Gist embed with `<noscript>` link |
| `kbd` | leaf | label or `keys` | `<kbd>` elements split on `+` |
| `badge` | leaf | label or `text`, `variant`/`type`/`color`, `title` | Inline badge |
| `details` | container | label or `summary`, `open` | `<details>` disclosure |
| `spoiler` | container | label or `summary`, `open` | `details` alias with a different class |
| `note` | leaf / container | label or `title`, `type`/`variant` | Callout box |
| `callout` | leaf / container | label or `title`, `type`/`variant` | `note` alias with a different class |
| `link-card` | leaf | `url`/`href`, `title`, `description`, `image`/`icon` | Link preview card |
| `file` | leaf | `url`/`src`/`path`, `name`/`label`, `size` | Download link |

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-shortcode"` | Root CSS class of every wrapper |
| `language` | `string` | – | BCP-47 tag applied to wrappers as `lang` |
| `builtins` | `boolean` | `true` | Register the built-in renderers |
| `shortcodes` | `Record<string, ShortcodeRenderer>` | `{}` | Custom renderers, merged over the built-ins |

## Custom renderers

```ts
import { shortcodes } from "@riebeckite/plugin-shortcodes";

shortcodes({
  shortcodes: {
    mark: ({ label, attributes }) => `<mark>${label}</mark>`,
  },
});
```

A `ShortcodeRenderer` receives `{ name, label, attributes, childrenHtml,
context, container }` and returns a string. For container shortcodes the plugin
wraps the result in `<div class="rb-shortcode rb-shortcode--<name>">` and
replaces `childrenHtml` with the rendered body, so container renderers must echo
`input.childrenHtml` where the body belongs. Renderers are synchronous and must
escape any user input themselves — `escapeHtml` and `escapeHtmlAttribute` are
re-exported from `@riebeckite/core`.

## Exports

- `shortcodes(options?)` / `shortcodesPlugin` — plugin factory
- `remarkShortcodes(options?)` — standalone remark transform
- `renderShortcode(request, options)` — render a single shortcode
- `resolveShortcodeOptions(options?)` — normalize options
- `builtinShortcodes`, `builtinShortcodeNames` — the built-in registry
- Types: `ShortcodeRenderer`, `ShortcodeOptions`, `ResolvedShortcodeOptions`,
  `ShortcodeRenderInput`, `ShortcodeRenderRequest`, `ShortcodeAttributes`,
  `RemarkShortcodesOptions`

## See also

- [Plugin guide](../../../docs/en/plugin-system.md)
