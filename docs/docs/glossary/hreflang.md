---
title: Hreflang
sidebar:
  hidden: true
---

# Hreflang

The link metadata that tells search engines which URLs are language alternates of a page. Riebeckite generates it from the translations that exist for a note.

## Output

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

## Generated from translations

The links are built from a note's [translations](./translation.md), so adding a language version adds its alternate link automatically.
