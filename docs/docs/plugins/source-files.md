---
title: Source Files
---
# Source Files

Publish selected text source files as first-class, syntax-highlighted pages.

[日本語](./source-files.ja.md)

## Usage

`sourceFiles()` requires explicit include patterns. A file is published only when a routable note links or embeds it, so draft and scheduled notes cannot expose a source page.

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { sourceFiles } from "@riebeckite/plugin-source-files";

export default defineConfig({
  plugins: [
    obsidianMarkdown(),
    codeEnhance({ lineNumbers: true }),
    sourceFiles({
      include: ["src/**/*.ts", "scripts/*.ts"],
      exclude: ["src/generated/**"],
    }),
  ],
});
```

## Links and embeds

- `[[src/main.ts]]` links to `/source/src/main.ts/`.
- `![[src/main.ts]]` renders the source in the existing code-block path.
- `#L10` and `#L10-L20` select lines in an embed. With Code Enhance enabled, those source-page fragments scroll to and highlight the matching line or range.

Each source page includes its vault-relative path, detected language, size, a Copy action, and a Raw link to the normal attachment URL.

## Live examples

The following source is rendered on this page as a source-page link, a full-file embed, and a line-range embed.

#### Source

````md
[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
````

#### Rendered

[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]

## Safety and publication

Only files matching `include` and not matching `exclude` are eligible. The plugin rejects unsafe logical paths, binary content, invalid UTF-8, files over `maxBytes`, and common secret file names and extensions (`.env`, keys, certificates, and credentials). It uses the configured `ContentSource`; it never reads a filesystem path directly or exposes an absolute path.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `include` | `readonly string[]` | required | Vault-relative `*` / `**` patterns allowed for publication |
| `exclude` | `readonly string[]` | `[]` | Matching paths are never published |
| `maxBytes` | `number` | `1048576` | Maximum accepted UTF-8 file size |

## Exports

- `sourceFiles(options)` / `sourceFilesPlugin`
- `sourceFilePath(path)`
- `SourceFilesOptions`

## See also

- [`@riebeckite/plugin-obsidian-markdown`](./obsidian-markdown.md)
- [`@riebeckite/plugin-code-enhance`](./code-enhance.md)
