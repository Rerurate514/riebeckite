---
publish: true
---

# Example

A small page showing what Riebeckite Markdown can do. Copy any section into your own files.

## Links

WikiLinks connect pages: [[guide]] opens Getting started. Regular Markdown links work as well — [Home](/) returns to the home page.

## Code

A fenced code block keeps its formatting and gains a toolbar from the code plugins:

```ts
export function hello(): string {
  return "Hello from Riebeckite";
}
```


## Frontmatter

The block between the `---` lines at the top of a file controls the page. `publish: true` keeps it in the built site:

```yaml
---
publish: true
title: Example
---
```

