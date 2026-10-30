# @riebeckite/ui

Shared context and optional headless UI primitives for Riebeckite.

[日本語](./README_ja.md)

Riebeckite is not a UI framework. Most sites need only standard HTML, CSS, and JSX; import this package only when a feature needs shared context or accessible interaction behavior.

## Shared context

`SiteProvider` carries the resolved config, manifest, public content view, and request path. `ArticleProvider` carries the rendered post and optional public entry. Plugin components consume these contexts to resolve their default data; explicit component props still take precedence.

```tsx
import { SiteProvider } from "@riebeckite/ui";
```

See the [HonoX UI documentation](../../docs/docs/framework/honox-integration/ui.md) for composition and public-boundary requirements.

## Optional primitives

Each primitive is a subpath so sites load only what they use.

| Import | Purpose |
| --- | --- |
| `@riebeckite/ui/drawer` | `Drawer` and `DrawerTrigger` markup |
| `@riebeckite/ui/drawer/client` | Focus, Escape, outside-click, scroll-lock, and SPA cleanup behavior |
| `@riebeckite/ui/dialog` | Controller around a native `<dialog>` |
| `@riebeckite/ui/tabs` | WAI-ARIA tab selection and keyboard behavior |
| `@riebeckite/ui/copy` | Clipboard text copy with a fallback |
| `@riebeckite/ui/behaviors` | Focus, dismiss, and scroll-lock utilities |
| `@riebeckite/ui/styles/drawer.css` | Drawer structure and state styles |

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import "@riebeckite/ui/styles/drawer.css";

<DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

```ts
import "@riebeckite/ui/drawer/client";
```

The Drawer keeps Escape and outside-click dismissal, focus trap and restore, initial focus, reference-counted scroll lock, trigger ARIA state, SPA cleanup, and duplicate-init protection. Without JavaScript, the trigger remains a fragment link and CSS `:target` reveals the panel. That fallback cannot provide dialog semantics, focus containment or restoration, Escape and outside-click dismissal, scroll lock, or a reliable close affordance.

`createDialogController()` also accepts a `signal`. Aborting it destroys the controller, closes the dialog, releases the scroll lock, and restores focus, so page lifecycle teardown does not need a separate `destroy()` call.

See the [UI guide](../../docs/docs/framework/ui.md) for the other primitives.
