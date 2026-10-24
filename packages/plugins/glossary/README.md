# @riebeckite/plugin-glossary

<!-- Generated from docs/docs/plugins/glossary.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[日本語](./README_ja.md)

Builds a glossary page from published notes marked with `glossary: true`.
Use ordinary links or Obsidian WikiLinks to reference the individual term pages.

## Installation

```bash
pnpm add @riebeckite/plugin-glossary
```

## Usage

```ts
import { glossary } from "@riebeckite/plugin-glossary";

export default {
  plugins: [glossary()],
};
```

```md
---
title: Static site generation
glossary: true
term: SSG
definition: Generates HTML before deployment.
---
```

The plugin creates `/glossary`, alphabetically ordered by `term`. When `term`
is absent, the note title is used. `definition` is optional. Only discoverable
notes appear.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/glossary"` | Generated page path. An empty string disables it. |
| `key` | `string` | `"glossary"` | Boolean frontmatter key used to select notes. |
| `termKey` | `string` | `"term"` | Frontmatter key for the displayed term. |
| `definitionKey` | `string` | `"definition"` | Optional short definition key. |
| `title` | `string` | `"Glossary"` | Page heading and title. |
| `className` | `string` | `"rb-glossary"` | Root CSS class. |
