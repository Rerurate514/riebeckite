# Media

## Audio and video — [`media`](../media.md)

Audio and video attachments render with the native browser players. The sample below is a short silent WAV.

### Source

````md
![[media-example.wav]]
````

### Rendered

![[media-example.wav]]

## Attachments — [`attachment`](../attachment.md)

A plain WikiLink becomes a download link, and an embedded WikiLink becomes an attachment card.

### Source

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

### Rendered

[[attachment-example.txt]]

![[attachment-example.txt]]

## PDF — [`pdf`](../pdf.md)

Embedded PDFs render in the browser's native PDF viewer.

### Source

````md
![[pdf-example.pdf]]
````

### Rendered

![[pdf-example.pdf]]

## Rich embeds — [`rich-embed`](../rich-embed.md)

Turn a URL into an embed for YouTube, Vimeo, Spotify, CodePen, Gist, and more.

### Source

````md
```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```
````

### Rendered

```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```

## Gallery cards — [`gallery`](../gallery.md)

### Source

````md
```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```
````

### Rendered

```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```

## Excalidraw — [`excalidraw`](../excalidraw.md)

Embedding an Excalidraw note replaces it with an SVG in the browser. This site embeds the drawing in `assets/HW.md`.

### Source

````md
![[HW]]
````

### Rendered

![[HW]]

## Responsive image — [`responsive-image`](../responsive-image.md)

Embedding an image with `![[...]]` expands to a `<picture>` element with multiple size candidates when the variants exist.

### Source

````md
![[riebeckite-logo-horizontal.png]]
````

### Rendered

![[riebeckite-logo-horizontal.png]]

## Lightbox — [`lightbox`](../lightbox.md)

Click the image to open it in an accessible dialog.

### Source

````md
![[riebeckite-logo.png]]
````

### Rendered

![[riebeckite-logo.png]]

## AutoCardLink — [`autocardlink`](../autocardlink.md)

A `cardlink` fence with a URL and metadata becomes a link card.

### Source

````md
```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: A tool that builds a static site from Markdown
host: example.com
```
````

### Rendered

```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: A tool that builds a static site from Markdown
host: example.com
```

## Image comparison — [`image-compare`](../image-compare.md)

A fenced `image-compare` block shows two images with a draggable divider. Without JavaScript, both images stay visible with Before and After labels.

### Source

````md
```image-compare
---
before: ../../../assets/themes/theme-default-light.png
after: ../../../assets/themes/theme-default-dark.png
beforeAlt: Default theme in light mode
afterAlt: Default theme in dark mode
label: Default theme, light to dark
---
```
````

### Rendered

```image-compare
---
before: ../../../assets/themes/theme-default-light.png
after: ../../../assets/themes/theme-default-dark.png
beforeAlt: Default theme in light mode
afterAlt: Default theme in dark mode
label: Default theme, light to dark
---
```
