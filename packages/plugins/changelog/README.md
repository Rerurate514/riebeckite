# @riebeckite/plugin-changelog

Build-time change history derived from local Git history. For every published
note the plugin adds a "change history" section with commit dates, subjects,
and authors, and it can build a site-wide changelog dataset from the notes'
commits. No client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`changelog()` reads the local Git repository at build time using the same
`git` access as [`@riebeckite/plugin-diff`](../diff/README.md) (`execFile` with
graceful failure). It never invents its own filesystem layer.

Results are published through the manifest `bodySlots` mechanism. Each public
entry receives its own history in the `article.after-content` slot. The site's
layout decides whether and where to render that slot, so the plugin stays
inside the Plugin boundary and does not create application routes. When
`siteWide` is enabled, the site-wide changelog is written to the slot of the
note named by `siteWideSlug`; that note (the route) is owned by the app or the
author, not by this plugin. No client script is registered.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { changelog } from "@riebeckite/plugin-changelog";

export default defineConfig({
  // ...
  plugins: [
    changelog({
      // Point at the content root so Git sees the notes' repository paths.
      cwd: "./content",
      lookbackDays: 180,
      dateFormat: "iso",
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `cwd` | `string` | `config.content.directory`, else `process.cwd()` | Content root used to locate the Git work tree |
| `lookbackDays` | `number` | — (full history) | Only include commits newer than this many days |
| `dateFormat` | `"iso" \| "long" \| "short"` | `"iso"` | How dates are rendered |
| `locale` | `string` | `"en"` | Locale for `"long"` / `"short"` dates |
| `perNote` | `boolean` | `true` | Add a history section to every public note |
| `siteWide` | `boolean` | `false` | Build and inject the site-wide changelog |
| `siteWideSlug` | `string` | `"changelog"` | Note that receives the site-wide changelog |
| `maxPerNote` | `number` | `10` | Maximum commits listed per note |
| `maxSiteWide` | `number` | `50` | Maximum commits listed site-wide |
| `showAuthor` | `boolean` | `true` | Show the commit author |
| `heading` | `boolean` | `true` | Render the `<h2>` heading |
| `perNoteHeading` | `string` | `"Change history"` | Per-note heading text |
| `siteWideHeading` | `string` | `"Changelog"` | Site-wide heading text |
| `className` | `string` | `"rr-changelog"` | Root CSS class |

## Output

The plugin appends a fragment like this to the `article.after-content` slot:

```html
<section class="rr-changelog rr-changelog--note" data-changelog-note>
  <h2 class="rr-changelog__heading">Change history</h2>
  <ol class="rr-changelog__list">
    <li class="rr-changelog__item">
      <time class="rr-changelog__date" datetime="2026-09-30T09:00:00+09:00">2026-09-30</time>
      <span class="rr-changelog__subject">Fix the sidebar offset</span>
      <span class="rr-changelog__author">Author Name</span>
      <code class="rr-changelog__hash" title="…full hash…">abc1234</code>
    </li>
  </ol>
</section>
```

`data-changelog-note` and `data-changelog-site` mark the two fragments for
styling and idempotency checks.

## App wiring (site-wide changelog)

The site-wide list is data, not a page. The app owns the route; the plugin
either fills the `article.after-content` slot of an existing note
(`siteWide: true` + `siteWideSlug`, which requires a public note at that slug)
or exposes the dataset for the app to render itself:

```ts
import {
  buildSiteChangelog,
  GitChangelogReader,
  renderSiteChangelog,
  resolveChangelogOptions,
} from "@riebeckite/plugin-changelog";

const options = resolveChangelogOptions({ lookbackDays: 90 });
const manifest = await content.getManifest();
const reader = new GitChangelogReader({ cwd: "./content" });
const commits = await reader.getRecentCommits();
const dataset = buildSiteChangelog({
  entries: manifest.publicEntries,
  commits,
  contentIndex: manifest.contentIndex,
  options,
});
const html = renderSiteChangelog(dataset, options);
```

The reference app renders manifest `bodySlots` in
`apps/web/app/components/article/article.tsx`; a dedicated route can render the
exported HTML directly.

## Failure behavior

When `git` cannot be started, the plugin reports a `changelog-git-unavailable`
warning diagnostic. When the content directory is not inside a Git working
tree, it reports `changelog-content-outside-repository`. Either way a logger
warning accompanies it and the build output is left untouched. The build never
fails because history is unavailable, and the same guarantee holds for an empty
repository.

## Style

The package ships `style.css` with the stable `.rr-changelog` root hook. Themes
can restyle it without editing the plugin:

```ts
import "@riebeckite/plugin-changelog/style.css";
```

## Exports

- `changelog(options?)` — plugin factory
- `changelogPlugin` — alias of `changelog`
- `resolveChangelogOptions(options?)` — apply option defaults
- `GitChangelogReader` — Git-backed history reader (`getFileHistory`,
  `getRecentCommits`, `isAvailable`)
- `buildNoteChangeHistory(entry, commits, options)` — per-note dataset
- `buildSiteChangelog({ entries, commits, contentIndex, options })` — site-wide
  dataset
- `renderNoteChangeHistory(history, options)` /
  `renderSiteChangelog(changelog, options)` — HTML renderers
- `filterChangelogCommits(commits, options)` /
  `formatChangelogDate(date, options)` / `resolveLookbackSince(days, now?)` —
  pure helpers
- Types: `ChangelogOptions`, `ResolvedChangelogOptions`, `ChangelogCommit`,
  `ChangelogRecord`, `NoteChangeHistory`, `SiteChangelog`, `SiteChangelogEntry`,
  `SiteChangelogNote`, `ChangelogDateFormat`, `GitChangelogReaderOptions`

## See also

- [plugin-diff](../diff/README.md) — revision history and line diffs
- [Plugin guide](../../../docs/docs/reference/plugin-api.en.md)

