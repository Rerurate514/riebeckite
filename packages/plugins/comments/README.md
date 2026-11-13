# @riebeckite/plugin-comments

<!-- Generated from docs/docs/plugins/comments.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Comment threads for published notes, backed by a pluggable provider. The Site
renders the thread with the exported `CommentsSection` component; the plugin
never injects manifest HTML. Pair with [Reactions](../reactions/README.md) for a
Zenn/Qiita-style split between lightweight reactions and full comments.

[日本語](./README_ja.md)

## What it does

- Renders a flat comment list (newest first) with author, timestamp, and body wherever the Site places `CommentsSection` or `ArticleCommentsSection`. Replies/threading are not modeled yet; comments are shown as a single-level list.
- Ships a `MemoryCommentsProvider` for local previews and tests.
- Exposes a `CommentsProvider` interface so you can back comments with
  GitHub Discussions (via Giscus), a database, or an edge function.

## Quick start

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments, MemoryCommentsProvider } from "@riebeckite/plugin-comments";

const commentsProvider = new MemoryCommentsProvider();

export default defineConfig({
  plugins: [comments({ provider: commentsProvider })],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | `MemoryCommentsProvider` | Storage/runtime seam for comments. Required for rendered sections. |
| `headingText` | `string` | `"Comments"` | Section heading text. |
| `className` | `string` | `"rr-comments"` | Root CSS class of the rendered section. |
| `limit` | `number` | `20` | Maximum comments rendered per note. |
| `emptyText` | `string` | `"No comments yet."` | Text shown when there are no comments. |

## Rendering

The Site owns JSX placement. Place `ArticleCommentsSection` below the article:

```tsx
import { ArticleCommentsSection } from "@riebeckite/plugin-comments";

<ArticleCommentsSection />;
```

`ArticleCommentsSection` resolves the plugin options from the Site config, reads
the current article's `contentId`, and renders nothing outside an article or
when no `provider` is configured. Pass `headingText`, `className`, or
`emptyText` to override the configured values for one placement.

To render the markup yourself, fetch the page and pass it to `CommentsSection`:

```tsx
const page = await provider.getComments(contentId, limit);

<CommentsSection page={page} />;
```

The plugin does not inject build-time manifest HTML and registers no client
entry; comments are read-only.

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
