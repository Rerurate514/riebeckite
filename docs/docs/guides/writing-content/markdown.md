---
date: 2026-10-06
title: Markdown
sidebar.label: Markdown
sidebar.order: 20
---
# Markdown

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

### Headings

```md
# Main heading

## Section heading

### Subsection heading
```

The number of `#` characters sets the heading level.

### Paragraphs

Ordinary sentences become a paragraph.

```md
This is the first paragraph.

A blank line starts the next paragraph.
```

### Lists

```md
- Flutter
- TypeScript
- HonoX
```

Numbered lists also work.

```md
1. Write the article
2. Check it in the browser
3. Publish
```

### Emphasis

```md
**bold**

*italic*
```

### Code

Inline code is wrapped in backticks.

```md
Add `publish: true`.
```

Multi-line code goes in a code block.

````md
```ts
const message = "Hello";
console.log(message);
```
````

## File names and URLs

In the standard setup, the [[logical-path|logical path]] of the content determines where it is published.

File names become URL paths.

|File|URL|
|---|---|
|`content/index.md`|`/`|
|`content/about.md`|`/about`|
|`content/posts/first.md`|`/posts/first`|

For readable URLs, use lowercase letters, numbers, and hyphens in file names.

Names such as the following are easy to manage:

```text
about.md
getting-started.md
first-post.md
```

However, Riebeckite resolves the public location as:

```text
File path
      ↓
Content
      ↓
Public Location
      ↓
Public URL
```

So **the physical file path is not always the URL as-is.** A plugin or configuration can change the public location. See [Content System](../../framework/content-system.md) for the details.

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

```text
[[about]]
      ↓
Resolve the matching content
      ↓
Public URL
```

Riebeckite resolves the final in-site link from the resolved content information, so links keep working even when a plugin or localization setting changes the public URL.

## Images

A nearby image folder is easy to manage.

```text
content/
├─ first-post.md
└─ images/
   └─ photo.jpg
```

Reference the image from the article.

```md
![Photo](/images/photo.jpg)
```

Put a description inside `[]` so the meaning is clear even when the image cannot be displayed.

```md
![Riebeckite logo](/images/riebeckite-logo.png)
```

### About image files

Writing an image link in Markdown does not by itself make the image file exist:

```text
Markdown
   ↓
Image URL
   ↓
Image exists in the published site
   ↓
Displayed in the browser
```

Make sure the image is included in the public output according to your site setup. If you use attachments from an Obsidian vault, see [Publishing Obsidian notes](../obsidian.md).
