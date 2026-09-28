# Framework Reference

## Core の public surface

portable API は `@riebeckite/core` から import します。root export は互換性の boundary です。private module の deep import は実装調査など明確な理由がある場合だけにしてください。

主な export は `defineConfig`、`resolveConfig`、`isExcluded`、`isPublished`、ContentSource/`ContentManager`、public location contract（`ContentLocationInput`、`ContentPublicLocation`、`resolveDefaultContentLocation`）、manifest/graph、content query API（`queryContentEntries`、`groupContentEntries`）、`Pipeline`、plugin/dependency error、build-state/cache、diagnostics、observability、post/publish type、`defineTheme` を含む theme contract です。

## Public package と import path

外部の Plugin / Theme package は、公開された package entry point を通じてのみ
framework に依存します。npm から install できる想定の package は次の通りです。

| Package | 役割 | public entry point |
| --- | --- | --- |
| `@riebeckite/core` | portable contract、config、content、pipeline、plugin/theme runtime、diagnostics、observability | `.` |
| `@riebeckite/honox` | HonoX/Vite integration | `.`, `./server`, `./ui` |
| `@riebeckite/cli` | `riebeckite` build-time command | `riebeckite` executable |
| `@riebeckite/plugin-*` | 公式 Plugin | `.` と package が宣言する `./client`, `./components`, `./style.css` |
| `@riebeckite/theme-*` | 公式 Theme | `.` と `./style.css`（`./styles/theme.css`） |

public なのは package root と、各 package の `exports` が宣言する subpath だけ
です。`@riebeckite/core/src/types/plugin` のような deep import は internal
implementation であり、contract ではありません。root から export されていない
contract が必要な場合は `src` へ直接依存せず、Core に contract を追加してくださ
い。

`apps/web` と monorepo root は private で、public surface には含まれません。

### 外部 Plugin の依存関係

外部 Plugin は `@riebeckite/core` だけに依存します。

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

Theme も同様に `@riebeckite/core` の `defineTheme` を使い、stylesheet 用の
`style.css` export を持ちます。browser code や CSS を持つ場合、公式 package と
同じように自 package の `exports` で subpath を宣言し、`assets`、
`clientEntries`、`styles` の module specifier から参照します。

### 解決の仕組み

各 public package は `dist/` に build 済みの ESM JavaScript と TypeScript
declaration を同梱し、`exports` はその成果物を指します。同じ `exports` 内の
`source` condition は TypeScript source を指し、repository 内の tooling 専用で
す。HonoX integration は `source` を優先して workspace alias を作るため、
workspace 開発は build step なしで source を解決し続けます。Node や外部
bundler は `source` を要求しないため、npm consumer は `dist` を受け取ります。

monorepo 内では HonoX integration が `package.json` の `exports` を
`source` 優先で解決します。monorepo 外では同じ package が `node_modules` から
の通常の Node/package resolution で解決され、workspace alias は必須ではありま
せん。npm から install した package と workspace 内の package は同じ public
entry point を公開し、参照するファイルだけが異なります。

### 公開 package の build

`pnpm build:packages` が全 public package の `dist`（JavaScript と
declaration）を workspace の依存順に build します。各 package は `build` と
`prepack` script を持つため、`pnpm --filter <package> pack` は tarball 生成前
に対象 package を再 build します。CSS は source 位置（`./style.css`、
`./styles/theme.css`）のまま同梱し、既存の subpath export から参照します。

### npm publish に向けた状態

-   public package は plain な ESM のみを配布します。CommonJS build はなく、
    `require()` は entry point としてサポートしません（意図的な制約です）。
    `import` するか、ESM を扱える bundler から利用してください。
-   declaration は extension を解決できる `.js` relative specifier 付きで出力
    されるため、`moduleResolution: "bundler"` と
    `moduleResolution: "NodeNext"`/`"Node16"`（`nodenext` 対応）の両方で
    type-check できます。external fixture が全 public entry point を
    `skipLibCheck` なしで両設定の tarball に対して検証します。
-   repository root に canonical な Apache-2.0 `LICENSE` があります。build は
    tarball 生成前に各 package へそれをコピーし（`scripts/copy_license.mjs`）、
    公開 package は `"license": "Apache-2.0"` を宣言します。
-   公式 package の version は `0.0.1` のままです。例の `^1.0.0` は説明用で、
    versioning と release automation は今回の package boundary 作業には含まれ
    ません。

## 拡張点

| 拡張 | 目的 |
| --- | --- |
| ContentSource | scan/read/metadata semantics を保った source I/O の差し替え |
| Plugin | pipeline、hooks、public location 解決（`resolveContentLocations`）、diagnostics、assets、client entries、endpoints、SEO、graph、renderers の追加 |
| Theme | config、style、CSS token、`data-*` attributes の提供 |
| Integration | Core と framework/bundler の接続。現在は HonoX/Vite |

Renderer は扱わない input に `null` を返します。Endpoint は reusable HTTP behavior を公開できますが、Core を HonoX router にするものではありません。

build/runtime boundary を越える public data は serializable に保ちます。既存 abstraction を迂回する export を増やす前に ownership を決めてください。config validation や plugin dependency failure は明示的な error として扱い、null protocol を新設しません。
