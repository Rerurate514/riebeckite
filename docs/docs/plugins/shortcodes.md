# Shortcodes

A generic shortcode system for Markdown, built on `remark-directive`.

[日本語](./shortcodes.ja.md)

## Overview

`shortcodes()` turns `remark-directive` syntax into HTML at Markdown time. It
supports inline shortcodes (`:name[label]{key=value}`), block leaf shortcodes
(`::name[label]{key=value}`), and container shortcodes
(`:::name[label]{attrs}` … `:::`), and ships an extensible registry so projects
can add their own renderers on top of the built-ins.

Inline shortcodes render as a `span` inside the surrounding paragraph; block and
container shortcodes render as a `div`. Every wrapper carries
`rb-shortcode rb-shortcode--<name>`.

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
:badge[New]{variant=success}

::kbd[Ctrl+S]

::youtube[id=dQw4w9WgXcQ]

:::note[Heads up]{type=warning}
Container bodies support **Markdown**.
:::
```

- `:name[label]{key=value}` — inline shortcode, rendered as a `span` inside the
  current paragraph. Only names in `inlineShortcodes` can be used inline;
  built-ins opt in with `badge`, `kbd`, `link-card`, and `file`.
- `::name[label]{key=value}` — block leaf shortcode, rendered as a `div`.
- `:::name[label]{key=value}` … `:::` — container shortcode; the body is
  rendered by the normal Markdown pipeline.

A shortcode that is only defined as a block emits a
`shortcodes-inline-unsupported` diagnostic when written with `:` and stays on
the page as escaped text. Unknown shortcodes emit a `shortcodes-unknown`
diagnostic, and malformed attributes emit `shortcodes-invalid` and are ignored.

## Built-in shortcodes

| Name | Kind | Inline | Attributes | Output |
| ---- | ---- | ------ | ---------- | ------ |
| `figure` | leaf / container | – | `src`/`url`/`image`, `alt`, `caption`, `width`, `height` | `<figure>` with image and caption |
| `youtube` | leaf | – | `id`/`video` or `url`/`src`, `title` | Privacy-friendly `youtube-nocookie.com` embed |
| `vimeo` | leaf | – | `id`/`video` or `url`/`src`, `title` | `player.vimeo.com` embed (`dnt=1`) |
| `gist` | leaf | – | `user` + `id`, or `url`, `file` | GitHub Gist embed with `<noscript>` link |
| `kbd` | leaf | yes | label or `keys` | `<kbd>` elements split on `+` |
| `badge` | leaf | yes | label or `text`, `variant`/`type`/`color`, `title` | Inline badge |
| `details` | container | – | label or `summary`, `open` | `<details>` disclosure |
| `spoiler` | container | – | label or `summary`, `open` | `details` alias with a different class |
| `note` | leaf / container | – | label or `title`, `type`/`variant` | Callout box |
| `callout` | leaf / container | – | label or `title`, `type`/`variant` | `note` alias with a different class |
| `link-card` | leaf | yes | `url`/`href`, `title`, `description`, `image`/`icon` | Link preview card |
| `file` | leaf | yes | `url`/`src`/`path`, `name`/`label`, `size` | Download link |

## Actual Rendering

The following examples demonstrate all 12 built-in shortcodes. Each example shows the Markdown syntax followed by the shortcode itself, allowing you to see how it renders when the Shortcodes plugin is enabled.

### Badge

Display status indicators or labels inline with text.

```md
This feature is :badge[New]{variant=success}.

Current status: :badge[Beta]{variant=warning}
```

This feature is :badge[New]{variant=success}.

Current status: :badge[Beta]{variant=warning}

### Keyboard (kbd)

Display keyboard shortcuts using semantic `<kbd>` elements.

```md
Press :kbd[Ctrl+S] to save your changes.

Use :kbd[Ctrl+K] to open search.
```

Press :kbd[Ctrl+S] to save your changes.

Use :kbd[Ctrl+K] to open search.

### Note

Highlight useful information, tips, and other supplementary content.

```md
:::note[Tip]{type=info}
You can use **Markdown** inside this container.

