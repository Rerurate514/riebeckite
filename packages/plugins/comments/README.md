# @riebeckite/plugin-comments

<!-- Generated from docs/docs/plugins/comments.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Comment threads for published notes, backed by a pluggable provider. Pair with
[Reactions](../reactions/README.md) for a Zenn/Qiita-style split between lightweight
reactions and full comments.

[日本語](./README_ja.md)

## What it does

- Renders a comment list with author, timestamp, and body for each note.
- Ships a `MemoryCommentsProvider` for local previews and tests.
- Exposes a `CommentsProvider` interface so you can back comments with
  GitHub Discussions (via Giscus), a database, or an edge function.

## Quick start

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [comments()],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | `MemoryCommentsProvider` | Storage/runtime seam for comments. |
| `headingText` | `string` | `"Comments"` | Section heading text. |
| `className` | `string` | `"rr-comments"` | Extra CSS class on the root element. |
| `limit` | `number` | `20` | Maximum comments rendered per note. |
| `emptyText` | `string` | `"No comments yet."` | Text shown when there are no comments. |

## Providers

Implement `CommentsProvider` to connect a real backend:

```ts
interface CommentsProvider {
  readonly capabilities: ReadonlySet<"read" | "write">;
  getComments(contentId: string, limit?: number): Promise<CommentsPage>;
}
```

## Related

- [Reactions](../reactions/README.md) for lightweight emoji reactions
- [Webmention](../webmention/README.md) for cross-site mentions
- [Plugin catalog](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.md)
