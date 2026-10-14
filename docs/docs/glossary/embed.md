---
title: Embed
sidebar:
  hidden: true
---

# Embed

Syntax that pulls the content of another note into the current page, for example a note embed or a block embed. Embeds are resolved like links and are tracked as content dependencies.

## Syntax

```md
![[note]]            # embed a whole note
![[note#Heading]]    # embed a section
![[note#^block-id]]  # embed a block
```

## Resolution and dependencies

An embed is resolved through the [content index](./content-index.md) like a [WikiLink](./wikilink.md), and it becomes a [content dependency](./content-dependency.md). Editing the source note invalidates the pages that embed it.

## Content dependency tracking

Embeds are tracked as content dependencies through the content index. When a note that is embedded in other pages is edited, the system invalidates those pages so they are regenerated on the next build. This is similar to how wikilinks create graph edges, but embeds have the additional behavior of marking the dependent pages as needing rebuild.

The `content-dependency.md` glossary term describes this in more detail.
