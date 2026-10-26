# @riebeckite/plugin-timeline

<!-- Generated from docs/docs/plugins/timeline.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

Builds one chronological page from published notes marked with `timeline: true`.
It is for a curated history, unlike Archive, which lists every dated note.

## Installation

```bash
pnpm add @riebeckite/plugin-timeline
```

## Usage

```ts
import { timeline } from "@riebeckite/plugin-timeline";

export default {
  plugins: [timeline()],
};
```

Mark notes to include them:

```md
---
title: First release
date: 2026-01-15
timeline: true
---
```

The page is available at `/timeline`. Entries use the first valid value among
`date`, `published`, and `created`, and are ordered from oldest to newest.
Only discoverable notes appear.

## Live example

[Open the Timeline](/timeline)

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/timeline"` | Generated page path. An empty string disables it. |
| `key` | `string` | `"timeline"` | Boolean frontmatter key used to select notes. |
| `title` | `string` | `"Timeline"` | Page heading and title. |
| `className` | `string` | `"rb-timeline"` | Root CSS class. |
