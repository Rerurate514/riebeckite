# @riebeckite/plugin-toc

Table of contents rendering with scroll-spy: extracts headings from article
HTML and highlights the section currently in view.

[日本語](./README_ja.md)

## Overview

`toc()` provides a `TableOfContents` component that renders the article's
`h2`–`h4` headings (that carry an `id`) as a nested list. `initTableOfContents`
is the client entry: it tracks scrolling and marks links as read plus sets
`aria-current` on the active heading's link.

The component renders nothing when fewer than 2 items are extracted.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { tocPlugin } from "@riebeckite/plugin-toc";

export default defineConfig({
  // ...
  plugins: [tocPlugin()],
});
```

`tocPlugin()` registers the plugin, bundles `style.css`, and declares
`initTableOfContents` as a client entry.

### Render the component

```tsx
import TableOfContents, {
  extractTableOfContents,
} from "@riebeckite/plugin-toc";

const items = extractTableOfContents(post.html ?? "");

// ...in your route
return (
  <Article
    asideContent={
      <TableOfContents className="table-of-contents--desktop" items={items} />
    }
  />
);
```

The client entry finds elements by the `data-toc-target` attribute emitted on
each link, so it works when multiple ToCs (desktop/mobile) are rendered.

## API

- `extractTableOfContents(html)` — extracts `h2`–`h4` headings with an `id`
  as `TableOfContentsItem[]`, decoded and stripped of inline HTML

## Exports

- `tocPlugin()` — plugin factory
- `TableOfContents` — list component (default export of
  `components/table-of-contents.tsx`)
- `extractTableOfContents(html)` — heading extractor
- `initTableOfContents` — browser scroll-spy init (also via
  `@riebeckite/plugin-toc/client`)
- Type: `TableOfContentsItem` (`{ id, level, title }`)

## See also

- [Plugin guide](../../docs/plugins_en.md)