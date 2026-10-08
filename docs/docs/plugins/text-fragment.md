# Text Fragment

Copy a Text Fragment deep link (`#:~:text=`) or a Markdown quote for the text
you select in an article.

[日本語](./text-fragment.ja.md)

## Overview

Client-only plugin. On page load it installs one selection popover with two
actions:

- **Copy link** — builds a URL with a
  [Text Fragment directive](https://wicg.github.io/scroll-to-text-fragment/)
  that highlights the selected text.
- **Copy quote** — builds a Markdown block quote with a link back to the page.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { textFragmentPlugin } from "@riebeckite/plugin-text-fragment";

export default defineConfig({
  // ...
  plugins: [textFragmentPlugin()],
});
```

`textFragmentPlugin()` registers `style.css` and the `initTextFragmentShare`
client entry, which the app calls during page initialization. Pass
`textFragmentPlugin({ labels })` to override individual UI labels.

## Behavior

- A non-empty selection inside the article body shows the popover near the
  selection. Selections inside `pre`, `code`, `a[href]`, or `[data-no-share]`
  are ignored.
- Both actions write to the clipboard through `navigator.clipboard.writeText`
  and fall back to a hidden textarea with `document.execCommand("copy")`.
- Failures are announced in a visible `aria-live="polite"` status region.
- `Escape` or a click outside closes the popover. The buttons are real
  `<button>` elements, so they are reachable with the keyboard.
- The popover is installed once per page and does nothing when there is no
  `document` (SSR-safe).

### URL rules

The fragment follows `#:~:text=[prefix-,]start[,end][,-suffix]`:

- `,`, `-` and `&` are percent-encoded (`%2C`, `%2D`, `%26`).
- Other characters are encoded per UTF-8 (newlines become `%0A`).
- An existing hash on the page URL is dropped before the directive is appended.
- Selections longer than ~200 characters or containing a newline are reduced to
  a `start,end` range built from the first and last token.
- An empty or whitespace-only selection produces `""`.

## API

- `textFragmentPlugin(options?)` — plugin factory; `options.labels` overrides
  the UI labels
- `initTextFragmentShare(labels?)` — client initializer (also via
  `@riebeckite/plugin-text-fragment/client`)
- `encodeTextFragment(text)` — percent-encodes one text fragment term
- `buildTextFragmentUrl(pageUrl, selection, options?)` — builds the deep link;
  `options` is `{ prefix?, suffix? }`
- `buildQuoteMarkdown({ url, title, selection })` — builds the Markdown quote
- `DEFAULT_TEXT_FRAGMENT_LABELS` — the default English UI labels
- Types: `TextFragmentOptions`, `TextFragmentLabels`,
  `TextFragmentPluginOptions`

## See also

- [Plugin guide](../reference/plugin-api.md)
