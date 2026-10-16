---
title: Plugin UI component
sidebar:
  hidden: true
---

# Plugin UI component

Plugins expose server-rendered Hono JSX components (and data helpers) plus CSS and optional client runtime. The Site decides where to render them. The former body-slot system was removed in favor of this pattern: each plugin that needs to contribute UI exports a data helper (a narrow, server-safe query returning an immutable model) and a JSX component that accepts that model or narrow props. The Site composes these components in its own TSX, choosing whether, where, and how often to render each one.

Unlike the removed slot system, there is no accumulated `bodySlots` map on the manifest entry. Instead, each plugin’s data helper receives a `PublicContentView` (or similar filtered facade) and returns a typed model. The component is then rendered directly by the Site’s article layout or page template. This gives the Site full control over placement, ordering, and conditional rendering, while plugins retain ownership of their model, component internals, assets, and client-entry registration.

**Key differences from the removed body-slot system:**

- **No `bodySlots` field** on `ContentManifestEntry` — plugins do not contribute HTML fragments to a shared slot map.
- **Data helpers + components** — each plugin exports a helper (query) and a component; the Site composes them.
- **Site-owned rendering** — the Site decides placement, order, and whether to render at all.
- **Optional CSS and client runtime** — plugins may export `./style.css` and `./client` as usual, registered through the integration.
- **No `ContentSlot` primitive** — the `ContentSlot` component and `hasSlot` utility have been removed from `@riebeckite/honox/ui`.

**Typical plugin export shape:**

```ts
// index.ts
export function examplePlugin() {
  return definePlugin({
    name: "example",
    // ... factory hooks, assets, clientEntries, etc.
    // Export data helper and component for UI
    dataHelper: getProperties,
    component: <Properties />,
  });
}
```

Or more conventionally, a plugin may place its component and helper under `./components/`:

```text
packages/plugins/example/
├─ index.ts
├─ components/
│  └─ properties.tsx   // exports <Properties /> and getProperties
├─ style.css
└─ client.ts
```

The Site then imports and renders:

```tsx
import { getProperties } from "@riebeckite/plugin-properties";
import { Properties } from "@riebeckite/plugin-properties/components";

const data = getProperties({ view, frontmatter: entry.frontmatter });
<Properties data={data} />
```

The former `bodySlots`/`ContentSlot`/`hasSlot` API has been completely removed; all UI is now composed explicitly in Site TSX.