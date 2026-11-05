# Obsidian Markdown

## Callouts — [`obsidian-markdown`](../obsidian-markdown.md)

### Source

````md
> [!tip] Try it
> A callout is a block quote with a `[!type]` marker.

> [!info] Info
> Informational callouts use the same block quote syntax.

> [!warning] Warning
> Warnings are available without extra configuration.

> [!question] Question
> Use a question callout for an open point.
````

### Rendered

> [!tip] Try it
> A callout is a block quote with a `[!type]` marker.

> [!info] Info
> Informational callouts use the same block quote syntax.

> [!warning] Warning
> Warnings are available without extra configuration.

> [!question] Question
> Use a question callout for an open point.

## WikiLinks and embeds — [`obsidian-markdown`](../obsidian-markdown.md)

### Source

````md
A WikiLink to [[README]] and to [[plugins/README|Plugin catalog]].

A note embed:

![[head-tag]]

An image embed:

![[riebeckite-logo-horizontal.png]]
````

### Rendered

A WikiLink to [[README]] and to [[plugins/README|Plugin catalog]].

A note embed:

![[head-tag]]

An image embed:

![[riebeckite-logo-horizontal.png]]

Block references such as `![[head-tag#^block]]` work when the target note has a block id.

## Hard breaks — [`hard-breaks`](../hard-breaks.md)

`hardBreaks()` turns every soft line break into `<br>`. It is opt-in, and this site does not enable it, so the lines below stay in one paragraph.

### Source

````md
First line
Second line
Third line
````

### Rendered

First line
Second line
Third line

Enable `hardBreaks()` to keep each line on its own row.
