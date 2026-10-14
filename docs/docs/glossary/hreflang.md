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

## Hreflang generation
Riebeckite generates `hreflang` link metadata through the l10n plugin's `addLocalizationHeadTags` function (`packages/plugins/l10n/src/l10n.ts`). For each note with translation relationships, the plugin emits one `<link rel="alternate" hreflang="…">` per existing translation language. These head tags are added to the note's `entry.headTags` during manifest creation and are rendered by the site shell in the page `<head>`.

The hreflang format follows BCP 47, using language tags such as `en`, `ja`, `en-US`, `zh-CN`. The href value is the resolved permalink for each language version, built using `buildPostUrl` from the resolved config.

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

This works in combination with the [SEO plugin](./feed.md) to provide language alternates for search engine optimization.

## Related terms
