# @riebeckite/plugin-code-enhance

Enhanced code blocks: Shiki highlighting plus a header with copy, wrap, and
collapse controls.

[日本語](./README_ja.md)

## Overview

`codeEnhance()` wraps [rehype-pretty-code](https://github.com/rehype-pretty-code/rehype-pretty-code)
(Shiki) and post-processes each figure into `.rr-code` with a header and
action buttons. The client entry wires up the buttons.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";

export default defineConfig({
  // ...
  plugins: [
    codeEnhance({
      theme: { light: "github-light", dark: "github-dark" },
      lineNumbers: true,
      copyButton: true,
      filename: true,
      lineHighlight: true,
      diffHighlight: true,
      wrapToggle: true,
    }),
  ],
});
```

## Features

- Syntax highlighting via Shiki (rehype-pretty-code)
- Header with the file name (code block title, falling back to the language)
  and action buttons
- Copy button with "Copied" feedback (client)
- Wrap toggle (client)
- Collapse / expand button (opt-in, client)
- Line numbers (`data-line-number` gutter)
- Line and character highlighting from pretty-code meta (`{1,3}`, `[/re/]`)
- Diff coloring for lines starting with `+` / `-`
- Terminal styling for `bash`, `console`, `sh`, `shell`, `terminal`, `zsh`
  (inverted palette) with a `$` prompt prefix on non-empty lines
- Focusable `<pre>` (`tabindex="0"`) for keyboard scrolling

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "github-light", dark: "github-dark" }` | Shiki theme |
| `lineNumbers` | `boolean` | `false` | Show line numbers |
| `copyButton` | `boolean` | `true` | Show the copy button |
| `filename` | `boolean` | `true` | Show the file name in the header |
| `lineHighlight` | `boolean` | `true` | Apply meta-based line/char highlights |
| `diffHighlight` | `boolean` | `true` | Color `+` / `-` lines |
| `collapsible` | `boolean` | `false` | Add the collapse button |
| `terminal` | `boolean` | `true` | Terminal styling for shell languages |
| `commandPrompt` | `boolean` | `true` | `$` prompt prefix on terminal lines |
| `wrapToggle` | `boolean` | `true` | Show the wrap toggle button |
| `defaultCollapsed` | `boolean` | `false` | Start collapsed (requires `collapsible`) |

## Client

`initCodeEnhance(options?)` installs a document-level click handler for copy,
wrap, and collapse buttons.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `copyLabel` | `string` | `"Copy"` | Copy button label |
| `copiedLabel` | `string` | `"Copied"` | Label after copying |

## Exports

- `codeEnhance(options?)` — plugin factory
- `rehypeCodeEnhance(options?)` — rehype transform
- `initCodeEnhance(options?)` — client initializer
- Types: `CodeEnhanceOptions`, `CodeEnhanceClientOptions`, `CodeEnhanceTheme`

## See also

- [Plugin guide](../../docs/plugins_en.md)
