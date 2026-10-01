# @riebeckite/plugin-discord-embed

Completes each page's `<head>` for Discord link previews.

Discord's `Discordbot` reads the shared page's `<head>` metadata to build its
preview card. The `seo` plugin already emits the shared `og:*` and `twitter:*`
tags, so this plugin adds only the Discord-specific pieces that are missing:

- `<meta name="theme-color">`, which Discord uses for the embed's left border
  color;
- `og:image:alt` (and optionally `og:image:width` / `og:image:height`).

[日本語](./README_ja.md)

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { discordEmbed } from "@riebeckite/plugin-discord-embed";

export default defineConfig({
  // ...
  plugins: [discordEmbed()],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `themeColor` | `string` | `"#5865F2"` | Embed accent color. Discord blurple |
| `imageAlt` | `boolean` | `true` | Emit `og:image:alt` when the entry has an image |
| `imageDimensions` | `boolean` | `true` | Emit `og:image:width` / `og:image:height` when the entry's image dimensions are known |

`themeColor` accepts `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`.

## Frontmatter

| Field | Use |
| ----- | --- |
| `theme_color` / `themeColor` / `discord_color` | Override the embed color for one entry |
| `ogImage` / `image` | Mark that the entry has an image, enabling the image tags |
| `ogImageWidth` / `imageWidth` | Image width |
| `ogImageHeight` / `imageHeight` | Image height |

The color resolves from the frontmatter override first, then the `themeColor`
option. An invalid frontmatter color records a
`discord-embed-invalid-color` diagnostic (warning) and falls back to the option
default.

## Emitted tags

The `onManifestCreated` hook assigns `entry.headTags` for every entry:

```html
<meta name="theme-color" content="#1ABC9C" />
<meta property="og:image:alt" content="Article title" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

## The site shell renders `headTags`

This plugin does not own the `<head>`. It provides
`ContentManifestEntry.headTags`; whether to render them is the site's decision.
A site route sets `c.set("headTags", entry.headTags ?? [])`, and
`app/routes/_renderer.tsx` maps them to `<meta>` / `<link>` / `<script>`.
See [HonoX Integration](../../../docs/en/docs/framework/honox-integration.md), section
"Site application contract", for details.

## Exports

- `discordEmbed(options?)` / `discordEmbedPlugin(options?)` — plugin factory
- `buildDiscordHeadTags(entry, options, diagnostics)` — build one entry's head
  tags
- `resolveDiscordEmbedOptions(options?)` — resolve defaults
- Types: `DiscordEmbedOptions`, `ResolvedDiscordEmbedOptions`

## See also

- [HonoX Integration](../../../docs/en/docs/framework/honox-integration.md)
- [Plugin system](../../../docs/en/docs/reference/plugin-api.md)

