---
title: Plugin UI component
sidebar:
  hidden: true
---

# Plugin UI component

Plugins expose server-rendered Hono JSX components and data helpers, plus CSS and optional client runtime. The Site decides where to render them. A data helper is a narrow, server-safe query returning an immutable model; a component accepts typed props and returns rendered JSX. The Site composes components in its own TSX, choosing whether, where, and how often to render each one.

Each data helper receives a `PublicContentView` (or similar filtered facade) and returns a typed model. The component is rendered directly by the Site's article layout or page template, giving the Site control over placement, ordering, and conditional rendering while plugins own their model, internals, assets, and client-entry registration.

**Typical plugin export shape:**

- **Data helpers + components** — each plugin exports a helper (query) and a component; the Site composes them.
- **Site-owned rendering** — the Site decides placement, order, and whether to render at all.
- **Optional CSS and client runtime** — plugins may export `./style.css` and `./client` as usual, registered through the integration.
- **Context-aware components** — components may resolve current site or article data themselves when the Site provides the surrounding context.

```ts
// index.ts
import { definePlugin } from "@riebeckite/core";
import { Properties, getProperties } from "./components/properties";

export function examplePlugin() {
  return definePlugin({ name: "example" });
}

export { Properties, getProperties };
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
