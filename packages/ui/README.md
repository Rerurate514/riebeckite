# @riebeckite/ui

Shared Context contracts for declarative Riebeckite plugin UI.

[日本語](./README_ja.md)

`SiteProvider` carries the resolved config, manifest, public content view, and
request path. `ArticleProvider` carries the rendered post and optional public
entry. Plugin components consume these contexts to resolve their default data;
explicit component props still take precedence.

```tsx
import { SiteProvider } from "@riebeckite/ui";
```

See the [HonoX UI documentation](../../docs/docs/framework/honox-integration/ui.md)
for composition and public-boundary requirements.
