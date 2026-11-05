# Inline

## Highlight — [`highlight`](../highlight.md)

Text wrapped in `==...==` is emphasized inline.

### Source

````md
This sentence contains an ==emphasized== span; the rest stays unchanged.
````

### Rendered

This sentence contains an ==emphasized== span; the rest stays unchanged.

## Sidenotes — [`sidenotes`](../sidenotes.md)

Footnote syntax becomes a side note next to the body.

### Source

````md
We reference a side note here.[^1]

[^1]: This is the side note body.
````

### Rendered

We reference a side note here.[^1]

[^1]: This is the side note body.

## Shortcodes — [`shortcodes`](../shortcodes.md)

`::name` and `:::name` directives insert badges, keyboard keys, notes, and more.

### Source

````md
::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[Note]
You can write body text as-is.
:::
````

### Rendered

::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[Note]
You can write body text as-is.
:::
