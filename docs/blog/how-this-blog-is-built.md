---
title: How This Blog Is Built with Plain Riebeckite
description: No custom CMS, no framework changes — the Riebeckite blog is frontmatter, a two-route index, and the plugins the site already ships.
date: 2026-11-20
category: Engineering
author: Rerurate_514
tags:
  - engineering
  - honox
  - markdown
---

The announcement post says the blog exists. This one documents how, because the answer is short: with the pieces Riebeckite already had. If you expect a bespoke blog plugin or a CMS, there is none.

## Posts are Markdown files with frontmatter

Every post lives under `docs/blog/` in the site's content directory, next to the documentation it links to. A post is a single Markdown file whose filename defines its URL:

```text
docs/blog/introducing-riebeckite-blog.md    → /blog/introducing-riebeckite-blog/
docs/blog/introducing-riebeckite-blog.ja.md → /ja/blog/introducing-riebeckite-blog/
```

The `.ja.md` suffix is the site's existing localization convention; nothing blog-specific happens here. Frontmatter carries the metadata the list page and the article page read:

```yaml
---
title: Introducing the Riebeckite Blog
description: Why the Riebeckite website now has a blog.
date: 2026-11-20
category: Updates
author: Rerurate_514
tags:
  - announcements
---
```

`title`, `description`, `date`, and `tags` are standard Riebeckite fields. `category` and `author` are plain frontmatter values the blog's own components read — the framework treats them like any other metadata. Drafts need no special mechanism either: `draft: true` keeps a post out of the site, the search index, the sitemap, and the feeds, because that is what the publish pipeline already does for every page.

## The index page is one route, not a generator

Article pages, dates, tags, feeds, and the sitemap come from the framework without any per-post work. The only blog-specific rendering is the index at `/blog/`: a small route that asks the site for its public content, filters entries by permalink prefix, sorts them by date, and renders the list. The Japanese index at `/ja/blog/` is the same component with another locale.

That is the whole architecture. It is worth writing down because it is also the maintenance story: as long as posts are Markdown files under `docs/blog/`, publishing requires no code at all.
