---
title: Content ID
sidebar:
  hidden: true
---

# Content ID

A stable identifier written in frontmatter that names a note independently of its slug and permalink. It survives file moves and URL changes, so it is the right key for external references.

## id versus slug versus permalink

| Identifier | Set by | Changes when |
| --- | --- | --- |
| `id` | The author, in frontmatter | Never, unless edited |
| slug | The file path | The file moves |
| permalink | Location resolution | The URL rules or config change |

## When to use it

Use the id when something outside the content tree needs to point at a note and must keep working after the file is renamed or its URL changes.
