---
date: 2026-10-06
title: Writing content
---
# Writing content

This guide covers the basics of writing articles for a Riebeckite site. It is aimed at users who are new to Markdown or static publishing.

Even if you are new to Markdown, the flow is:

```text
Create the article file
      ↓
Write the title
      ↓
Write the body
      ↓
Preview in the browser
      ↓
Publish
```

## In this section

- [Basics](./writing-content/setup.md)
- [Markdown](./writing-content/markdown.md)
- [Workflow](./writing-content/workflow.md)

## What to learn first

You do not need to learn every feature to write articles with Riebeckite. Start with:

```md
---
title: Article title
publish: true
---

# Article title

Write the body.
```

Then add Markdown, WikiLinks, images, frontmatter, plugins, and localization as needed:

```text
Markdown
WikiLink
Images
Frontmatter
Plugins
Localization
```

## Summary

The basic flow of writing content with Riebeckite is simple:

```text
Create a .md file in content/
        ↓
Add a title
        ↓
Add publish: true
        ↓
Write the body in Markdown
        ↓
Check with dev
        ↓
check / doctor
        ↓
build
```

To separate published articles from drafts, the first thing to remember is

```yaml
publish: true
```

The final public URL of an article is determined by the **[[glossary/public-location|Public Location]]** that Riebeckite resolves. While writing ordinary articles you do not need to think too much about how URLs are produced.

## Next steps

- [Fast path to publishing a site](../getting-started/deployment.md)
- [Publishing Obsidian notes](./obsidian.md)
- [Localization](./localization.md)
- [Configuration](../reference/configuration.md)
