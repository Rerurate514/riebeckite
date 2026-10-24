# @riebeckite/plugin-share

<!-- Generated from docs/docs/plugins/share.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Per-article share controls built at build time. For every published entry the
plugin builds share URLs for the configured services and provides the control
data. The Site renders `<ShareControls />` itself, determining position in the
layout. The links are ordinary anchors and work without JavaScript; only the
copy-link action is a progressive enhancement.

[日本語](./README_ja.md)

## Overview

`share()` resolves each note's `permalink` to an absolute URL, composes the
service URLs from the note title and URL, and builds share link data. The data
is available via `getShareLinks({ entry, site, options? })` and rendered by the
Site using `<ShareControls links={...} />`. The controls are ordinary anchors
and work without JavaScript; only the copy-link action is a progressive
enhancement.

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

Mastodon is opt-in: add `"mastodon"` to `services` and set
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

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `services` | `ShareService[]` | every service except `mastodon` | Services to render, in order |
| `mastodonInstance` | `string` | none | Mastodon host; required when `services` includes `"mastodon"` |
| `className` | `string` | none | Extra root class alongside the stable `rr-share` hook |
| `ariaLabel` | `string` | `"Share"` | Accessible name for the control group |
| `labels` | `Partial<Record<ShareService, string>>` | built-in labels | Per-service visible labels |
| `copiedLabel` | `string` | `"Copied"` | Status announced after a successful copy |
| `copyFailedLabel` | `string` | `"Copy failed"` | Status announced when a copy fails |

`share` throws a configuration error at `riebeckite check` time when
`services` includes `"mastodon"` but `mastodonInstance` is missing.

## Display

Share controls are rendered at the position determined by the Site, where
`<ShareControls links={...} />` is placed in the layout. On this site they
appear as live controls on the page, including the progressively enhanced
copy-link action. The Site decides whether to render controls at the top or
bottom of the article, or at some other position.

Progressive enhancement:

The share links are plain anchors, so they work with JavaScript disabled. The
copy-link button starts `hidden` and is revealed by `initShare()`, which the
app calls during page initialization; a no-JS reader never sees a control that
cannot work. Copying uses `navigator.clipboard.writeText` and falls back to a
hidden textarea with `document.execCommand("copy")`. The result is announced
in the `aria-live="polite"` status region.

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-share/style.css";
```

The stable classes are `rr-share` (root), `rr-share__list`, `rr-share__item`,
`rr-share__link`, `rr-share__link--{service}`, `rr-share__button`,
`rr-share__copy`, and `rr-share__status`. A theme can target these hooks;
the optional `className` is added to the root without replacing them.

## Exports

- `share(options?)` — plugin factory
- `share` — alias of `share`
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
  `ShareLink`, `ShareTarget`

## Limitations

- Share URLs are fixed at build time. A full rebuild always recomputes them.
- Mastodon cannot be enabled without a concrete instance.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
