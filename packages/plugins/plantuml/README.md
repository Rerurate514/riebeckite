# @riebeckite/plugin-plantuml

<!-- Generated from docs/docs/plugins/plantuml.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

PlantUML diagram rendering for ` ```plantuml ` code blocks. Diagrams are turned into
a PlantUML server image URL at build time; the build itself never talks to the
network and no client JavaScript is shipped.

[日本語](./README_ja.md)

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { plantuml } from "@riebeckite/plugin-plantuml";

export default defineConfig({
  // ...
  plugins: [plantuml()],
});
```

`plantuml` is also exported under the alias `plantumlPlugin`.

## Live example

Each ` ```plantuml ` code block is rendered as a diagram on this page.

#### Source

````md
```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```
````

#### Rendered

```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```

The caption comes from the code block `title` or from a `%% caption: ...` line
in the source. Because `%%` is not PlantUML comment syntax, the `%% caption:`
line is removed from the diagram source before it is encoded. When there is no
caption, the image alternative text is `PlantUML diagram`. With `fallback`
enabled the original PlantUML source is kept in a collapsible details element.

## URL encoding

The image URL is built at build time with PlantUML's *text encoding*:

1. Encode the source as UTF-8 bytes.
2. Compress them with raw DEFLATE (RFC 1951 — no zlib header or Adler-32).
3. Re-encode the bytes with PlantUML's custom base64 variant (alphabet
   `0-9A-Za-z-_`, packing 3 bytes into four 6-bit characters).

The algorithm lives in `src/plantuml-encoder.ts`. It loads `node:zlib` through a
dynamic `import` so a client bundle never pulls in a Node builtin. Encoding is
fully build-time; no request is made to the PlantUML server.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `server` | `string` | `"https://www.plantuml.com/plantuml"` | Base URL of the PlantUML server. `http(s)` only |
| `format` | `"svg" \| "png"` | `"svg"` | Requested image format |
| `caption` | `boolean` | `true` | Show `title` / `%% caption:` as `figcaption` |
| `fallback` | `boolean` | `true` | Keep the diagram source in `<details>` |

## Output HTML / CSS

The plugin ships `style.css` and emits stable class names: `rb-plantuml`,
`rb-plantuml__frame`, `rb-plantuml__image`, `rb-plantuml__caption`, and
`rb-plantuml__fallback`. Styling follows the `--rb-color-*` custom properties
when present and switches to dark colors under `html[data-theme="dark"]`, or
under the `prefers-color-scheme: dark` system query while `data-theme` is
absent.

## Diagnostics

Encoding failures are reported with `file.message(...)`. Diagnostics use
`source: "@riebeckite/plugin-plantuml"` and `ruleId` either `encoder-error`
(encoding failed) or `empty-source` (no diagram source).

## Limitations

- The configured PlantUML server must be reachable when a reader views the
  page. Offline readers see no diagram.
- To self-host, point `server` at your own PlantUML base URL.
- Because the build never contacts the server, diagram syntax is not validated
  at build time.

## Exports

- `plantuml(options?)` — plugin factory
- `plantumlPlugin` — alias of `plantuml`
- Types: `PlantumlOptions`, `PlantumlFormat`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
