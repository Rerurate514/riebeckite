# @riebeckite/plugin-reactions

<!-- Generated from docs/docs/plugins/reactions.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Emoji reaction buttons for published notes, backed by a pluggable provider.
Counts are rendered at build time. To let visitors react, configure an endpoint
and a server-side visitor identity resolver.

[日本語](./README_ja.md)

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
| `endpoint` | `string` | — | Absolute endpoint path for live reactions. Requires `resolveVisitorKey`. |
| `resolveVisitorKey` | `(request) => string \| undefined` | — | Resolves a trusted visitor identity on the server. |

## Live reactions

`endpoint` enables the browser controls. Its resolver must return an identity
from trusted server-side authentication or a signed cookie; never accept a
visitor ID supplied by the browser.

## Providers

Implement `ReactionsProvider` to connect a real backend:

```ts
interface ReactionsProvider {
  readonly capabilities: ReadonlySet<"read" | "write">;
  getReactions(contentId: string, visitorKey?: string): Promise<PageReactions>;
  addReaction(contentId: string, type: ReactionType, visitorKey: string): Promise<PageReactions>;
  removeReaction(contentId: string, type: ReactionType, visitorKey: string): Promise<PageReactions>;
}
```

## Related

- [Comments](../comments/README.md) for full comment threads
- [Plugin catalog](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.md)
