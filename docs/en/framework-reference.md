# Framework Reference

## Core public surface

Import portable framework APIs from `@riebeckite/core`. The package exports configuration helpers (`defineConfig`, `resolveConfig`, `isExcluded`, `isPublished`), content contracts and `ContentManager`, the public-location contracts (`ContentLocationInput`, `ContentPublicLocation`, `resolveDefaultContentLocation`), manifest and graph APIs, `Pipeline`, plugin contracts and dependency errors, build-state/cache utilities, diagnostics, observability types, publishing/post types, and theme contracts including `defineTheme`.

The package root export is the compatibility boundary. Prefer it over deep imports unless an implementation-specific task explicitly requires a private module.

## Public packages and import paths

External Plugin and Theme packages depend on the framework only through published
package entry points. These packages are intended to be installable from npm:

| Package | Role | Public entry points |
| --- | --- | --- |
| `@riebeckite/core` | Portable contracts, configuration, content, pipeline, plugin/theme runtime, diagnostics, and observability | `.` |
| `@riebeckite/honox` | HonoX/Vite integration | `.`, `./server`, `./ui` |
| `@riebeckite/cli` | `riebeckite` build-time command | executable `riebeckite` |
| `@riebeckite/plugin-*` | Official plugins | `.` plus the package's declared `./client`, `./components`, and `./style.css` |
| `@riebeckite/theme-*` | Official themes | `.` and `./style.css` (`./styles/theme.css`) |

Only the package root and the subpaths declared in each package's `exports` map
are public. Deep imports such as `@riebeckite/core/src/types/plugin` are internal
implementation and are not part of the contract. If a Plugin or Theme needs a
contract that the root does not export, add the contract to Core instead of
reaching into `src`.

`apps/web` and the monorepo root are private and are never part of the public
surface.

### External Plugin dependency shape

An external Plugin depends only on `@riebeckite/core`:

```json
{
  "name": "example-riebeckite-plugin",
  "dependencies": {
    "@riebeckite/core": "^1.0.0"
  }
}
```

```ts
import { definePlugin } from "@riebeckite/core";

export default definePlugin({ name: "example" });
```

A Theme has the same shape: it uses `defineTheme` from `@riebeckite/core` and
exposes its stylesheet through a `style.css` export. When a Plugin or Theme ships
browser code or CSS, it declares those subpaths in its own `exports` map and
references them through `assets`, `clientEntries`, or `styles` module specifiers,
exactly like the official packages.

### How resolution works

Each public package ships built ESM JavaScript and TypeScript declarations under
`dist/`, and its `exports` map points at that output. The `source` condition in
the same `exports` map points back at the TypeScript source and is used only by
in-repo tooling: the HonoX integration builds workspace aliases from it, so
workspace development keeps resolving sources without a build step. Node and
external bundlers never request `source`, so npm consumers get `dist`.

Inside this monorepo, the HonoX integration resolves workspace packages through
their `package.json` `exports`, preferring the `source` condition. Outside the
monorepo, the same packages resolve through normal Node/package resolution from
`node_modules`; the workspace alias is not required. Packages installed from npm
and packages in the workspace therefore expose the same public entry points,
just from different files.

### Building the published packages

`pnpm build:packages` builds every public package (`dist` JavaScript and
declarations) in workspace dependency order. Each package also declares `build`
and `prepack` scripts, so `pnpm --filter <package> pack` rebuilds the artifact
before creating the tarball. CSS is shipped from its source location
(`./style.css`, `./styles/theme.css`) and referenced through the existing subpath
exports.

### Remaining constraints before npm publication

- Runtime JavaScript is plain ESM and runs on Node or any bundler without a
  TypeScript loader. Declarations are emitted per source module and keep
  extensionless relative imports, so TypeScript consumers must use
  `moduleResolution: "bundler"` (or `node10`); `node16`/`nodenext` is not
  supported yet.
- Only ESM is published. There is no CommonJS build and `require()` is not
  supported.
- The repository has no `LICENSE` file, so packages declare no `license` field.
  This must be resolved before publishing.
- Official package versions are still `0.0.1`; ranges such as `^1.0.0` in the
  examples are illustrative. Versioning and release automation are not part of
  the current package boundary work.

## Extension surfaces

- **Content source:** replace source I/O while preserving scan/read/metadata semantics.
- **Plugin:** contribute pipeline transforms, lifecycle/content hooks, public-location resolution (`resolveContentLocations`), diagnostics, assets, client entries, endpoints, SEO, graph extensions, or renderers.
- **Theme:** provide theme config, styles, CSS tokens, and `data-*` attributes.
- **Integration:** bind Core to a framework/bundler; the current supported adapter is HonoX/Vite.

Each extension has a narrow contract. For example, a renderer returns `null` for input it does not handle, while an endpoint exposes reusable HTTP behavior without making Core own HonoX routing.

## Contract discipline

Keep public data serializable where it crosses a build/runtime boundary. Use explicit errors such as configuration validation and plugin dependency failures instead of inventing null protocols. Do not add an export merely to bypass an existing abstraction; first decide which package owns the behavior.

Read [Content system](content-system.md), [Plugin system](plugin-system.md), [Theme system](theme-system.md), and [HonoX integration](honox-integration.md) for detailed contracts.
