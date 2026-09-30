# Your First Theme

A theme changes how a site **looks** (colors, typography, layout). It cannot add features. For features, see [Your first plugin](./plugin-tutorial.md).

Go in this order: adjust a built-in theme first, then build your own.

## 1. Adjust a built-in theme (fastest)

If you want to tweak an existing look, pass options and CSS to `defaultTheme()`:

```ts
// riebeckite.config.ts
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  theme: defaultTheme({
    colorMode: "light",      // "light" | "dark" | "system"
    typography: "system",    // "system" | "serif" | "sans"
    userCss: ["/extensions/custom.css"], // loaded last, overrides everything
  }),
  // ...
});
```

## 2. Create a minimal theme

A custom theme is made with `defineTheme` (from `@riebeckite/core`). It does **not** need to be a published package — you can define it inside the site.

```ts
// extensions/local-theme.ts
import { defineTheme } from "@riebeckite/core";

export function localTheme() {
  return defineTheme({
    name: "local",
    styles: [{ moduleSpecifier: "/extensions/theme.css" }],
  });
}
```

Pass it to `theme` in `riebeckite.config.ts`.

```ts
// riebeckite.config.ts
import { localTheme } from "./extensions/local-theme";

export default defineConfig({
  theme: localTheme(),
  // ...
});
```

- `name` identifies the theme.
- `styles` declares the stylesheet. For an in-site theme, use a module specifier the host bundler resolves, such as `/extensions/theme.css`.

## 3. Write the CSS

Do not hardcode colors. Use **semantic tokens (`--rb-*`) and stable hooks (`rb-*` / `rr-<feature>`)** so themes stay swappable, and scope every rule to the theme root selector. Replace `<name>` with the theme's identity name — here the theme is named `local`.

```css
/* Example: adjust background, text color, and article width */
:is(:root, .rb-theme-root)[data-theme-name="local"] .rb-site {
  background: var(--rb-color-paper);
  color: var(--rb-color-ink);
}

:is(:root, .rb-theme-root)[data-theme-name="local"] .rb-article {
  max-width: var(--rb-layout-article-max);
}
```

The theme root selector `:is(:root, .rb-theme-root)[data-theme-name="<name>"]` matches the document root on a real site (the app sets `data-theme-name` on `<html>`) and any `class="rb-theme-root" data-theme-name="<name>"` container in a preview.

Support color modes with these three states:

```css
:is(:root, .rb-theme-root)[data-theme-name="local"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="local"][data-theme="dark"] { /* dark */ }
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-theme-name="local"]:not([data-theme]) { /* follows the OS (system) */ }
}
```

CSS ordering is fixed: theme CSS loads before `userCss` (which is highest priority). See [Theme System](./theme-system.md) for the token and hook lists and the cascade details.

## 4. Package it for distribution (optional)

Once it works in a site, you can distribute it. Use `packages/themes/minimal` as a template.

```text
packages/themes/minimal/
├─ src/index.ts      ← factory that calls defineTheme
├─ styles/theme.css  ← the theme stylesheet
├─ package.json      ← exports ./style.css
├─ README_ja.md
└─ README.md
```

- A distributed theme depends only on `@riebeckite/core` and exports its stylesheet as `./style.css`. Never reference monorepo paths.
- Resolve theme-specific options inside the theme; do not grow the Core `ThemeConfig`.

## 5. Verify

```sh
npm exec riebeckite check             # validate config and plugin resolution
npm exec riebeckite inspect config# inspect the resolved theme
npm exec riebeckite dev               # check the look locally
npm exec riebeckite build             # check the generated output
```

`check` / `doctor` / `inspect` are read-only. Fix what the diagnostics say.

## Further reading

- [Themes in depth](./theme-in-depth.md) — the in-depth companion (options, tokens, hooks, cascade, packaging)
- [Theme System](./theme-system.md) — theme contract, tokens, hooks, cascade
- [Plugin System](./plugin-system.md) — the boundary with themes (features = plugins)
- [Framework Reference](./framework-reference.md) — public APIs like `defineTheme`