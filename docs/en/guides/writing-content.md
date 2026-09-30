# Writing content

This guide covers the basics of writing articles for a Riebeckite site. It is aimed at users who are new to Markdown or static publishing.

## Where articles live

By default, articles live in the `content/` folder.

```text
my-site/
`- content/
   |- index.md
   `- first-post.md
```

`first-post.md` is shown at `/first-post`. `index.md` is a useful name for the top page.

## The smallest article

A published article starts with frontmatter.

```md
---
title: First post
publish: true
---

# First post

Write the article body here.
```

- `title`: the article title used by the site
- `publish: true`: marks the article as published

Files without `publish: true` can be kept as drafts.

## Common Markdown

```md
# Main heading

## Section heading

Body text. Use a blank line to start a new paragraph.

- List item
- Another item

[External link](https://example.com)

![Image description](/images/photo.jpg)
```

Heading levels are controlled by the number of `#` characters. Whether to repeat the article title as a top-level heading in the body depends on your site design.

## File names and URLs

File names become URL paths.

|File|URL|
|---|---|
|`content/index.md`|`/`|
|`content/about.md`|`/about`|
|`content/posts/first.md`|`/posts/first`|

For readable URLs, use lowercase letters, numbers, and hyphens in file names.

## Published articles and drafts

Published article:

```md
---
title: Published article
publish: true
---
```

Draft:

```md
---
title: Draft article
---
```

Drafts are not emitted as public pages.

## Internal links

Normal Markdown links work.

```md
[Profile](/about)
```

Obsidian-style WikiLinks can also be used when the configured plugins support them.

```md
[[about]]
[[about|Profile]]
```

## Images

A nearby image folder is easy to manage.

```text
content/
|- first-post.md
`- images/
   `- photo.jpg
```

Reference the image from the article.

```md
![Photo](/images/photo.jpg)
```

## Check before publishing

After adding articles, run these commands from the site folder.

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite dev
```

Use `dev` to preview the site in a browser. When it looks good, build it.

```sh
npm exec riebeckite build
```

## Next steps

- [Fast path to publishing a site](../getting-started/deployment.md)
- [Publishing Obsidian notes](./obsidian.md)
- [Configuration](../reference/configuration.md)
