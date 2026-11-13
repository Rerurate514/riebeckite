---
date: 2026-10-07
title: Reactions
---
# Reactions

Emoji reaction buttons for published notes, backed by a pluggable provider.
The Site renders the buttons with the exported `Reactions` component; the plugin
never injects manifest HTML. To let visitors react, configure an endpoint and a
server-side visitor identity resolver.

[日本語](./reactions.ja.md)

## What it does

- Renders a row of reaction buttons with counts wherever the Site places `Reactions` or `ArticleReactions`.
- Ships a `MemoryReactionsProvider` for local previews and tests.
- Exposes a `ReactionsProvider` interface so you can back reactions with
  GitHub Discussions, a database, or an edge function.

## Quick start

```sh
npm install @riebeckite/plugin-reactions
```

```ts
import { defineConfig } from "@riebeckite/core";
import { MemoryReactionsProvider, reactions } from "@riebeckite/plugin-reactions";

const reactionsProvider = new MemoryReactionsProvider();

export default defineConfig({
  plugins: [reactions({ provider: reactionsProvider })],
});
```

Keep the provider instance in Site composition: the rendered section and the
endpoints must read and write the same store.

## Rendering

The Site owns JSX placement. Place `ArticleReactions` wherever reactions should
appear on an article:

```tsx
import { ArticleReactions } from "@riebeckite/plugin-reactions";

<ArticleReactions />;
```

`ArticleReactions` resolves the plugin options from the Site config, reads the
current article's `contentId`, and renders nothing outside an article or when no
`provider` is configured. Buttons are disabled unless `endpoint` and
`resolveVisitorKey` are configured, so counts are display-only by default.

To render the markup yourself, call the provider and use the `Reactions`
component directly:

```tsx
const options = resolveReactionsOptions(siteConfigOptions);
const data = await options.provider.getReactions(contentId);

<Reactions reactions={options.reactions} data={data} interactive />;
```

The plugin does not inject build-time manifest HTML.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `ReactionsProvider` | `MemoryReactionsProvider` | Storage/runtime seam for reaction counts. Required for rendered sections. |
| `reactions` | `ReactionType[]` | all five | Reaction types to render, in order. |
| `className` | `string` | `"rr-reactions"` | Root CSS class of the rendered section. |
| `ariaLabel` | `string` | `"Reactions"` | Accessible name for the group. |
| `endpoint` | `string` | — | Absolute endpoint path for live reactions. Requires `resolveVisitorKey`. |
| `resolveVisitorKey` | `(request) => string \| undefined` | — | Resolves a trusted visitor identity on the server. |

## Live reactions

`endpoint` enables the browser controls. The plugin then registers one client
entry gated by the `[data-rr-reactions]` presence selector, so pages without
reactions load no client code. The resolver must return an identity from trusted
server-side authentication or a signed cookie; never accept a visitor ID
supplied by the browser.

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

- [Comments](./comments.md) for full comment threads
- [Plugin catalog](./README.md)
