---
date: 2026-10-14
title: Hreflang
sidebar.hidden: true
---

# Hreflang

The link metadata that tells search engines which URLs are language alternates of a page. Riebeckite generates it from the translations that exist for a note.

## Output

```html
<link rel='alternate' hreflang='en' href='/docs/hello/'>
<link rel='alternate' hreflang='ja' href='/ja/docs/hello/'>
<link rel='alternate' hreflang='x-default' href='/docs/hello/'>
```

The head tags use each translation's resolved permalink as the href, relative to the site root.

## Generated from translations

The links are built from a note's [translations](./translation.md), so adding a language version adds its alternate link automatically. Translation groups with more than one language also emit one `hreflang="x-default"` link pointing at the default-language page.

## Hreflang generation
Riebeckite generates `hreflang` link metadata through the l10n plugin's `addLocalizationHeadTags` function (`packages/plugins/l10n/src/head_tags.ts`, called during manifest creation in `l10n.ts`). For each note with translation relationships, the plugin emits one `<link rel="alternate" hreflang="…">` per existing translation language. These head tags are added to the note's `entry.headTags` during manifest creation and are rendered by the site shell in the page `<head>`.

The hreflang format follows BCP 47, using language tags such as `en`, `ja`, `en-US`, `zh-CN`, plus the reserved `x-default` value for the default-language page.
This works in combination with the [SEO plugin](./feed.md) to provide language alternates for search engine optimization.

## Related terms
