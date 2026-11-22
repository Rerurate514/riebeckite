---
date: 2026-11-23
title: Interactive Roots
---

# Interactive Roots

Riebeckite site and plugin client code mounts interactive components in one of
two ways, both from `hono/jsx/dom/client`: `hydrateRoot` and `createRoot`. The
choice follows from one question: did the server render this component's own
output into the container, or does the client build the UI at runtime?

## hydrateRoot: re-render the server's markup

Use `hydrateRoot` when the server already rendered the component's own output
into the container, and the client re-renders the same markup from the same
data. The page looks the same before and after mount because the client render
matches what was already there.

The sharp edge of hono/jsx: hydration is equivalent to render. `hydrateRoot`
calls `container.replaceChildren(fragment)`, so the server-rendered children
inside the container are discarded and replaced by the client-side render. It
never attaches behavior to existing arbitrary markup and never preserves
mismatched server markup. The only contract that holds is "same markup from the
same data": the SSR HTML inside the container must be exactly what the client
component renders.

Garden Explorer satisfies that contract: the server renders the same
`GardenExplorer` component into the root, and the client hydrates it from the
serialized data (`packages/plugins/garden-explorer/client.tsx`):

```tsx
import { hydrateRoot } from "hono/jsx/dom/client";

const root = document.querySelector<HTMLElement>(
  "[data-riebeckite-garden-explorer]",
);
if (root) {
  hydrateRoot(root, <GardenExplorer data={data} />);
}
```

Local Graph uses the same pattern (`packages/plugins/local-graph/client.tsx`):
the server renders the view, and the client reads the serialized data next to
it and hydrates the same component into the container.

### Interactive Markdown components

The `markdownComponents` plugin API with `client: { moduleSpecifier }` uses this
path automatically. The server renders the component inside its wrapper
element, and the generated client module calls `hydrateRoot` on that wrapper
with the serialized props. You do not choose a mount for these components.
Write the component so its server and client renders match, because the client
render replaces the wrapper's children.

## createRoot: take over a host element

Use `createRoot` when the client builds the UI only at runtime, or swaps a
no-JS/fallback SSR payload for the interactive version: rendering results,
opening a UI that has no server-rendered counterpart, or replacing static
fallback content.

Flashcards is the clearest example. `packages/plugins/flashcards/src/render.ts`
renders a static fallback first. On mount,
`packages/plugins/flashcards/src/init.ts` inserts a container, and
`mountFlashcardsDeck` in `deck.tsx` renders the interactive deck into it, so the
fallback is replaced:

```tsx
export function mountFlashcardsDeck(
  container: HTMLElement,
  props: FlashcardsDeckProps,
): () => void {
  const root = createRoot(container);
  root.render(<FlashcardsDeck {...props} />);
  return () => root.unmount();
}
```

The same pattern appears in the search results
(`packages/plugins/search/src/search-results.tsx`), the diff viewer
(`packages/plugins/diff/client/diff-viewer.ts`), the text-fragment popover
(`packages/plugins/text-fragment/src/popover.tsx`), and the lightbox
(`packages/plugins/lightbox/src/dialog.tsx`). Each of these is UI that only
exists in response to user action, or is a client-side upgrade of static
content, and none of them has server-rendered interactive markup to match.

## Choosing a mount

Use `hydrateRoot` when the server already rendered the component's own output
into the container and the client re-renders the same markup from the same
data. Use `createRoot` when the client builds the UI only at runtime, or swaps
a no-JS/fallback SSR payload for the interactive version.

Do not treat `hydrateRoot` as a way to attach behavior to arbitrary
server-rendered markup. Because hono/jsx hydration replaces the container's
children, the SSR HTML must be produced from the same component and data as the
client render; anything else is discarded on mount. Conversely, using
`createRoot` on server-rendered interactive markup also discards that output
and renders from scratch.

## Choosing the mount scope

The mount choice and the lifecycle are separate decisions. A plugin client
entry declares a `scope`:

- `page` (the default) mounts on `main#main-content` and runs again after every
  SPA navigation. Page scope is unmounted before the page is replaced
  (`onBeforePageCommit`) and mounted again after it is committed
  (`onPageCommit`).
- `app` mounts once on `document` and is for shell regions that survive
  navigation, such as headers and toolbars.

Use `page` for anything that belongs to the page being replaced, and `app` for
shell UI that persists. The navigation lifecycle, its events, and the
re-initialization rules are described in [SPA Navigation](./spa-navigation.md).

## Related

- [SPA Navigation](./spa-navigation.md) — page transitions, lifecycle, and re-initialization
- [Client entries](../reference/plugin-api/ui-and-assets.md) — declaring client modules and their scope
- [Initializers](../framework/spa-runtime/initializers.md) — how the generated client code mounts each scope
- [Customizing your site](./customizing-your-site.md) — islands and site-owned interactive UI
