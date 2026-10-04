# @riebeckite/plugin-share

Per-article share controls built at build time. For every published entry the
plugin builds share URLs for the configured services and injects the controls
into the rendered HTML. The links are ordinary anchors and work without
JavaScript; only the copy-link action is a progressive enhancement.

[日本語](./README_ja.md)

## Overview

`share()` resolves each note's `permalink` to an absolute URL, composes the
service URLs from the note title and URL, and inserts the controls near the
article. The controls are inserted into the manifest entry's HTML, which Core
synchronizes with the content the route renders, so they appear on generated
pages and in feeds.

Supported services:

| Service | Share URL |
| ------- | --------- |
| `x` | `https://twitter.com/intent/tweet?url=…&text=…` |
| `bluesky` | `https://bsky.app/intent/compose?text=…` |
| `mastodon` | `https://{instance}/share?text=…` |
| `facebook` | `https://www.facebook.com/sharer/sharer.php?u=…` |
| `linkedin` | `https://www.linkedin.com/sharing/share-offsite/?url=…` |
| `hatena` | `https://b.hatena.ne.jp/add?mode=confirm&url=…&title=…` |
| `copy` | Copies the note URL (button, no JavaScript required for the links) |

`mastodon` is opt-in: add `"mastodon"` to `services` and set
`mastodonInstance`.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { share } from "@riebeckite/plugin-share";

export default defineConfig({
  // ...
  plugins: [share()],
});
```

Enable Mastodon and change placement:

```ts
share({
  services: ["x", "bluesky", "mastodon", "copy"],
  mastodonInstance: "mastodon.social",
  placement: "top",
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `services` | `ShareService[]` | every service except `mastodon` | Services to render, in order |
| `placement` | `"top" \| "bottom"` | `"bottom"` | Where the controls appear |
| `mastodonInstance` | `string` | none | Mastodon host; required when `services` includes `"mastodon"` |
| `className` | `string` | none | Extra root class alongside the stable `rr-share` hook |
| `ariaLabel` | `string` | `"Share"` | Accessible name for the control group |
| `labels` | `Partial<Record<ShareService, string>>` | built-in labels | Per-service visible labels |
| `copiedLabel` | `string` | `"Copied"` | Status announced after a successful copy |
| `copyFailedLabel` | `string` | `"Copy failed"` | Status announced when a copy fails |

`share` throws a configuration error at `riebeckite check` time when
`services` includes `"mastodon"` but `mastodonInstance` is missing.

## Output

```html
<div class="rr-share" data-rr-share data-rr-share-placement="bottom"
     role="group" aria-label="Share">
  <ul class="rr-share__list">
    <li class="rr-share__item">
      <a class="rr-share__link rr-share__link--x"
         href="https://twitter.com/intent/tweet?url=…&amp;text=…"
         target="_blank" rel="noopener noreferrer" data-share-service="x">X</a>
    </li>
    <li class="rr-share__item">
      <button type="button" class="rr-share__button rr-share__copy"
              data-rr-share-copy data-share-url="https://example.com/posts/hello"
              data-rr-share-copied="Copied" hidden>Copy link</button>
    </li>
  </ul>
  <p class="rr-share__status" role="status" aria-live="polite"></p>
</div>
```

## Progressive enhancement

The share links are plain anchors, so they work with JavaScript disabled. The
copy-link button starts `hidden` and is revealed by `initShare()`, which the
app calls during page initialization; a no-JS reader never sees a control that
cannot work. Copying uses `navigator.clipboard.writeText` and falls back to a
hidden textarea with `document.execCommand("copy")`. The result is announced in
the `aria-live="polite"` status region.

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-share/style.css";
```

The stable classes are `rr-share` (root), `rr-share__list`, `rr-share__item`,
`rr-share__link`, `rr-share__link--{service}`, `rr-share__button`,
`rr-share__copy`, and `rr-share__status`. A theme can target these hooks; the
optional `className` is added to the root without replacing them.

## Exports

- `share(options?)` — plugin factory
- `sharePlugin` — alias of `share`
- `resolveShareOptions(options?)` — apply option defaults
- `validateShareOptions(options?)` — validate runtime options
- `buildAbsoluteUrl(config, permalink)` — resolve a note URL to absolute
- `normalizeMastodonInstance(value)` — normalize an instance to a bare host
- `buildShareUrl(service, target, instance?)` — build one service URL
- `buildShareLinks(options, target)` — build every link-bearing service
- `renderShareControls(options, target)` — render the controls HTML
- `initShare()` — client initializer (also via
  `@riebeckite/plugin-share/client`)
- Constants: `SHARE_SERVICES`, `SHARE_ATTRIBUTE`, `SHARE_ROOT_CLASS`,
  `DEFAULT_SHARE_SERVICES`, `DEFAULT_SHARE_LABELS`, `DEFAULT_SHARE_PLACEMENT`
- Types: `ShareOptions`, `ResolvedShareOptions`, `ShareService`,
  `SharePlacement`, `ShareLink`, `ShareTarget`

## Limitations

- Share URLs are fixed at build time. A full rebuild always recomputes them.
- Mastodon cannot be enabled without a concrete instance.
- The plugin contributes controls to `article.before-content` for `top` and
  `article.footer` for `bottom`; a Site places those semantic slots in its layout.

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)