- Lists
- **Bold text**
- [Links](https://example.com)
:::
```

:::note[Tip]{type=info}
You can use **Markdown** inside this container.

- Lists
- **Bold text**
- [Links](https://example.com)
:::

### Callout

Display important notices or warnings. `callout` is an alias of `note` with a different CSS class.

```md
:::callout[Warning]{type=warning}
Remember to rebuild your site after changing the configuration file.
:::
```

:::callout[Warning]{type=warning}
Remember to rebuild your site after changing the configuration file.
:::

### Details

Create collapsible sections that users can expand to reveal additional content.

```md
:::details[Show details]
This content is hidden until the section is expanded.

You can include **Markdown** and lists:

- Item A
- Item B
:::
```

:::details[Show details]
This content is hidden until the section is expanded.

You can include **Markdown** and lists:

- Item A
- Item B
:::

### Spoiler

Hide content behind an expandable section. `spoiler` works like `details` but uses a different CSS class.

```md
:::spoiler[Reveal spoiler]
The hidden content appears when the user expands this section.

**Markdown** is supported here too.
:::
```

:::spoiler[Reveal spoiler]
The hidden content appears when the user expands this section.

**Markdown** is supported here too.
:::

### Figure

Display images with optional captions and dimensions using semantic `<figure>` markup.

```md
::figure[Sample image]{src="https://placehold.co/800x400/png" alt="Sample placeholder image" caption="Figure 1: Example image"}
```

::figure[Sample image]{src="https://placehold.co/800x400/png" alt="Sample placeholder image" caption="Figure 1: Example image"}

### YouTube

Embed YouTube videos using the privacy-enhanced `youtube-nocookie.com` domain.

```md
::youtube[id=dQw4w9WgXcQ]
```

::youtube[id=dQw4w9WgXcQ]

### Vimeo

Embed Vimeo videos with the `dnt=1` privacy parameter.

```md
::vimeo[id=76979871]
```

::vimeo[id=76979871]

### GitHub Gist

Embed GitHub Gist code snippets directly into a page. A fallback link is provided for environments where JavaScript is disabled.

```md
::gist{user=octocat id=aa5a315d61ae9438b18d}
```

::gist{user=octocat id=aa5a315d61ae9438b18d}

### Link Card

Display external links as preview cards with titles and descriptions.

```md
::link-card[GitHub]{url="https://github.com" title="GitHub" description="A platform for hosting code and collaborating on software projects"}
```

::link-card[GitHub]{url="https://github.com" title="GitHub" description="A platform for hosting code and collaborating on software projects"}

### File

Create downloadable file links with optional filenames and file sizes.

```md
::file[Sample PDF]{url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" name="sample.pdf" size="13 KB"}
```

::file[Sample PDF]{url="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" name="sample.pdf" size="13 KB"}

The code blocks above show the original Markdown syntax. The shortcode expressions immediately below them serve as live rendering examples when processed by Riebeckite with the Shortcodes plugin enabled.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-shortcode"` | Root CSS class of every wrapper |
| `language` | `string` | – | BCP-47 tag applied to wrappers as `lang` |
| `builtins` | `boolean` | `true` | Register the built-in renderers |
| `shortcodes` | `Record<string, ShortcodeRenderer>` | `{}` | Custom renderers, merged over the built-ins |
| `inlineShortcodes` | `readonly string[]` | `[]` | Extra names allowed in the inline `:` form |

## Custom renderers

```ts
import { shortcodes } from "@riebeckite/plugin-shortcodes";

shortcodes({
  shortcodes: {
    mark: ({ label, attributes }) => `<mark>${label}</mark>`,
  },
  inlineShortcodes: ["mark"],
});
```

A `ShortcodeRenderer` receives `{ name, label, attributes, childrenHtml,
context, container }` and returns a string. A custom renderer can be used with
the inline `:` form only when its name is listed in `inlineShortcodes`. For
container shortcodes the plugin wraps the result in
`<div class="rb-shortcode rb-shortcode--<name>">` and replaces `childrenHtml`
with the rendered body, so container renderers must echo `input.childrenHtml`
where the body belongs. Renderers are synchronous and must escape any user
input themselves — `escapeHtml` and `escapeHtmlAttribute` are re-exported from
`@riebeckite/core`.

## Exports

- `shortcodes(options?)` / `shortcodesPlugin` — plugin factory
- `remarkShortcodes(options?)` — standalone remark transform
- `renderShortcode(request, options)` — render a single shortcode
- `resolveShortcodeOptions(options?)` — normalize options
- `builtinShortcodes`, `builtinShortcodeNames` — the built-in registry
- `builtinInlineShortcodes` — built-in names allowed in the inline `:` form
- Types: `ShortcodeRenderer`, `ShortcodeOptions`, `ResolvedShortcodeOptions`,
  `ShortcodeRenderInput`, `ShortcodeRenderRequest`, `ShortcodeAttributes`,
  `RemarkShortcodesOptions`

## See also

- [Plugin guide](../reference/plugin-api.md)
