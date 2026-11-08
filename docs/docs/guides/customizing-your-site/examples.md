---
date: 2026-11-08
title: Examples
sidebar:
  label: Examples
  order: 40
---
# Examples

Before/after snippets for common customizations, starting from the generated starter site. For the full file map, see [Layout](./layout.md).

## Add a header link (config only)

Before — the default navigation derives links from the vault:

```ts
plugins: [navigation()],
```

After — pass explicit items in `riebeckite.config.ts`:

```ts
plugins: [
  navigation({
    items: [{ label: "About", href: "/about" }],
  }),
],
```

See [Pages and navigation](./pages-and-navigation.md).

## Place plugin UI beside an article

Before — the article page uses only the generated `app/components/article.tsx`.

After — render plugin components in your own aside component, then use it from `article.tsx`:

```tsx
// app/components/article-aside.tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside({ items, backlinks }: Props) {
  return (
    <aside>
      <TableOfContents items={items} />
      <Backlinks backlinks={backlinks} />
    </aside>
  );
}
```

See [Plugins and CSS](./plugins-and-css.md).

## Add a custom page

After — create `app/routes/about.tsx`. HonoX file-based routing serves it at `/about`:

```tsx
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <p>This page is mine.</p>
    </main>
  );
}
```
