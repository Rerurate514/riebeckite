---
date: 2026-10-07
title: Reactions
---
# Reactions

Emoji reaction buttons for published notes, backed by a pluggable provider.
Visitors can react with 👍 ❤️ 🎉 💡 🤔; counts are rendered at build time or
read live from a provider.

[日本語](./reactions.ja.md)

## What it does

- Renders a row of reaction buttons with counts for each note.
- Ships a `MemoryReactionsProvider` for local previews and tests.
- Exposes a `ReactionsProvider` interface so you can back reactions with
  GitHub Discussions, a database, or an edge function.

## Quick start

```sh
npm install @riebeckite/plugin-reactions
```

```ts
import { defineConfig } from "@riebeckite/core";
import { reactions } from "@riebeckite/plugin-reactions";

export default defineConfig({
  plugins: [reactions()],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `ReactionsProvider` | `MemoryReactionsProvider` | Storage/runtime seam for reaction counts. |
| `reactions` | `ReactionType[]` | all five | Reaction types to render, in order. |
| `className` | `string` | `"rr-reactions"` | Extra CSS class on the root element. |
| `ariaLabel` | `string` | `"Reactions"` | Accessible name for the group. |

## Providers

Implement `ReactionsProvider` to connect a real backend:

```ts
interface ReactionsProvider {
  readonly capabilities: ReadonlySet<"read" | "write">;
  getReactions(contentId: string): Promise<PageReactions>;
  addReaction(contentId: string, type: ReactionType): Promise<PageReactions>;
  removeReaction(contentId: string, type: ReactionType): Promise<PageReactions>;
}
```

## Related

- [Comments](./comments.md) for full comment threads
- [Plugin catalog](./README.md)
