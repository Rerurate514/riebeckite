# @riebeckite/plugin-lightbox

Click-to-zoom lightbox for images.

[日本語](./README_ja.md)

## Overview

Two parts:

- **Build (rehype):** wraps each rendered `<img>` in a trigger anchor
- **Client:** opens an accessible dialog on click

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  // ...
  plugins: [lightboxPlugin()],
});
```

The plugin registers `style.css` and a client entry (`initLightbox`), which
the app calls on page initialization.

## Behavior

### Build (`rehypeLightbox`)

- Wraps every `<img src>` in
  `<a class="rr-lightbox-trigger">` with `data-lightbox-src`,
  `data-lightbox-alt`, and an `aria-label`
- Adds `rr-lightbox-image` to the image
- Skips images that have `data-lightbox-ignore="true"`, and images already
  inside an `<a>`, `<button>`, existing trigger, or the dialog

### Client (`initLightbox`)

- Optionally wraps remaining `img[src]` that were not converted at build time
  (`autoWrapImages`, default on; images inside links/buttons are skipped)
- Creates a `role="dialog"` overlay with the image, `alt` caption, and close
  button
- Closes on `Escape`, backdrop click, or the close button
- Restores focus to the previously focused element
- Sets `html[data-lightbox-open="true"]` while open (locks scrolling via CSS)
- Returns a cleanup function that removes listeners, the dialog, and any
  wrapped images

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `selectorClass` | `string` | `"rr-lightbox-trigger"` | Trigger class (build and client) |
| `autoWrapImages` | `boolean` | `true` | Client-only: wrap unhandled images on init |

`LightboxOptions` = `{ selectorClass? }` (build),
`LightboxInitOptions` = `LightboxOptions & { autoWrapImages? }` (client).

## Exports

- `lightboxPlugin(options?)` — plugin factory
- `rehypeLightbox(options?)` — rehype transform
- `initLightbox(root?, options?)` — client initializer, returns a cleanup
  function
- Types: `LightboxOptions`, `LightboxInitOptions`

## See also

- [Plugin guide](../../docs/plugins_en.md)
