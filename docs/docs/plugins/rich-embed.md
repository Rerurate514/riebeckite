<!-- Generated from packages/plugins/rich-embed/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Rich Embed

Build-time media embeds for ` ```embed ` code blocks.

[日本語](./rich-embed.ja.md)

## Overview

`richEmbed()` turns an ` ```embed ` fenced code block into a responsive
`<figure class="rb-rich-embed">`. Provider detection is pure string inspection:
the plugin never performs a network request at build time, and it ships no
client-side JavaScript.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { richEmbed } from "@riebeckite/plugin-rich-embed";

export default defineConfig({
  // ...
  plugins: [
    richEmbed({
      allowHosts: ["player.example.com"],
    }),
  ],
});
```

## Syntax

The first non-empty line is the URL. Every following `key: value` line is an
option.

````md
```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption under the frame
aspect: 16/9
start: 30
```
````

| Block option | Description |
| ------------ | ----------- |
| `title` | `title` attribute of the `<iframe>` (also the link label for Gist) |
| `caption` | Rendered as `<figcaption class="rb-rich-embed__caption">` |
| `aspect` | Aspect ratio such as `16/9` or `4/3` (default `16/9`) |
| `start` | Start time in seconds (YouTube only) |

Unknown option keys are ignored. An invalid `aspect` falls back to `16/9`.

## Supported providers

| Provider | Recognised URLs | Output `src` |
| -------- | --------------- | ------------ |
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` | `https://www.youtube-nocookie.com/embed/<id>` |
| Vimeo | `vimeo.com/<numeric id>` | `https://player.vimeo.com/video/<id>` |
| Spotify | `open.spotify.com/(track\|album\|playlist\|episode\|show)/<id>` | `https://open.spotify.com/embed/<type>/<id>` |
| CodePen | `codepen.io/<user>/pen/<id>` | `https://codepen.io/<user>/embed/<id>` |
| GitHub Gist | `gist.github.com/...` | link card (gists cannot be iframed) |

When the host is not recognised, the block is left untouched and a warning
diagnostic is emitted. A generic `<iframe>` is only produced when the host is
listed in `allowHosts`.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowHosts` | `string[]` | `[]` | Hostnames allowed to use the generic iframe fallback |
| `providers` | `RichEmbedProvider[]` | all | Allowlist of providers to enable |
| `disable` | `RichEmbedProvider[]` | `[]` | Providers to disable (wins over `providers`) |

## Output HTML

```html
<figure
  class="rb-rich-embed"
  data-rich-embed="youtube"
  data-rich-embed-marker="RIEBECKITE_EXTERNAL_RICHEMBED_MARKER"
>
  <div class="rb-rich-embed__frame" style="--rb-rich-embed-aspect:16/9">
    <iframe
      src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
      loading="lazy"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      title="Demo video"
    ></iframe>
  </div>
  <figcaption class="rb-rich-embed__caption">A short caption</figcaption>
</figure>
```

Gist blocks produce `div.rb-rich-embed__card > a.rb-rich-embed__link` instead of
an iframe.

### CSS hooks

- `.rb-rich-embed` — outer figure
- `.rb-rich-embed__frame` — responsive wrapper (reads `--rb-rich-embed-aspect`)
- `.rb-rich-embed__caption` — optional caption
- `.rb-rich-embed__card`, `.rb-rich-embed__link` — Gist link card

The stylesheet is shipped as `@riebeckite/plugin-rich-embed/style.css`.

## Diagnostics

Unsupported or invalid blocks keep their original code block and report a
warning through the vfile message channel:

- `source: "@riebeckite/plugin-rich-embed"`
- `ruleId: "unsupported-embed"`

## Security

- Only `https:` URLs are accepted.
- Provider output is constructed from validated path segments; dynamic
  segments are passed through `encodeURIComponent`.
- A generic iframe requires an explicit `allowHosts` entry.
- No raw user HTML is ever emitted: titles, captions, and labels are written as
  escaped text nodes.

## Limitations

- No OEMBED fetching or title/thumbnail discovery — everything is derived from
  the URL and the block options.
- GitHub Gists cannot be embedded in an iframe, so they render as a link card.
- Generic embeds are emitted verbatim from the `https:` URL, so only allow hosts
  you trust.

## Exports

- `richEmbed(options?)` — plugin factory
- `richEmbedPlugin` — alias of `richEmbed`
- Types: `RichEmbedOptions`, `RichEmbedProvider`

## See also

- [Plugin guide](../reference/plugin-api.md)
