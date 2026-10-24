---
date: 2026-10-24
title: Article Metadata
---
# Article Metadata

Render a post's publication dates, reading time, and taxonomy tags from the
article context.

[日本語](./article-metadata.ja.md)

## Overview

`articleMetadataPlugin()` registers the component stylesheet. It does not add
routes or modify the Markdown body.

The Site renders the component wherever metadata belongs:

```tsx
import ArticleMetadata from "@riebeckite/plugin-article-metadata/components";

<ArticleMetadata locale="ja-JP" />;
```

The component reads the current post from the article context. It takes the
publication date from `published`, then `date`, then `created`, and also renders
`updated`, the calculated reading time, and `tags`. When the plugin has no
article context it renders nothing.

Tag links use the taxonomy plugin's resolved configuration, so a custom
`tagsBasePath` is respected. Tags render as plain text when tag pages are turned
off. Without a Site context, tags also stay plain text.

## Options

| Prop | Default | Description |
| --- | --- | --- |
| `locale` | `"en-US"` | Locale passed to `Intl.DateTimeFormat`. |
| `labels.published` | `"PUBLISHED"` | Publication date label. |
| `labels.updated` | `"UPDATED"` | Update date label. |
| `labels.read` | `"READ"` | Reading time label. |
| `labels.tags` | `"Tags"` | Accessible label for the tag list. |

## Styling

The component uses the `rr-article-metadata` root and `rr-article-metadata__*`
elements. Themes may restyle it through those hooks.
